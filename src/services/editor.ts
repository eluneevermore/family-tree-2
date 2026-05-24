import { FamilyRecord, FamilyTreeEdit, PersonDraft, PersonRecord } from '../types';
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

  if (edit.type === 'add-parent') {
    if (edit.parent) {
      people.set(edit.parent.id, toPersonRecord(edit.parent));
    }

    addParentFamily(families, edit.childId, edit.parentId);
  }

  return serializeFamilyTreeDocument({
    people,
    families,
    diagnostics: document.diagnostics
  });
}

function addParentFamily(
  families: Map<string, FamilyRecord>,
  childId: string,
  parentId: string
): void {
  if (hasParentChildFamily(families, childId, parentId)) {
    return;
  }

  const singleParentFamily = Array.from(families.values()).find((family) => {
    return family.parents.length === 1 && family.children.includes(childId);
  });
  if (singleParentFamily) {
    const parents: readonly [string, string] = [singleParentFamily.parents[0], parentId];
    const familyId = createFamilyId(parents);
    const previousFamily = families.get(familyId);
    families.delete(singleParentFamily.id);
    families.set(familyId, {
      id: familyId,
      parents: previousFamily?.parents ?? parents,
      children: mergeChildren(previousFamily?.children ?? [], singleParentFamily.children)
    });
    return;
  }

  const parents: readonly [string] = [parentId];
  const familyId = createFamilyId(parents);
  const previousFamily = families.get(familyId);
  families.set(familyId, {
    id: familyId,
    parents,
    children: previousFamily?.children.includes(childId)
      ? previousFamily.children
      : [...(previousFamily?.children ?? []), childId]
  });
}

function hasParentChildFamily(
  families: ReadonlyMap<string, FamilyRecord>,
  childId: string,
  parentId: string
): boolean {
  return Array.from(families.values()).some((family) => {
    return family.parents.includes(parentId) && family.children.includes(childId);
  });
}

function mergeChildren(firstChildren: readonly string[], secondChildren: readonly string[]): readonly string[] {
  return secondChildren.reduce((children, childId) => {
    return children.includes(childId) ? children : [...children, childId];
  }, [...firstChildren]);
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
