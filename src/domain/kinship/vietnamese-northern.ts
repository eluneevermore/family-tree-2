import { FamilyTreeDocument, PersonRecord } from '../../types';
import {
  areCousins,
  areSiblings,
  getAncestorDistance,
  getChildren,
  getParentLinks,
  getParentSiblingContexts,
  getRelativeAge,
  getSiblings,
  getSpouseLinks,
  isParentOf,
  isPresent,
  isSpouse,
  RELATIONSHIP_LABEL_SEPARATOR,
  uniqueLabels
} from './shared';

const VIETNAMESE_RELATIVE_LABEL = 'họ hàng';
const GREAT_GRANDPARENT_DISTANCE = 3;
const GREAT_GREAT_GRANDPARENT_DISTANCE = 4;

export function describeNorthernVietnameseKinship(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): string {
  return getVietnameseRelationshipLabels(document, source, target).join(RELATIONSHIP_LABEL_SEPARATOR);
}

function getVietnameseRelationshipLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  const labels = uniqueLabels([
    ...getVietnameseDirectLabels(document, source, target),
    ...getVietnameseDeepAncestorLabels(document, source, target),
    ...getVietnameseGrandparentLabels(document, source, target),
    ...getVietnameseGrandchildLabels(document, source, target),
    ...getVietnameseGreatGrandchildLabels(document, source, target),
    ...getVietnameseAuntUncleLabels(document, source, target),
    ...getVietnameseAuntUncleSpouseLabels(document, source, target),
    ...getVietnameseNieceNephewLabels(document, source, target),
    ...getVietnameseNieceNephewSpouseLabels(document, source, target),
    ...getVietnameseCousinLabels(document, source, target),
    ...getVietnameseRelativeSpouseLabels(document, source, target),
    ...getVietnameseChildSpouseLabels(document, source, target),
    ...getVietnameseGrandchildSpouseLabels(document, source, target),
    ...getVietnameseSpouseFamilyLabels(document, source, target),
    ...getVietnameseMirroredExtendedFamilyLabels(document, source, target),
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

function getVietnameseDeepAncestorLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  const distance = getAncestorDistance(document, target.id, source.id);
  if (distance === GREAT_GRANDPARENT_DISTANCE) {
    return ['cụ'];
  }

  return distance === GREAT_GREAT_GRANDPARENT_DISTANCE ? ['kỵ'] : [];
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
  return getAncestorDistance(document, source.id, target.id) === GREAT_GRANDPARENT_DISTANCE ? ['chắt'] : [];
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
  return isVietnameseNieceNephew(document, source.id, target.id) ? ['cháu'] : [];
}

function getVietnameseNieceNephewSpouseLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getSpouseLinks(document, target.id).flatMap((spouseLink) => {
    return canCallAsNieceNephewSpouse(document, source, spouseLink.spouse)
      ? [formatVietnameseNieceNephewSpouse(spouseLink.spouse, target)]
      : [];
  });
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

function getVietnameseChildSpouseLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getChildren(document, source.id).flatMap((child) => {
    return isSpouse(document, child.id, target.id) ? [formatVietnameseChildSpouse(child, target)] : [];
  });
}

function getVietnameseGrandchildSpouseLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getChildren(document, source.id).flatMap((child) => {
    return getChildren(document, child.id).flatMap((grandchild) => {
      return isSpouse(document, grandchild.id, target.id)
        ? [formatVietnameseGrandchildSpouse(grandchild, target)]
        : [];
    });
  });
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

function getVietnameseMirroredExtendedFamilyLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getVietnameseMirroredFamilySources(document, source).flatMap((familySource) => [
    ...getVietnameseGenericGrandparentLabels(document, familySource, target),
    ...getVietnameseAuntUncleLabels(document, familySource, target),
    ...getVietnameseAuntUncleSpouseLabels(document, familySource, target)
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

function canCallAsNieceNephewSpouse(
  document: FamilyTreeDocument,
  source: PersonRecord,
  nieceOrNephew: PersonRecord
): boolean {
  if (isVietnameseNieceNephew(document, source.id, nieceOrNephew.id)) {
    return true;
  }

  return getSpouseLinks(document, source.id)
    .some((spouseLink) => isVietnameseNieceNephew(document, spouseLink.spouse.id, nieceOrNephew.id));
}

function isVietnameseNieceNephew(
  document: FamilyTreeDocument,
  sourcePersonId: string,
  targetPersonId: string
): boolean {
  return getParentLinks(document, targetPersonId)
    .some((parentLink) => areSiblings(document, sourcePersonId, parentLink.parent.id));
}

function getVietnameseMirroredFamilySources(
  document: FamilyTreeDocument,
  source: PersonRecord
): readonly PersonRecord[] {
  return uniquePeopleById([
    ...getSpouseLinks(document, source.id).map((spouseLink) => spouseLink.spouse),
    ...getVietnameseGrandchildSpouses(document, source)
  ]);
}

function getVietnameseGrandchildSpouses(
  document: FamilyTreeDocument,
  source: PersonRecord
): readonly PersonRecord[] {
  return getChildren(document, source.id).flatMap((child) => {
    return getChildren(document, child.id).flatMap((grandchild) => {
      return getSpouseLinks(document, grandchild.id).map((spouseLink) => spouseLink.spouse);
    });
  });
}

function getVietnameseGenericGrandparentLabels(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): readonly string[] {
  return getParentLinks(document, source.id)
    .filter((parentLink) => isParentOf(document, target.id, parentLink.parent.id))
    .map(() => formatVietnameseGenericGrandparent(target));
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

function formatVietnameseGenericGrandparent(grandparent: PersonRecord): string {
  return grandparent.gender === 'male' ? 'ông' : grandparent.gender === 'female' ? 'bà' : 'ông/bà';
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

function formatVietnameseChildSpouse(child: PersonRecord, target: PersonRecord): string {
  if (child.gender === 'male' && target.gender === 'female') {
    return 'con dâu';
  }

  if (child.gender === 'female' && target.gender === 'male') {
    return 'con rể';
  }

  return 'con dâu/rể';
}

function formatVietnameseGrandchildSpouse(grandchild: PersonRecord, target: PersonRecord): string {
  if (grandchild.gender === 'male' && target.gender === 'female') {
    return 'cháu dâu';
  }

  if (grandchild.gender === 'female' && target.gender === 'male') {
    return 'cháu rể';
  }

  return 'cháu dâu/rể';
}

function formatVietnameseNieceNephewSpouse(nieceOrNephew: PersonRecord, target: PersonRecord): string {
  if (nieceOrNephew.gender === 'male' && target.gender === 'female') {
    return 'cháu dâu';
  }

  if (nieceOrNephew.gender === 'female' && target.gender === 'male') {
    return 'cháu rể';
  }

  return 'cháu dâu/rể';
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

function uniquePeopleById(people: readonly PersonRecord[]): readonly PersonRecord[] {
  const seenIds = new Set<string>();
  return people.filter((person) => {
    if (seenIds.has(person.id)) {
      return false;
    }

    seenIds.add(person.id);
    return true;
  });
}
