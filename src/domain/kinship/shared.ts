import { FamilyRecord, FamilyTreeDocument, PersonRecord } from '../../types';
import { parseBirthSortValue } from '../../services/parser';

export type RelativeAge = 'older' | 'younger' | 'unknown';

export type RelationshipKind =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'aunt-uncle'
  | 'niece-nephew'
  | 'cousin'
  | 'relative';

export const RELATIONSHIP_LABEL_SEPARATOR = ', ';

export interface ParentLink {
  readonly parent: PersonRecord;
  readonly family: FamilyRecord;
}

export interface ParentSiblingContext {
  readonly sourceParent: PersonRecord;
  readonly parentSibling: PersonRecord;
}

export interface SpouseLink {
  readonly spouse: PersonRecord;
  readonly family: FamilyRecord;
}

export function getRelationshipKinds(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly RelationshipKind[] {
  const relationships: RelationshipKind[] = [];

  if (isParentOf(document, target.id, source.id)) {
    relationships.push('parent');
  }

  if (isParentOf(document, source.id, target.id)) {
    relationships.push('child');
  }

  if (isSpouse(document, source.id, target.id)) {
    relationships.push('spouse');
  }

  if (areSiblings(document, source.id, target.id)) {
    relationships.push('sibling');
  }

  const sourceParents = getParentLinks(document, source.id);
  const targetParents = getParentLinks(document, target.id);
  if (sourceParents.some((sourceParent) => isParentOf(document, target.id, sourceParent.parent.id))) {
    relationships.push('grandparent');
  }

  if (targetParents.some((targetParent) => isParentOf(document, source.id, targetParent.parent.id))) {
    relationships.push('grandchild');
  }

  if (sourceParents.some((sourceParent) => areSiblings(document, sourceParent.parent.id, target.id))) {
    relationships.push('aunt-uncle');
  }

  if (targetParents.some((targetParent) => areSiblings(document, source.id, targetParent.parent.id))) {
    relationships.push('niece-nephew');
  }

  if (areCousins(document, source.id, target.id)) {
    relationships.push('cousin');
  }

  return relationships.length > 0 ? relationships : ['relative'];
}

export function isSpouse(document: FamilyTreeDocument, firstPersonId: string, secondPersonId: string): boolean {
  if (firstPersonId === secondPersonId) {
    return false;
  }

  return Array.from(document.families.values()).some((family) => {
    return family.parents.length === 2 && family.parents.includes(firstPersonId) && family.parents.includes(secondPersonId);
  });
}

export function isParentOf(document: FamilyTreeDocument, parentId: string, childId: string): boolean {
  return Array.from(document.families.values()).some((family) => {
    return family.parents.includes(parentId) && family.children.includes(childId);
  });
}

export function areSiblings(
  document: FamilyTreeDocument,
  firstPersonId: string,
  secondPersonId: string
): boolean {
  if (firstPersonId === secondPersonId) {
    return false;
  }

  return Array.from(document.families.values()).some((family) => {
    return family.children.includes(firstPersonId) && family.children.includes(secondPersonId);
  });
}

export function areCousins(
  document: FamilyTreeDocument,
  firstPersonId: string,
  secondPersonId: string
): boolean {
  const firstParents = getParentLinks(document, firstPersonId);
  const secondParents = getParentLinks(document, secondPersonId);
  return firstParents.some((firstParent) => secondParents.some((secondParent) => {
    return areSiblings(document, firstParent.parent.id, secondParent.parent.id);
  }));
}

export function getParentLinks(document: FamilyTreeDocument, personId: string): readonly ParentLink[] {
  return Array.from(document.families.values()).flatMap((family) => {
    if (!family.children.includes(personId)) {
      return [];
    }

    return family.parents.flatMap((parentId) => {
      const parent = document.people.get(parentId);
      return parent ? [{ parent, family }] : [];
    });
  });
}

export function getSpouseLinks(document: FamilyTreeDocument, personId: string): readonly SpouseLink[] {
  return Array.from(document.families.values()).flatMap((family) => {
    if (family.parents.length !== 2 || !family.parents.includes(personId)) {
      return [];
    }

    const spouseId = family.parents.find((parentId) => parentId !== personId);
    const spouse = spouseId ? document.people.get(spouseId) : undefined;
    return spouse ? [{ spouse, family }] : [];
  });
}

export function getChildren(document: FamilyTreeDocument, personId: string): readonly PersonRecord[] {
  const children = Array.from(document.families.values()).flatMap((family) => {
    if (!family.parents.includes(personId)) {
      return [];
    }

    return family.children.flatMap((childId) => {
      const child = document.people.get(childId);
      return child ? [child] : [];
    });
  });

  return uniquePeople(children);
}

export function getSiblings(document: FamilyTreeDocument, personId: string): readonly PersonRecord[] {
  const siblings = Array.from(document.families.values()).flatMap((family) => {
    if (!family.children.includes(personId)) {
      return [];
    }

    return family.children.flatMap((siblingId) => {
      const sibling = siblingId !== personId ? document.people.get(siblingId) : undefined;
      return sibling ? [sibling] : [];
    });
  });

  return uniquePeople(siblings);
}

export function getParentSiblingContexts(
  document: FamilyTreeDocument,
  sourcePersonId: string,
  parentSiblingId: string
): readonly ParentSiblingContext[] {
  return getParentLinks(document, sourcePersonId).flatMap((parentLink) => {
    if (!areSiblings(document, parentLink.parent.id, parentSiblingId)) {
      return [];
    }

    const parentSibling = document.people.get(parentSiblingId);
    return parentSibling ? [{ sourceParent: parentLink.parent, parentSibling }] : [];
  });
}

export function getAncestorDistance(
  document: FamilyTreeDocument,
  ancestorId: string,
  descendantId: string
): number | null {
  const visitedPersonIds = new Set<string>();
  const queue: { readonly personId: string; readonly distance: number }[] = [{ personId: descendantId, distance: 0 }];

  for (let index = 0; index < queue.length; index += 1) {
    const entry = queue[index];
    if (!entry || visitedPersonIds.has(entry.personId)) {
      continue;
    }

    if (entry.personId === ancestorId) {
      return entry.distance;
    }

    visitedPersonIds.add(entry.personId);
    getParentLinks(document, entry.personId).forEach((parentLink) => {
      queue.push({ personId: parentLink.parent.id, distance: entry.distance + 1 });
    });
  }

  return null;
}

export function getRelativeAge(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): RelativeAge {
  const sourceBirth = parseBirthSortValue(source);
  const targetBirth = parseBirthSortValue(target);
  if (sourceBirth !== null && targetBirth !== null && sourceBirth !== targetBirth) {
    return targetBirth < sourceBirth ? 'older' : 'younger';
  }

  const childOrderComparison = compareSharedChildOrder(document, source.id, target.id);
  if (childOrderComparison === null) {
    return 'unknown';
  }

  return childOrderComparison < 0 ? 'older' : 'younger';
}

export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function uniqueLabels(labels: readonly string[]): readonly string[] {
  return labels.filter((label, index) => labels.indexOf(label) === index);
}

function compareSharedChildOrder(
  document: FamilyTreeDocument,
  sourcePersonId: string,
  targetPersonId: string
): number | null {
  for (const family of document.families.values()) {
    const sourceIndex = family.children.indexOf(sourcePersonId);
    const targetIndex = family.children.indexOf(targetPersonId);
    if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
      return targetIndex - sourceIndex;
    }
  }

  return null;
}

function uniquePeople(people: readonly PersonRecord[]): readonly PersonRecord[] {
  const seenIds = new Set<string>();
  return people.filter((person) => {
    if (seenIds.has(person.id)) {
      return false;
    }

    seenIds.add(person.id);
    return true;
  });
}
