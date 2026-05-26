import { describeEnglishKinship } from './kinship/english';
import { describeNorthernVietnameseKinship } from './kinship/vietnamese-northern';
import { FamilyTreeDocument, KinshipResult, Language, PersonRecord } from '../types';

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
  return language === 'vi'
    ? describeNorthernVietnameseKinship(document, source, target)
    : describeEnglishKinship(document, source, target);
}
