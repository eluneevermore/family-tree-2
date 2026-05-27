import { FamilyRecord, FamilyTreeDocument, FocusedGraphContext } from '../types';

export function collectHiddenPersonIds(
  document: FamilyTreeDocument,
  collapsedFamilyIds: ReadonlySet<string>,
  collapsedPersonIds: ReadonlySet<string> = new Set()
): ReadonlySet<string> {
  const hiddenPersonIds = new Set<string>();
  collapsedFamilyIds.forEach((familyId) => {
    const family = document.families.get(familyId);
    family?.children.forEach((childId) => hideDescendants(document, childId, hiddenPersonIds));
  });
  collapsedPersonIds.forEach((personId) => {
    document.families.forEach((family) => {
      if (family.parents.includes(personId)) {
        family.children.forEach((childId) => hideDescendants(document, childId, hiddenPersonIds));
      }
    });
  });
  return hiddenPersonIds;
}

export function buildFocusedGraphContext(
  document: FamilyTreeDocument,
  focusPersonId: string | null,
  collapsedFamilyIds: ReadonlySet<string>,
  collapsedPersonIds: ReadonlySet<string> = new Set()
): FocusedGraphContext {
  const resolvedFocusPersonId = resolveFocusPersonId(document, focusPersonId);
  if (!resolvedFocusPersonId) {
    return {
      focusPersonId: null,
      mainPersonIds: new Set<string>(),
      visibleFamilyIds: new Set<string>(),
      hiddenPersonIds: new Set<string>(),
      spouseShortcutsByPersonId: new Map<string, readonly string[]>()
    };
  }

  const hiddenPersonIds = collectFocusedHiddenPersonIds(
    document,
    resolvedFocusPersonId,
    collapsedFamilyIds,
    collapsedPersonIds
  );
  const mainPersonIds = collectFocusedMainPersonIds(document, resolvedFocusPersonId, hiddenPersonIds);
  const visibleFamilyIds = collectVisibleFamilyIds(document, mainPersonIds);
  const spouseShortcutsByPersonId = collectSpouseShortcuts(document, mainPersonIds, hiddenPersonIds);

  return {
    focusPersonId: resolvedFocusPersonId,
    mainPersonIds,
    visibleFamilyIds,
    hiddenPersonIds,
    spouseShortcutsByPersonId
  };
}

export function collectFocusedHiddenPersonIds(
  document: FamilyTreeDocument,
  _focusPersonId: string | null,
  collapsedFamilyIds: ReadonlySet<string>,
  collapsedPersonIds: ReadonlySet<string> = new Set()
): ReadonlySet<string> {
  return collectHiddenPersonIds(document, collapsedFamilyIds, collapsedPersonIds);
}

export function findInitialFocusPersonId(document: FamilyTreeDocument): string | null {
  const generations = calculatePersonGenerations(document);
  const people = Array.from(document.people.values());
  if (people.length === 0) {
    return null;
  }

  return people.reduce((currentPersonId, person) => {
    const currentGeneration = generations.get(currentPersonId) ?? 0;
    const personGeneration = generations.get(person.id) ?? 0;
    return personGeneration >= currentGeneration ? person.id : currentPersonId;
  }, people[0].id);
}

export function findAncestorFamilyIds(document: FamilyTreeDocument, personId: string): ReadonlySet<string> {
  const ancestorFamilyIds = new Set<string>();
  const visitedPersonIds = new Set<string>();
  collectAncestorFamilies(document, personId, ancestorFamilyIds, visitedPersonIds);
  return ancestorFamilyIds;
}

export function findMatchingPersonIds(document: FamilyTreeDocument, query: string): readonly string[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return Array.from(document.people.values())
    .filter((person) => person.name.toLowerCase().includes(normalizedQuery) || person.id.toLowerCase().includes(normalizedQuery))
    .map((person) => person.id);
}

function resolveFocusPersonId(document: FamilyTreeDocument, focusPersonId: string | null): string | null {
  if (focusPersonId && document.people.has(focusPersonId)) {
    return focusPersonId;
  }

  return findInitialFocusPersonId(document);
}

function collectFocusedMainPersonIds(
  document: FamilyTreeDocument,
  focusPersonId: string,
  hiddenPersonIds: ReadonlySet<string>
): ReadonlySet<string> {
  const mainPersonIds = new Set<string>();
  collectPrimaryAncestors(document, focusPersonId, hiddenPersonIds, mainPersonIds, new Set<string>());
  collectDescendantsFromMainPeople(document, mainPersonIds, hiddenPersonIds);
  return mainPersonIds;
}

function collectPrimaryAncestors(
  document: FamilyTreeDocument,
  personId: string,
  hiddenPersonIds: ReadonlySet<string>,
  mainPersonIds: Set<string>,
  visitedPersonIds: Set<string>
): void {
  if (visitedPersonIds.has(personId) || !document.people.has(personId)) {
    return;
  }

  visitedPersonIds.add(personId);
  if (!hiddenPersonIds.has(personId)) {
    mainPersonIds.add(personId);
  }
  const parentFamily = findParentFamily(document, personId);
  const primaryParentId = parentFamily?.parents[0];
  if (primaryParentId) {
    collectPrimaryAncestors(document, primaryParentId, hiddenPersonIds, mainPersonIds, visitedPersonIds);
  }
}

function collectDescendantsFromMainPeople(
  document: FamilyTreeDocument,
  mainPersonIds: Set<string>,
  hiddenPersonIds: ReadonlySet<string>
): void {
  let addedPerson = true;
  while (addedPerson) {
    addedPerson = false;
    document.families.forEach((family) => {
      const hasMainParent = family.parents.some((parentId) => mainPersonIds.has(parentId));
      if (!hasMainParent) {
        return;
      }

      family.children.forEach((childId) => {
        if (!hiddenPersonIds.has(childId) && document.people.has(childId) && !mainPersonIds.has(childId)) {
          mainPersonIds.add(childId);
          addedPerson = true;
        }
      });
    });
  }
}

function collectVisibleFamilyIds(
  document: FamilyTreeDocument,
  mainPersonIds: ReadonlySet<string>
): ReadonlySet<string> {
  const familyIds = new Set<string>();
  document.families.forEach((family) => {
    if (family.parents.some((parentId) => mainPersonIds.has(parentId)) || family.children.some((childId) => mainPersonIds.has(childId))) {
      familyIds.add(family.id);
    }
  });
  return familyIds;
}

function collectSpouseShortcuts(
  document: FamilyTreeDocument,
  mainPersonIds: ReadonlySet<string>,
  hiddenPersonIds: ReadonlySet<string>
): ReadonlyMap<string, readonly string[]> {
  const shortcuts = new Map<string, string[]>();
  document.families.forEach((family) => {
    if (family.parents.length !== 2) {
      return;
    }

    family.parents.forEach((parentId) => {
      const spouseId = family.parents.find((candidateId) => candidateId !== parentId);
      if (!spouseId || !mainPersonIds.has(parentId) || hiddenPersonIds.has(spouseId)) {
        return;
      }

      shortcuts.set(parentId, [...(shortcuts.get(parentId) ?? []), spouseId]);
    });
  });
  return shortcuts;
}

function findParentFamily(document: FamilyTreeDocument, personId: string): FamilyRecord | undefined {
  return Array.from(document.families.values()).find((family) => family.children.includes(personId));
}

function calculatePersonGenerations(document: FamilyTreeDocument): ReadonlyMap<string, number> {
  const generations = new Map<string, number>();
  const visiting = new Set<string>();
  document.people.forEach((person) => {
    calculatePersonGeneration(document, person.id, generations, visiting);
  });
  return generations;
}

function calculatePersonGeneration(
  document: FamilyTreeDocument,
  personId: string,
  generations: Map<string, number>,
  visiting: Set<string>
): number {
  const existingGeneration = generations.get(personId);
  if (existingGeneration !== undefined) {
    return existingGeneration;
  }

  if (visiting.has(personId)) {
    return 0;
  }

  visiting.add(personId);
  const parentFamilies = Array.from(document.families.values()).filter((family) => family.children.includes(personId));
  const parentIds = parentFamilies.flatMap((family) => family.parents);
  const generation = parentIds.length === 0
    ? 0
    : Math.max(...parentIds.map((parentId) => calculatePersonGeneration(document, parentId, generations, visiting))) + 1;
  visiting.delete(personId);
  generations.set(personId, generation);
  return generation;
}

function hideDescendants(
  document: FamilyTreeDocument,
  personId: string,
  hiddenPersonIds: Set<string>
): void {
  if (hiddenPersonIds.has(personId)) {
    return;
  }

  hiddenPersonIds.add(personId);
  document.families.forEach((family) => {
    if (family.parents.includes(personId)) {
      family.children.forEach((childId) => hideDescendants(document, childId, hiddenPersonIds));
    }
  });
}

function collectAncestorFamilies(
  document: FamilyTreeDocument,
  personId: string,
  ancestorFamilyIds: Set<string>,
  visitedPersonIds: Set<string>
): void {
  if (visitedPersonIds.has(personId)) {
    return;
  }

  visitedPersonIds.add(personId);
  document.families.forEach((family) => {
    if (!family.children.includes(personId)) {
      return;
    }

    ancestorFamilyIds.add(family.id);
    family.parents.forEach((parentId) => collectAncestorFamilies(document, parentId, ancestorFamilyIds, visitedPersonIds));
  });
}
