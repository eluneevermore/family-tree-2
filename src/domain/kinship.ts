import { FamilyRecord, FamilyTreeDocument, KinshipResult, Language, PersonRecord } from '../types';
import { parseBirthSortValue } from '../services/parser';

type RelativeAge = 'older' | 'younger' | 'unknown';
type RelationshipKind =
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

const RELATIONSHIP_LABEL_SEPARATOR = ', ';
const VIETNAMESE_RELATIVE_LABEL = 'họ hàng';

interface ParentLink {
  readonly parent: PersonRecord;
  readonly family: FamilyRecord;
}

interface SpouseLink {
  readonly spouse: PersonRecord;
  readonly family: FamilyRecord;
}

interface ParentSiblingContext {
  readonly sourceParent: PersonRecord;
  readonly parentSibling: PersonRecord;
}

export function describeKinship(
  document: FamilyTreeDocument,
  selectedPersonId: string | null,
  hoveredPersonId: string | null,
  language: Language
): KinshipResult | null {
  if (!selectedPersonId || !hoveredPersonId || selectedPersonId === hoveredPersonId) {
    return null;
  }

  const selected = document.people.get(selectedPersonId);
  const hovered = document.people.get(hoveredPersonId);
  if (!selected || !hovered) {
    return null;
  }

  return {
    selectedPersonId,
    hoveredPersonId,
    selectedToHovered: describeOneWay(document, selected, hovered, language),
    hoveredToSelected: describeOneWay(document, hovered, selected, language)
  };
}

function describeOneWay(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord,
  language: Language
): string {
  if (language === 'vi') {
    return getVietnameseRelationshipLabels(document, source, target).join(RELATIONSHIP_LABEL_SEPARATOR);
  }

  const relationships = getRelationshipKinds(document, source, target);
  const labels = relationships.map((relationship) => describeEnglish(target, relationship));

  return uniqueLabels(labels).join(RELATIONSHIP_LABEL_SEPARATOR);
}

function getRelationshipKinds(
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

  if (sourceParents.some((sourceParent) => targetParents.some((targetParent) => areSiblings(
    document,
    sourceParent.parent.id,
    targetParent.parent.id
  )))) {
    relationships.push('cousin');
  }

  return relationships.length > 0 ? relationships : ['relative'];
}

function describeEnglish(target: PersonRecord, relationship: RelationshipKind): string {
  if (relationship === 'parent') {
    return target.gender === 'male' ? 'father' : target.gender === 'female' ? 'mother' : 'parent';
  }

  if (relationship === 'child') {
    return target.gender === 'male' ? 'son' : target.gender === 'female' ? 'daughter' : 'child';
  }

  if (relationship === 'spouse') {
    return target.gender === 'male' ? 'husband' : target.gender === 'female' ? 'wife' : 'spouse';
  }

  if (relationship === 'sibling') {
    return target.gender === 'male' ? 'brother' : target.gender === 'female' ? 'sister' : 'sibling';
  }

  if (relationship === 'grandparent') {
    return target.gender === 'male' ? 'grandfather' : target.gender === 'female' ? 'grandmother' : 'grandparent';
  }

  if (relationship === 'grandchild') {
    return target.gender === 'male' ? 'grandson' : target.gender === 'female' ? 'granddaughter' : 'grandchild';
  }

  if (relationship === 'aunt-uncle') {
    return target.gender === 'male' ? 'uncle' : target.gender === 'female' ? 'aunt' : 'aunt/uncle';
  }

  if (relationship === 'niece-nephew') {
    return target.gender === 'male' ? 'nephew' : target.gender === 'female' ? 'niece' : 'niece/nephew';
  }

  if (relationship === 'cousin') {
    return 'cousin';
  }

  return 'relative';
}

function getVietnameseRelationshipLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  const labels = uniqueLabels([
    ...getVietnameseDirectLabels(document, source, target),
    ...getVietnameseGrandparentLabels(document, source, target),
    ...getVietnameseGrandchildLabels(document, source, target),
    ...getVietnameseGreatGrandchildLabels(document, source, target),
    ...getVietnameseAuntUncleLabels(document, source, target),
    ...getVietnameseAuntUncleSpouseLabels(document, source, target),
    ...getVietnameseNieceNephewLabels(document, source, target),
    ...getVietnameseCousinLabels(document, source, target),
    ...getVietnameseRelativeSpouseLabels(document, source, target),
    ...getVietnameseSpouseFamilyLabels(document, source, target),
    ...getVietnameseInLawParentLabels(document, source, target),
    ...getVietnameseCoInLawLabels(document, source, target)
  ]);

  return labels.length > 0 ? labels : [VIETNAMESE_RELATIVE_LABEL];
}

function getVietnameseDirectLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return [
    isParentOf(document, target.id, source.id) ? formatVietnameseParent(target) : null,
    isParentOf(document, source.id, target.id) ? 'con' : null,
    isSpouse(document, source.id, target.id) ? formatVietnameseSpouse(target) : null,
    areSiblings(document, source.id, target.id) ? describeVietnameseSibling(document, source, target) : null
  ].filter(isPresent);
}

function getVietnameseGrandparentLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getParentLinks(document, source.id)
    .filter((parentLink) => isParentOf(document, target.id, parentLink.parent.id))
    .map((parentLink) => formatVietnameseGrandparent(target, parentLink.parent));
}

function getVietnameseGrandchildLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getParentLinks(document, target.id)
    .filter((parentLink) => isParentOf(document, source.id, parentLink.parent.id))
    .map((parentLink) => formatVietnameseGrandchild(parentLink.parent));
}

function getVietnameseGreatGrandchildLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return isGreatGrandparentOf(document, source.id, target.id) ? ['chắt'] : [];
}

function getVietnameseAuntUncleLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getParentSiblingContexts(document, source.id, target.id)
    .map((context) => describeVietnameseAuntUncle(document, context.sourceParent, context.parentSibling));
}

function getVietnameseAuntUncleSpouseLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getParentLinks(document, source.id).flatMap((parentLink) => {
    return getSiblings(document, parentLink.parent.id).flatMap((parentSibling) => {
      return isSpouse(document, parentSibling.id, target.id)
        ? [describeVietnameseAuntUncleSpouse(document, parentLink.parent, parentSibling, target)]
        : [];
    });
  });
}

function getVietnameseNieceNephewLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  const isChildOfSibling = getParentLinks(document, target.id)
    .some((parentLink) => areSiblings(document, source.id, parentLink.parent.id));
  return isChildOfSibling ? ['cháu'] : [];
}

function getVietnameseCousinLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return areCousins(document, source.id, target.id)
    ? [describeVietnameseCousin(document, source, target)]
    : [];
}

function getVietnameseRelativeSpouseLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getSpouseLinks(document, target.id)
    .map((spouseLink) => describeVietnameseRelativeSpouse(document, source, spouseLink.spouse, target))
    .filter(isPresent);
}

function getVietnameseSpouseFamilyLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getSpouseLinks(document, source.id).flatMap((spouseLink) => [
    ...getVietnameseSpouseParentLabels(document, spouseLink.spouse, target),
    ...getVietnameseSpouseSiblingLabels(document, spouseLink.spouse, target)
  ]);
}

function getVietnameseInLawParentLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getChildren(document, source.id).flatMap((child) => {
    return getSpouseLinks(document, child.id).flatMap((spouseLink) => {
      return isParentOf(document, target.id, spouseLink.spouse.id) ? [formatVietnameseInLawParent(target)] : [];
    });
  });
}

function getVietnameseCoInLawLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  const hasSiblingSpouses = getSpouseLinks(document, source.id).some((sourceSpouseLink) => {
    return getSpouseLinks(document, target.id).some((targetSpouseLink) => {
      return areSiblings(document, sourceSpouseLink.spouse.id, targetSpouseLink.spouse.id);
    });
  });

  return hasSiblingSpouses ? [formatVietnameseCoInLaw(document, source, target)] : [];
}

function describeVietnameseSibling(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): string {
  const relativeAge = getRelativeAge(document, source, target);
  if (relativeAge === 'younger') {
    return target.gender === 'male' ? 'em trai' : target.gender === 'female' ? 'em gái' : 'em';
  }

  if (relativeAge === 'older') {
    return target.gender === 'male' ? 'anh ruột' : target.gender === 'female' ? 'chị ruột' : 'anh/chị ruột';
  }

  return target.gender === 'male' ? 'anh/em trai' : target.gender === 'female' ? 'chị/em gái' : 'anh/chị/em';
}

function describeVietnameseAuntUncle(
  document: FamilyTreeDocument,
  sourceParent: PersonRecord,
  parentSibling: PersonRecord
): string {
  const relativeAge = getRelativeAge(document, sourceParent, parentSibling);
  if (relativeAge === 'older') {
    return parentSibling.gender === 'male' ? 'bác trai' : parentSibling.gender === 'female' ? 'bác gái' : 'bác';
  }

  if (relativeAge === 'unknown') {
    return formatVietnameseUnknownAuntUncle(parentSibling);
  }

  if (sourceParent.gender === 'male') {
    return parentSibling.gender === 'male' ? 'chú' : parentSibling.gender === 'female' ? 'cô' : 'chú/cô';
  }

  if (sourceParent.gender === 'female') {
    return parentSibling.gender === 'male' ? 'cậu' : parentSibling.gender === 'female' ? 'dì' : 'cậu/dì';
  }

  return formatVietnameseUnknownAuntUncle(parentSibling);
}

function describeVietnameseAuntUncleSpouse(
  document: FamilyTreeDocument,
  sourceParent: PersonRecord,
  parentSibling: PersonRecord,
  target: PersonRecord
): string {
  const relativeAge = getRelativeAge(document, sourceParent, parentSibling);
  if (relativeAge === 'older') {
    return target.gender === 'male' ? 'bác trai' : target.gender === 'female' ? 'bác gái' : 'bác';
  }

  if (parentSibling.gender === 'female') {
    return 'dượng';
  }

  if (parentSibling.gender === 'male' && sourceParent.gender === 'male') {
    return 'thím';
  }

  if (parentSibling.gender === 'male' && sourceParent.gender === 'female') {
    return 'mợ';
  }

  return VIETNAMESE_RELATIVE_LABEL;
}

function describeVietnameseCousin(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): string {
  const relativeAge = getRelativeAge(document, source, target);
  if (relativeAge === 'younger') {
    return 'em họ';
  }

  if (relativeAge === 'older') {
    return target.gender === 'male' ? 'anh họ' : target.gender === 'female' ? 'chị họ' : 'anh/chị họ';
  }

  return 'anh/chị/em họ';
}

function describeVietnameseRelativeSpouse(
  document: FamilyTreeDocument,
  source: PersonRecord,
  relative: PersonRecord,
  target: PersonRecord
): string | null {
  if (areSiblings(document, source.id, relative.id)) {
    return describeVietnameseSiblingSpouse(document, source, relative, target);
  }

  if (areCousins(document, source.id, relative.id)) {
    return describeVietnameseCousinSpouse(document, source, relative, target);
  }

  return null;
}

function describeVietnameseSiblingSpouse(
  document: FamilyTreeDocument,
  source: PersonRecord,
  sibling: PersonRecord,
  target: PersonRecord
): string | null {
  const relativeAge = getRelativeAge(document, source, sibling);
  if (sibling.gender === 'female' && target.gender === 'male') {
    return relativeAge === 'older' ? 'anh rể' : relativeAge === 'younger' ? 'em rể' : 'anh/em rể';
  }

  if (sibling.gender === 'male' && target.gender === 'female') {
    return relativeAge === 'older' ? 'chị dâu' : relativeAge === 'younger' ? 'em dâu' : 'chị/em dâu';
  }

  return null;
}

function describeVietnameseCousinSpouse(
  document: FamilyTreeDocument,
  source: PersonRecord,
  cousin: PersonRecord,
  target: PersonRecord
): string | null {
  if (getRelativeAge(document, source, cousin) !== 'older') {
    return null;
  }

  if (cousin.gender === 'female' && target.gender === 'male') {
    return 'anh rể';
  }

  return cousin.gender === 'male' && target.gender === 'female' ? 'chị dâu' : null;
}

function getVietnameseSpouseParentLabels(
  document: FamilyTreeDocument,
  spouse: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return isParentOf(document, target.id, spouse.id)
    ? [formatVietnameseSpouseParent(spouse, target)]
    : [];
}

function getVietnameseSpouseSiblingLabels(
  document: FamilyTreeDocument,
  spouse: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return areSiblings(document, spouse.id, target.id)
    ? [formatVietnameseSpouseSibling(document, spouse, target)]
    : [];
}

function formatVietnameseParent(target: PersonRecord): string {
  return target.gender === 'male' ? 'bố' : target.gender === 'female' ? 'mẹ' : 'bố/mẹ';
}

function formatVietnameseSpouse(target: PersonRecord): string {
  return target.gender === 'male' ? 'chồng' : target.gender === 'female' ? 'vợ' : 'vợ/chồng';
}

function formatVietnameseGrandparent(grandparent: PersonRecord, parentBetween: PersonRecord): string {
  const side = parentBetween.gender === 'male' ? 'nội' : parentBetween.gender === 'female' ? 'ngoại' : '';
  const root = grandparent.gender === 'male' ? 'ông' : grandparent.gender === 'female' ? 'bà' : 'ông/bà';
  return side ? `${root} ${side}` : root;
}

function formatVietnameseGrandchild(parentBetween: PersonRecord): string {
  if (parentBetween.gender === 'male') {
    return 'cháu nội';
  }

  return parentBetween.gender === 'female' ? 'cháu ngoại' : 'cháu';
}

function formatVietnameseUnknownAuntUncle(parentSibling: PersonRecord): string {
  if (parentSibling.gender === 'male') {
    return 'bác trai/chú/cậu';
  }

  return parentSibling.gender === 'female' ? 'bác gái/cô/dì' : 'bác/chú/cô/cậu/dì';
}

function formatVietnameseSpouseParent(spouse: PersonRecord, target: PersonRecord): string {
  if (spouse.gender === 'female') {
    return target.gender === 'male' ? 'bố vợ' : target.gender === 'female' ? 'mẹ vợ' : 'bố/mẹ vợ';
  }

  if (spouse.gender === 'male') {
    return target.gender === 'male' ? 'bố chồng' : target.gender === 'female' ? 'mẹ chồng' : 'bố/mẹ chồng';
  }

  return target.gender === 'male' ? 'bố vợ/chồng' : target.gender === 'female' ? 'mẹ vợ/chồng' : 'bố/mẹ vợ/chồng';
}

function formatVietnameseSpouseSibling(
  document: FamilyTreeDocument,
  spouse: PersonRecord,
  target: PersonRecord
): string {
  const relativeAge = getRelativeAge(document, spouse, target);
  const suffix = spouse.gender === 'female' ? 'vợ' : spouse.gender === 'male' ? 'chồng' : 'vợ/chồng';
  if (relativeAge === 'younger') {
    return `em ${suffix}`;
  }

  if (target.gender === 'male') {
    return relativeAge === 'older' ? `anh ${suffix}` : `anh/em ${suffix}`;
  }

  return target.gender === 'female'
    ? relativeAge === 'older' ? `chị ${suffix}` : `chị/em ${suffix}`
    : `anh/chị/em ${suffix}`;
}

function formatVietnameseInLawParent(target: PersonRecord): string {
  return target.gender === 'male' ? 'ông thông gia' : target.gender === 'female' ? 'bà thông gia' : 'thông gia';
}

function formatVietnameseCoInLaw(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): string {
  const relativeAge = getRelativeAge(document, source, target);
  if (relativeAge === 'older') {
    return 'anh đồng hao';
  }

  return relativeAge === 'younger' ? 'em đồng hao' : 'đồng hao';
}

function getParentSiblingContexts(
  document: FamilyTreeDocument,
  sourcePersonId: string,
  parentSiblingId: string
): readonly ParentSiblingContext[] {
  return getParentLinks(document, sourcePersonId).flatMap((parentLink) => {
    return areSiblings(document, parentLink.parent.id, parentSiblingId)
      ? [{ sourceParent: parentLink.parent, parentSibling: document.people.get(parentSiblingId) }]
      : [];
  }).filter(hasParentSibling);
}

function hasParentSibling(
  context: Omit<ParentSiblingContext, 'parentSibling'> & { readonly parentSibling: PersonRecord | undefined }
): context is ParentSiblingContext {
  return Boolean(context.parentSibling);
}

function areCousins(document: FamilyTreeDocument, firstPersonId: string, secondPersonId: string): boolean {
  const firstParents = getParentLinks(document, firstPersonId);
  const secondParents = getParentLinks(document, secondPersonId);
  return firstParents.some((firstParent) => secondParents.some((secondParent) => {
    return areSiblings(document, firstParent.parent.id, secondParent.parent.id);
  }));
}

function isGreatGrandparentOf(
  document: FamilyTreeDocument,
  greatGrandparentId: string,
  greatGrandchildId: string
): boolean {
  return getParentLinks(document, greatGrandchildId).some((parentLink) => {
    return getParentLinks(document, parentLink.parent.id).some((grandparentLink) => {
      return isParentOf(document, greatGrandparentId, grandparentLink.parent.id);
    });
  });
}

function getSpouseLinks(document: FamilyTreeDocument, personId: string): readonly SpouseLink[] {
  return Array.from(document.families.values()).flatMap((family) => {
    if (family.parents.length !== 2 || !family.parents.includes(personId)) {
      return [];
    }

    const spouseId = family.parents.find((parentId) => parentId !== personId);
    const spouse = spouseId ? document.people.get(spouseId) : undefined;
    return spouse ? [{ spouse, family }] : [];
  });
}

function getChildren(document: FamilyTreeDocument, personId: string): readonly PersonRecord[] {
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

function getSiblings(document: FamilyTreeDocument, personId: string): readonly PersonRecord[] {
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

function isSpouse(document: FamilyTreeDocument, firstPersonId: string, secondPersonId: string): boolean {
  if (firstPersonId === secondPersonId) {
    return false;
  }

  return Array.from(document.families.values()).some((family) => {
    return family.parents.length === 2 && family.parents.includes(firstPersonId) && family.parents.includes(secondPersonId);
  });
}

function isParentOf(document: FamilyTreeDocument, parentId: string, childId: string): boolean {
  return Array.from(document.families.values()).some((family) => {
    return family.parents.includes(parentId) && family.children.includes(childId);
  });
}

function areSiblings(document: FamilyTreeDocument, firstPersonId: string, secondPersonId: string): boolean {
  if (firstPersonId === secondPersonId) {
    return false;
  }

  return Array.from(document.families.values()).some((family) => {
    return family.children.includes(firstPersonId) && family.children.includes(secondPersonId);
  });
}

function getParentLinks(document: FamilyTreeDocument, personId: string): readonly ParentLink[] {
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

function getRelativeAge(
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

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function uniqueLabels(labels: readonly string[]): readonly string[] {
  return labels.filter((label, index) => labels.indexOf(label) === index);
}
