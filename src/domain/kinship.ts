import { FamilyRecord, FamilyTreeDocument, Gender, KinshipResult, Language, PersonRecord } from '../types';
import { parseBirthSortValue } from '../services/parser';

type RelativeAge = 'older' | 'younger' | 'unknown';

interface ParentLink {
  readonly parent: PersonRecord;
  readonly family: FamilyRecord;
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
  const relationship = getRelationshipKind(document, source, target);
  if (language === 'vi') {
    return describeVietnamese(document, source, target, relationship);
  }

  return describeEnglish(target, relationship);
}

function getRelationshipKind(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): string {
  if (isSpouse(document, source.id, target.id)) {
    return 'spouse';
  }

  if (isParentOf(document, target.id, source.id)) {
    return 'parent';
  }

  if (isParentOf(document, source.id, target.id)) {
    return 'child';
  }

  if (areSiblings(document, source.id, target.id)) {
    return 'sibling';
  }

  const sourceParents = getParentLinks(document, source.id);
  const targetParents = getParentLinks(document, target.id);
  if (sourceParents.some((sourceParent) => isParentOf(document, target.id, sourceParent.parent.id))) {
    return 'grandparent';
  }

  if (targetParents.some((targetParent) => isParentOf(document, source.id, targetParent.parent.id))) {
    return 'grandchild';
  }

  if (sourceParents.some((sourceParent) => areSiblings(document, sourceParent.parent.id, target.id))) {
    return 'aunt-uncle';
  }

  if (targetParents.some((targetParent) => areSiblings(document, source.id, targetParent.parent.id))) {
    return 'niece-nephew';
  }

  if (sourceParents.some((sourceParent) => targetParents.some((targetParent) => areSiblings(
    document,
    sourceParent.parent.id,
    targetParent.parent.id
  )))) {
    return 'cousin';
  }

  return 'relative';
}

function describeEnglish(target: PersonRecord, relationship: string): string {
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

function describeVietnamese(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord,
  relationship: string
): string {
  if (relationship === 'parent') {
    return target.gender === 'male' ? 'bố' : target.gender === 'female' ? 'mẹ' : 'bố/mẹ';
  }

  if (relationship === 'child') {
    return 'con';
  }

  if (relationship === 'spouse') {
    return target.gender === 'male' ? 'chồng' : target.gender === 'female' ? 'vợ' : 'vợ/chồng';
  }

  if (relationship === 'sibling') {
    return describeVietnameseSibling(source, target);
  }

  if (relationship === 'grandparent') {
    return describeVietnameseGrandparent(document, source, target);
  }

  if (relationship === 'grandchild' || relationship === 'niece-nephew') {
    return 'cháu';
  }

  if (relationship === 'aunt-uncle') {
    return describeVietnameseAuntUncle(document, source, target);
  }

  if (relationship === 'cousin') {
    return describeVietnameseCousin(source, target);
  }

  return 'họ hàng';
}

function describeVietnameseSibling(source: PersonRecord, target: PersonRecord): string {
  const relativeAge = getRelativeAge(source, target);
  if (relativeAge === 'younger') {
    return target.gender === 'male' ? 'em trai' : target.gender === 'female' ? 'em gái' : 'em';
  }

  if (relativeAge === 'older') {
    return target.gender === 'male' ? 'anh' : target.gender === 'female' ? 'chị' : 'anh/chị';
  }

  return target.gender === 'male' ? 'anh/em trai' : target.gender === 'female' ? 'chị/em gái' : 'anh/chị/em';
}

function describeVietnameseGrandparent(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): string {
  const parentBetween = getParentLinks(document, source.id)
    .map((parentLink) => parentLink.parent)
    .find((parent) => isParentOf(document, target.id, parent.id));
  const side = parentBetween?.gender === 'male' ? 'nội' : parentBetween?.gender === 'female' ? 'ngoại' : '';
  const root = target.gender === 'male' ? 'ông' : target.gender === 'female' ? 'bà' : 'ông/bà';
  return side ? `${root} ${side}` : root;
}

function describeVietnameseAuntUncle(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): string {
  const parentBetween = getParentLinks(document, source.id)
    .map((parentLink) => parentLink.parent)
    .find((parent) => areSiblings(document, parent.id, target.id));
  const relativeAge = parentBetween ? getRelativeAge(parentBetween, target) : 'unknown';

  if (relativeAge === 'older') {
    return 'bác';
  }

  if (parentBetween?.gender === 'male') {
    return target.gender === 'male' ? 'chú' : target.gender === 'female' ? 'cô' : 'chú/cô';
  }

  if (parentBetween?.gender === 'female') {
    return target.gender === 'male' ? 'cậu' : target.gender === 'female' ? 'dì' : 'cậu/dì';
  }

  return target.gender === 'male' ? 'bác/chú/cậu' : target.gender === 'female' ? 'bác/cô/dì' : 'bác/chú/cô/cậu/dì';
}

function describeVietnameseCousin(source: PersonRecord, target: PersonRecord): string {
  const relativeAge = getRelativeAge(source, target);
  if (relativeAge === 'younger') {
    return 'em họ';
  }

  if (relativeAge === 'older') {
    return target.gender === 'male' ? 'anh họ' : target.gender === 'female' ? 'chị họ' : 'anh/chị họ';
  }

  return 'anh/chị/em họ';
}

function isSpouse(document: FamilyTreeDocument, firstPersonId: string, secondPersonId: string): boolean {
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

function getRelativeAge(source: PersonRecord, target: PersonRecord): RelativeAge {
  const sourceBirth = parseBirthSortValue(source);
  const targetBirth = parseBirthSortValue(target);
  if (sourceBirth === null || targetBirth === null || sourceBirth === targetBirth) {
    return 'unknown';
  }

  return targetBirth < sourceBirth ? 'older' : 'younger';
}
