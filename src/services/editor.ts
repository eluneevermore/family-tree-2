import { FamilyTreeEdit, PersonDraft, PersonRecord } from '../types';
import { createFamilyId, parseFamilyTreeText, serializeFamilyTreeDocument } from './parser';

export function applyFamilyTreeEdit(text: string, edit: FamilyTreeEdit): string {
  const document = parseFamilyTreeText(text);
  const people = new Map(document.people);
  const families = new Map(document.families);

  if (edit.type === 'upsert-person') {
    people.set(edit.person.id, toPersonRecord(edit.person));
  }

  if (edit.type === 'add-spouse') {
    if (edit.spouse) {
      people.set(edit.spouse.id, toPersonRecord(edit.spouse));
    }

    const parents: readonly [string, string] = [edit.personId, edit.spouseId];
    const familyId = createFamilyId(parents);
    families.set(familyId, families.get(familyId) ?? { id: familyId, parents, children: [] });
  }

  if (edit.type === 'add-child') {
    if (edit.child) {
      people.set(edit.child.id, toPersonRecord(edit.child));
    }

    const familyId = createFamilyId(edit.parents);
    const previousFamily = families.get(familyId);
    const children = previousFamily?.children.includes(edit.childId)
      ? previousFamily.children
      : [...(previousFamily?.children ?? []), edit.childId];

    families.set(familyId, {
      id: familyId,
      parents: previousFamily?.parents ?? edit.parents,
      children
    });
  }

  return serializeFamilyTreeDocument({
    people,
    families,
    diagnostics: document.diagnostics
  });
}

export function createUniquePersonId(name: string, existingIds: ReadonlySet<string>): string {
  const baseId = slugifyPersonName(name) || 'person';
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}${suffix}`;
}

function toPersonRecord(person: PersonDraft): PersonRecord {
  return {
    id: person.id,
    name: person.name,
    gender: person.gender,
    born: person.born || undefined,
    died: person.died || undefined,
    note: person.note || undefined
  };
}

function slugifyPersonName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-/g, '');
}
