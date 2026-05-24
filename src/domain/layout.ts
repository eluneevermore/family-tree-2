import {
  CANVAS_PADDING_X,
  CANVAS_PADDING_Y,
  GENERATION_VERTICAL_GAP,
  PERSON_HORIZONTAL_GAP,
  PERSON_NODE_WIDTH
} from '../constants';
import {
  FamilyRecord,
  FamilyTreeDocument,
  FocusedGraphContext,
  LayoutEdge,
  LayoutPersonNode,
  LayoutPersonToggle,
  LayoutSpouseShortcut,
  TreeLayout
} from '../types';
import { parseBirthSortValue } from '../services/parser';
import { buildFocusedGraphContext } from './visibility';

interface ChildOrder {
  readonly familyIndex: number;
  readonly siblingIndex: number;
}

export async function buildTreeLayout(
  document: FamilyTreeDocument,
  collapsedFamilyIds: ReadonlySet<string>,
  focusPersonId: string | null = null,
  collapsedPersonIds: ReadonlySet<string> = new Set()
): Promise<TreeLayout> {
  const context = buildFocusedGraphContext(document, focusPersonId, collapsedFamilyIds, collapsedPersonIds);
  const generations = calculateFocusedGenerations(document, context);
  const childOrder = buildChildOrder(document);
  const people = placePeople({
    document,
    context,
    generations,
    childOrder,
    collapsedFamilyIds,
    collapsedPersonIds
  });
  const edges = buildLayoutEdges(document, context, collapsedFamilyIds, collapsedPersonIds);

  return { people, families: [], edges };
}

export function sortChildrenByAge(document: FamilyTreeDocument, family: FamilyRecord): readonly string[] {
  return [...family.children].sort((firstId, secondId) => {
    const firstBirth = parseBirthSortValue(document.people.get(firstId));
    const secondBirth = parseBirthSortValue(document.people.get(secondId));
    if (firstBirth !== null && secondBirth !== null && firstBirth !== secondBirth) {
      return firstBirth - secondBirth;
    }

    if (firstBirth !== null && secondBirth === null) {
      return -1;
    }

    if (firstBirth === null && secondBirth !== null) {
      return 1;
    }

    return family.children.indexOf(firstId) - family.children.indexOf(secondId);
  });
}

function calculateFocusedGenerations(
  document: FamilyTreeDocument,
  context: FocusedGraphContext
): ReadonlyMap<string, number> {
  const generations = new Map<string, number>();
  const visiting = new Set<string>();
  context.mainPersonIds.forEach((personId) => {
    calculateFocusedGeneration(document, context, personId, generations, visiting);
  });
  return generations;
}

function calculateFocusedGeneration(
  document: FamilyTreeDocument,
  context: FocusedGraphContext,
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
  const visibleParentIds = Array.from(document.families.values())
    .filter((family) => context.visibleFamilyIds.has(family.id))
    .filter((family) => family.children.includes(personId))
    .flatMap((family) => family.parents)
    .filter((parentId) => context.mainPersonIds.has(parentId));
  const generation = visibleParentIds.length === 0
    ? 0
    : Math.max(...visibleParentIds.map((parentId) => calculateFocusedGeneration(
      document,
      context,
      parentId,
      generations,
      visiting
    ))) + 1;

  visiting.delete(personId);
  generations.set(personId, generation);
  return generation;
}

function buildChildOrder(document: FamilyTreeDocument): ReadonlyMap<string, ChildOrder> {
  const childOrder = new Map<string, ChildOrder>();
  Array.from(document.families.values()).forEach((family, familyIndex) => {
    sortChildrenByAge(document, family).forEach((childId, siblingIndex) => {
      if (!childOrder.has(childId)) {
        childOrder.set(childId, { familyIndex, siblingIndex });
      }
    });
  });
  return childOrder;
}

interface PlacePeopleOptions {
  readonly document: FamilyTreeDocument;
  readonly context: FocusedGraphContext;
  readonly generations: ReadonlyMap<string, number>;
  readonly childOrder: ReadonlyMap<string, ChildOrder>;
  readonly collapsedFamilyIds: ReadonlySet<string>;
  readonly collapsedPersonIds: ReadonlySet<string>;
}

function placePeople({
  document,
  context,
  generations,
  childOrder,
  collapsedFamilyIds,
  collapsedPersonIds
}: PlacePeopleOptions): readonly LayoutPersonNode[] {
  const personOrder = buildPersonOrder(document);
  const rows = new Map<number, string[]>();
  context.mainPersonIds.forEach((personId) => {
    if (!document.people.has(personId)) {
      return;
    }

    const generation = generations.get(personId) ?? 0;
    rows.set(generation, [...(rows.get(generation) ?? []), personId]);
  });

  return Array.from(rows.entries()).flatMap(([generation, personIds]) => {
    return [...personIds].sort((firstId, secondId) => comparePeople(
      document,
      firstId,
      secondId,
      childOrder,
      personOrder
    )).map((personId, index) => {
      const person = document.people.get(personId);
      if (!person) {
        return null;
      }

      const childLineToggle = buildChildLineToggle(document, context, person.id, collapsedPersonIds);
      return {
        id: person.id,
        person,
        generation,
        x: CANVAS_PADDING_X + index * (PERSON_NODE_WIDTH + PERSON_HORIZONTAL_GAP),
        y: CANVAS_PADDING_Y + generation * GENERATION_VERTICAL_GAP,
        spouseShortcuts: buildLayoutSpouseShortcuts(document, context, person.id, collapsedFamilyIds),
        ...(childLineToggle ? { childLineToggle } : {})
      };
    }).filter((node): node is LayoutPersonNode => node !== null);
  });
}

function buildLayoutSpouseShortcuts(
  document: FamilyTreeDocument,
  context: FocusedGraphContext,
  personId: string,
  collapsedFamilyIds: ReadonlySet<string>
): readonly LayoutSpouseShortcut[] {
  return (context.spouseShortcutsByPersonId.get(personId) ?? []).flatMap((spouseId) => {
    const family = findSpouseFamily(document, personId, spouseId);
    if (!family) {
      return [];
    }

    return [{
      personId: spouseId,
      family,
      isChecked: !collapsedFamilyIds.has(family.id)
    }];
  });
}

function findSpouseFamily(
  document: FamilyTreeDocument,
  personId: string,
  spouseId: string
): FamilyRecord | undefined {
  return Array.from(document.families.values()).find((family) => {
    return family.parents.length === 2 && family.parents.includes(personId) && family.parents.includes(spouseId);
  });
}

function buildChildLineToggle(
  document: FamilyTreeDocument,
  context: FocusedGraphContext,
  personId: string,
  collapsedPersonIds: ReadonlySet<string>
): LayoutPersonToggle | undefined {
  return hasVisibleChildLine(document, context, personId)
    ? { personId, isCollapsed: collapsedPersonIds.has(personId) }
    : undefined;
}

function hasVisibleChildLine(
  document: FamilyTreeDocument,
  context: FocusedGraphContext,
  personId: string
): boolean {
  return Array.from(document.families.values()).some((family) => {
    return context.visibleFamilyIds.has(family.id) && family.children.length > 0 && family.parents.includes(personId);
  });
}

function comparePeople(
  document: FamilyTreeDocument,
  firstId: string,
  secondId: string,
  childOrder: ReadonlyMap<string, ChildOrder>,
  personOrder: ReadonlyMap<string, number>
): number {
  const firstChildOrder = childOrder.get(firstId);
  const secondChildOrder = childOrder.get(secondId);
  const childDelta = compareOptionalNumber(firstChildOrder?.familyIndex, secondChildOrder?.familyIndex)
    || compareOptionalNumber(firstChildOrder?.siblingIndex, secondChildOrder?.siblingIndex);
  if (childDelta !== 0) {
    return childDelta;
  }

  const birthDelta = compareOptionalNumber(
    parseBirthSortValue(document.people.get(firstId)),
    parseBirthSortValue(document.people.get(secondId))
  );
  if (birthDelta !== 0) {
    return birthDelta;
  }

  return (personOrder.get(firstId) ?? 0) - (personOrder.get(secondId) ?? 0);
}

function buildLayoutEdges(
  document: FamilyTreeDocument,
  context: FocusedGraphContext,
  collapsedFamilyIds: ReadonlySet<string>,
  collapsedPersonIds: ReadonlySet<string>
): readonly LayoutEdge[] {
  return Array.from(document.families.values()).flatMap((family) => {
    if (!context.visibleFamilyIds.has(family.id)) {
      return [];
    }

    const marriageEdges = buildMarriageEdges(family, context);
    const childEdges = isFamilyChildLineVisible(family, collapsedFamilyIds, collapsedPersonIds)
      ? buildChildEdges(document, family, context)
      : [];
    return [...marriageEdges, ...childEdges];
  });
}

function isFamilyChildLineVisible(
  family: FamilyRecord,
  collapsedFamilyIds: ReadonlySet<string>,
  collapsedPersonIds: ReadonlySet<string>
): boolean {
  return !collapsedFamilyIds.has(family.id) && !family.parents.some((personId) => collapsedPersonIds.has(personId));
}

function buildMarriageEdges(family: FamilyRecord, context: FocusedGraphContext): readonly LayoutEdge[] {
  if (family.parents.length !== 2 || !family.parents.every((parentId) => context.mainPersonIds.has(parentId))) {
    return [];
  }

  return [{
    id: `marriage:${family.id}`,
    source: family.parents[0],
    target: family.parents[1],
    type: 'marriage'
  }];
}

function buildChildEdges(
  document: FamilyTreeDocument,
  family: FamilyRecord,
  context: FocusedGraphContext
): readonly LayoutEdge[] {
  return family.parents.flatMap((parentId) => {
    if (!context.mainPersonIds.has(parentId)) {
      return [];
    }

    return sortChildrenByAge(document, family).flatMap((childId) => {
      if (!context.mainPersonIds.has(childId) || context.hiddenPersonIds.has(childId)) {
        return [];
      }

      return [{
        id: `child:${family.id}:${parentId}:${childId}`,
        source: parentId,
        target: childId,
        type: 'child' as const
      }];
    });
  });
}

function compareOptionalNumber(firstValue: number | null | undefined, secondValue: number | null | undefined): number {
  const first = firstValue ?? Number.MAX_SAFE_INTEGER;
  const second = secondValue ?? Number.MAX_SAFE_INTEGER;
  return first - second;
}

function buildPersonOrder(document: FamilyTreeDocument): ReadonlyMap<string, number> {
  return new Map(Array.from(document.people.keys()).map((personId, index) => [personId, index]));
}
