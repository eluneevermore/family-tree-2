import { FamilyTreeDocument, PersonRecord } from '../../types';
import { getRelationshipKinds, RelationshipKind, uniqueLabels } from './shared';

export function describeEnglishKinship(
  document: FamilyTreeDocument,
  source: PersonRecord,
  target: PersonRecord
): string {
  const relationships = getRelationshipKinds(document, source, target);
  const labels = relationships.map((relationship) => describeEnglish(target, relationship));

  return uniqueLabels(labels).join(', ');
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
