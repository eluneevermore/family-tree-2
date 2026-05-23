import { FamilyTreeDocument, GenerationModel } from '../types';

export function buildGenerationModel(document: FamilyTreeDocument): GenerationModel {
  const disjointSet = createPersonGroups(document);
  const groupMembers = collectGroupMembers(document, disjointSet);
  const parentGroupsByChildGroup = buildGroupParentIndex(document, disjointSet);
  const groupGenerations = calculateGroupGenerations(groupMembers, parentGroupsByChildGroup);
  const personGenerations = new Map<string, number>();
  const personGroups = new Map<string, string>();

  document.people.forEach((person) => {
    const groupId = disjointSet.find(person.id);
    personGenerations.set(person.id, groupGenerations.get(groupId) ?? 0);
    personGroups.set(person.id, groupId);
  });

  return {
    personGenerations,
    personGroups,
    groupMembers
  };
}

class DisjointSet {
  private readonly parents = new Map<string, string>();

  public add(value: string): void {
    if (!this.parents.has(value)) {
      this.parents.set(value, value);
    }
  }

  public find(value: string): string {
    const parent = this.parents.get(value);
    if (!parent) {
      this.add(value);
      return value;
    }

    if (parent === value) {
      return parent;
    }

    const root = this.find(parent);
    this.parents.set(value, root);
    return root;
  }

  public union(firstValue: string, secondValue: string): void {
    const firstRoot = this.find(firstValue);
    const secondRoot = this.find(secondValue);
    if (firstRoot !== secondRoot) {
      this.parents.set(secondRoot, firstRoot);
    }
  }
}

function createPersonGroups(document: FamilyTreeDocument): DisjointSet {
  const disjointSet = new DisjointSet();
  document.people.forEach((person) => disjointSet.add(person.id));
  document.families.forEach((family) => {
    if (family.parents.length === 2) {
      disjointSet.union(family.parents[0], family.parents[1]);
    }
  });
  return disjointSet;
}

function collectGroupMembers(
  document: FamilyTreeDocument,
  disjointSet: DisjointSet
): ReadonlyMap<string, readonly string[]> {
  const members = new Map<string, string[]>();
  document.people.forEach((person) => {
    const groupId = disjointSet.find(person.id);
    members.set(groupId, [...(members.get(groupId) ?? []), person.id]);
  });
  return members;
}

function buildGroupParentIndex(
  document: FamilyTreeDocument,
  disjointSet: DisjointSet
): ReadonlyMap<string, ReadonlySet<string>> {
  const parentGroupsByChildGroup = new Map<string, Set<string>>();
  document.families.forEach((family) => {
    family.children.forEach((childId) => {
      if (!document.people.has(childId)) {
        return;
      }

      const childGroupId = disjointSet.find(childId);
      const parentGroups = parentGroupsByChildGroup.get(childGroupId) ?? new Set<string>();
      family.parents.forEach((parentId) => {
        if (!document.people.has(parentId)) {
          return;
        }

        const parentGroupId = disjointSet.find(parentId);
        if (parentGroupId !== childGroupId) {
          parentGroups.add(parentGroupId);
        }
      });
      parentGroupsByChildGroup.set(childGroupId, parentGroups);
    });
  });
  return parentGroupsByChildGroup;
}

function calculateGroupGenerations(
  groupMembers: ReadonlyMap<string, readonly string[]>,
  parentGroupsByChildGroup: ReadonlyMap<string, ReadonlySet<string>>
): ReadonlyMap<string, number> {
  const generations = new Map<string, number>();
  const visiting = new Set<string>();

  groupMembers.forEach((_members, groupId) => {
    calculateGroupGeneration(groupId, parentGroupsByChildGroup, generations, visiting);
  });

  return generations;
}

function calculateGroupGeneration(
  groupId: string,
  parentGroupsByChildGroup: ReadonlyMap<string, ReadonlySet<string>>,
  generations: Map<string, number>,
  visiting: Set<string>
): number {
  const existingGeneration = generations.get(groupId);
  if (existingGeneration !== undefined) {
    return existingGeneration;
  }

  if (visiting.has(groupId)) {
    return 0;
  }

  visiting.add(groupId);
  const parentGroups = Array.from(parentGroupsByChildGroup.get(groupId) ?? []);
  const generation = parentGroups.length === 0
    ? 0
    : Math.max(...parentGroups.map((parentGroupId) => calculateGroupGeneration(
      parentGroupId,
      parentGroupsByChildGroup,
      generations,
      visiting
    ))) + 1;

  visiting.delete(groupId);
  generations.set(groupId, generation);
  return generation;
}
