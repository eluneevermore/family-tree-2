import { FamilyRecord, FamilyTreeDocument, Gender, ParseDiagnostic, PersonRecord } from '../types';

const COMMENT_PREFIX = '#';
const PERSON_SEPARATOR = ':';
const RELATIONSHIP_ARROW = '->';
const SPOUSE_SEPARATOR = '+';
const FIELD_SEPARATOR = ',';
const ATTRIBUTE_SEPARATOR = '=';
const SINGLE_PARENT_PREFIX = 'single';
const FAMILY_PREFIX = 'couple';
const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]*$/;
const UNKNOWN_REFERENCE_CODE = 'unknown-reference';
const DUPLICATE_FAMILY_CODE = 'duplicate-family';
const DUPLICATE_PERSON_CODE = 'duplicate-person';

interface MutableParseState {
  readonly people: Map<string, PersonRecord>;
  readonly families: Map<string, FamilyRecord>;
  readonly diagnostics: ParseDiagnostic[];
}

interface ParsedRelationship {
  readonly parents: readonly [string] | readonly [string, string];
  readonly children: readonly string[];
}

export function parseFamilyTreeText(text: string): FamilyTreeDocument {
  const state: MutableParseState = {
    people: new Map<string, PersonRecord>(),
    families: new Map<string, FamilyRecord>(),
    diagnostics: []
  };

  text.split(/\r?\n/).forEach((rawLine, index) => {
    parseLine(rawLine, index + 1, state);
  });

  validateReferences(state);
  validateChildClaims(state);
  validateCycles(state);

  return {
    people: state.people,
    families: state.families,
    diagnostics: state.diagnostics
  };
}

export function serializeFamilyTreeDocument(document: FamilyTreeDocument): string {
  const people = Array.from(document.people.values()).map(formatPersonLine);
  const families = Array.from(document.families.values()).map(formatFamilyLine);
  return [...people, '', ...families].join('\n').trimEnd() + '\n';
}

export function createFamilyId(parents: readonly [string] | readonly [string, string]): string {
  if (parents.length === 1) {
    return `${SINGLE_PARENT_PREFIX}:${parents[0]}`;
  }

  return `${FAMILY_PREFIX}:${[...parents].sort((first, second) => first.localeCompare(second)).join('+')}`;
}

export function parseBirthSortValue(person: PersonRecord | undefined): number | null {
  if (!person?.born) {
    return null;
  }

  const firstYearMatch = person.born.match(/\d{3,4}/);
  return firstYearMatch ? Number(firstYearMatch[0]) : null;
}

function parseLine(rawLine: string, line: number, state: MutableParseState): void {
  const cleanLine = rawLine.trim();
  if (!cleanLine || cleanLine.startsWith(COMMENT_PREFIX)) {
    return;
  }

  if (isPersonLine(cleanLine)) {
    parsePersonLine(cleanLine, line, state);
    return;
  }

  if (isRelationshipLine(cleanLine)) {
    parseRelationshipLine(cleanLine, line, state);
    return;
  }

  addDiagnostic(state, 'error', line, 'invalid-line', `Line ${line} is not a person or relationship.`);
}

function isPersonLine(line: string): boolean {
  const personSeparatorIndex = line.indexOf(PERSON_SEPARATOR);
  if (personSeparatorIndex === -1) {
    return false;
  }

  const arrowIndex = line.indexOf(RELATIONSHIP_ARROW);
  return arrowIndex === -1 || personSeparatorIndex < arrowIndex;
}

function isRelationshipLine(line: string): boolean {
  return line.includes(RELATIONSHIP_ARROW) || line.includes(SPOUSE_SEPARATOR);
}

function parsePersonLine(line: string, lineNumber: number, state: MutableParseState): void {
  const separatorIndex = line.indexOf(PERSON_SEPARATOR);
  const id = line.slice(0, separatorIndex).trim();
  const payload = line.slice(separatorIndex + 1).trim();

  if (!isValidId(id)) {
    addDiagnostic(state, 'error', lineNumber, 'invalid-person-id', `Invalid person id "${id}".`);
    return;
  }

  if (state.people.has(id)) {
    addDiagnostic(state, 'error', lineNumber, DUPLICATE_PERSON_CODE, `Duplicate person id "${id}".`);
    return;
  }

  const [rawName, ...attributes] = splitFields(payload);
  const name = rawName?.trim();
  if (!name) {
    addDiagnostic(state, 'error', lineNumber, 'missing-person-name', `Person "${id}" needs a name.`);
    return;
  }

  state.people.set(id, {
    id,
    name,
    ...parsePersonAttributes(attributes, lineNumber, state)
  });
}

function parsePersonAttributes(
  attributes: readonly string[],
  line: number,
  state: MutableParseState
): Omit<PersonRecord, 'id' | 'name'> {
  return attributes.reduce<Omit<PersonRecord, 'id' | 'name'>>(
    (record, rawAttribute) => parsePersonAttribute(record, rawAttribute, line, state),
    { gender: 'unknown' }
  );
}

function parsePersonAttribute(
  record: Omit<PersonRecord, 'id' | 'name'>,
  rawAttribute: string,
  line: number,
  state: MutableParseState
): Omit<PersonRecord, 'id' | 'name'> {
  const attribute = rawAttribute.trim();
  if (!attribute) {
    return record;
  }

  const separatorIndex = attribute.indexOf(ATTRIBUTE_SEPARATOR);
  if (separatorIndex === -1) {
    addDiagnostic(state, 'warning', line, 'invalid-attribute', `Ignored attribute "${attribute}".`);
    return record;
  }

  const key = attribute.slice(0, separatorIndex).trim().toLowerCase();
  const value = attribute.slice(separatorIndex + 1).trim();
  return applyPersonAttribute(record, key, value, line, state);
}

function applyPersonAttribute(
  record: Omit<PersonRecord, 'id' | 'name'>,
  key: string,
  value: string,
  line: number,
  state: MutableParseState
): Omit<PersonRecord, 'id' | 'name'> {
  if (key === 'g' || key === 'gender') {
    return { ...record, gender: parseGender(value) };
  }

  if (key === 'b' || key === 'born') {
    return { ...record, born: value };
  }

  if (key === 'd' || key === 'died') {
    return { ...record, died: value };
  }

  if (key === 'n' || key === 'note') {
    return { ...record, note: value };
  }

  addDiagnostic(state, 'warning', line, 'unknown-attribute', `Unknown attribute "${key}" was ignored.`);
  return record;
}

function parseGender(value: string): Gender {
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === 'm' || normalizedValue === 'male') {
    return 'male';
  }

  if (normalizedValue === 'f' || normalizedValue === 'female') {
    return 'female';
  }

  if (normalizedValue === 'o' || normalizedValue === 'other') {
    return 'other';
  }

  return 'unknown';
}

function parseRelationshipLine(line: string, lineNumber: number, state: MutableParseState): void {
  const relationship = readRelationship(line, lineNumber, state);
  if (!relationship) {
    return;
  }

  const id = createFamilyId(relationship.parents);
  const previousFamily = state.families.get(id);
  if (!previousFamily) {
    state.families.set(id, { id, ...relationship, line: lineNumber });
    return;
  }

  addDiagnostic(state, 'warning', lineNumber, DUPLICATE_FAMILY_CODE, `Duplicate relationship for "${formatParents(relationship.parents)}" was merged.`);
  state.families.set(id, {
    ...previousFamily,
    children: mergeChildren(previousFamily.children, relationship.children)
  });
}

function readRelationship(line: string, lineNumber: number, state: MutableParseState): ParsedRelationship | null {
  const [left, right] = splitOnce(line, RELATIONSHIP_ARROW);
  const parents = splitFields(left, SPOUSE_SEPARATOR);
  if (parents.length < 1 || parents.length > 2 || parents.some((parent) => !isValidId(parent))) {
    addDiagnostic(state, 'error', lineNumber, 'invalid-relationship', `Invalid relationship "${line}".`);
    return null;
  }

  const children = right === null ? [] : splitFields(right).filter(Boolean);
  const invalidChild = children.find((child) => !isValidId(child));
  if (invalidChild) {
    addDiagnostic(state, 'error', lineNumber, 'invalid-child-id', `Invalid child id "${invalidChild}".`);
    return null;
  }

  return {
    parents: parents.length === 1 ? [parents[0]] : [parents[0], parents[1]],
    children
  };
}

function validateReferences(state: MutableParseState): void {
  state.families.forEach((family) => {
    family.parents.forEach((parentId) => validatePersonReference(parentId, family.line ?? 0, state));
    family.children.forEach((childId) => validatePersonReference(childId, family.line ?? 0, state));
  });
}

function validatePersonReference(id: string, line: number, state: MutableParseState): void {
  if (state.people.has(id)) {
    return;
  }

  addDiagnostic(state, 'error', line, UNKNOWN_REFERENCE_CODE, `Unknown person id "${id}".`);
}

function validateChildClaims(state: MutableParseState): void {
  const claims = new Map<string, string[]>();
  state.families.forEach((family) => {
    family.children.forEach((childId) => {
      claims.set(childId, [...(claims.get(childId) ?? []), family.id]);
    });
  });

  claims.forEach((familyIds, childId) => {
    if (familyIds.length > 1) {
      addDiagnostic(state, 'warning', 0, 'multiple-parent-families', `"${childId}" appears as a child in multiple families.`);
    }
  });
}

function validateCycles(state: MutableParseState): void {
  const edges = buildParentChildEdges(state);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  Array.from(state.people.keys()).forEach((personId) => {
    visitForCycle(personId, edges, visiting, visited, state);
  });
}

function buildParentChildEdges(state: MutableParseState): ReadonlyMap<string, readonly string[]> {
  const edges = new Map<string, string[]>();
  state.families.forEach((family) => {
    family.parents.forEach((parentId) => {
      edges.set(parentId, [...(edges.get(parentId) ?? []), ...family.children]);
    });
  });
  return edges;
}

function visitForCycle(
  personId: string,
  edges: ReadonlyMap<string, readonly string[]>,
  visiting: Set<string>,
  visited: Set<string>,
  state: MutableParseState
): void {
  if (visited.has(personId)) {
    return;
  }

  if (visiting.has(personId)) {
    addDiagnostic(state, 'error', 0, 'cycle', `Cycle detected at "${personId}".`);
    return;
  }

  visiting.add(personId);
  (edges.get(personId) ?? []).forEach((childId) => visitForCycle(childId, edges, visiting, visited, state));
  visiting.delete(personId);
  visited.add(personId);
}

function splitFields(value: string, separator = FIELD_SEPARATOR): string[] {
  return value.split(separator).map((part) => part.trim()).filter(Boolean);
}

function splitOnce(value: string, separator: string): readonly [string, string | null] {
  const separatorIndex = value.indexOf(separator);
  if (separatorIndex === -1) {
    return [value.trim(), null];
  }

  return [value.slice(0, separatorIndex).trim(), value.slice(separatorIndex + separator.length).trim()];
}

function isValidId(value: string): boolean {
  return ID_PATTERN.test(value.trim());
}

function mergeChildren(firstChildren: readonly string[], secondChildren: readonly string[]): readonly string[] {
  return [...firstChildren, ...secondChildren.filter((childId) => !firstChildren.includes(childId))];
}

function formatPersonLine(person: PersonRecord): string {
  const attributes = [
    person.gender !== 'unknown' ? `g=${formatGender(person.gender)}` : null,
    person.born ? `b=${person.born}` : null,
    person.died ? `d=${person.died}` : null,
    person.note ? `n=${person.note}` : null
  ].filter((attribute): attribute is string => Boolean(attribute));

  return `${person.id}:${person.name}${attributes.length > 0 ? `${FIELD_SEPARATOR}${attributes.join(FIELD_SEPARATOR)}` : ''}`;
}

function formatGender(gender: Gender): string {
  if (gender === 'male') {
    return 'm';
  }

  if (gender === 'female') {
    return 'f';
  }

  if (gender === 'other') {
    return 'o';
  }

  return 'u';
}

function formatFamilyLine(family: FamilyRecord): string {
  const parents = formatParents(family.parents);
  return family.children.length > 0 ? `${parents}${RELATIONSHIP_ARROW}${family.children.join(FIELD_SEPARATOR)}` : parents;
}

function formatParents(parents: readonly [string] | readonly [string, string]): string {
  return parents.join(SPOUSE_SEPARATOR);
}

function addDiagnostic(
  state: MutableParseState,
  severity: ParseDiagnostic['severity'],
  line: number,
  code: string,
  message: string
): void {
  state.diagnostics.push({ severity, line, code, message });
}
