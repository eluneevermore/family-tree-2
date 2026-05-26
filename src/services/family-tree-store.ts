import {
  DEFAULT_FAMILY_TREE_NAME,
  STORAGE_FAMILY_TREES_KEY,
  STORAGE_KEY
} from '../constants';

export interface FamilyTreeSummary {
  readonly id: string;
  readonly name: string;
}

export interface StoredFamilyTree extends FamilyTreeSummary {
  readonly text: string;
}

export interface FamilyTreeStore {
  ensureReady(defaultText: string): StoredFamilyTree;
  listTrees(): readonly FamilyTreeSummary[];
  readTree(treeId: string): StoredFamilyTree | null;
  createTree(name: string, text: string): StoredFamilyTree;
  saveTreeText(treeId: string, text: string): void;
  setActiveTreeId(treeId: string): void;
}

interface PersistedFamilyTreeCollection {
  readonly activeTreeId: string;
  readonly trees: readonly StoredFamilyTree[];
}

const DEFAULT_TREE_ID = 'family-tree';
const CREATE_ID_COLLISION_SUFFIX_START = 2;

export class LocalStorageFamilyTreeStore implements FamilyTreeStore {
  constructor(private readonly storage: Storage) {}

  ensureReady(defaultText: string): StoredFamilyTree {
    const collection = this.readCollection() ?? this.createDefaultCollection(defaultText);
    const activeTree = this.findActiveTree(collection) ?? collection.trees[0];

    if (!activeTree) {
      const fallbackCollection = this.createDefaultCollection(defaultText);
      this.writeCollection(fallbackCollection);
      return fallbackCollection.trees[0];
    }

    if (collection.activeTreeId !== activeTree.id) {
      this.writeCollection({ ...collection, activeTreeId: activeTree.id });
    } else {
      this.writeCollection(collection);
    }

    return activeTree;
  }

  listTrees(): readonly FamilyTreeSummary[] {
    return (this.readCollection()?.trees ?? []).map(({ id, name }) => ({ id, name }));
  }

  readTree(treeId: string): StoredFamilyTree | null {
    return this.readCollection()?.trees.find((tree) => tree.id === treeId) ?? null;
  }

  createTree(name: string, text: string): StoredFamilyTree {
    const collection = this.readCollection() ?? this.createDefaultCollection(text);
    const normalizedName = name.trim() || DEFAULT_FAMILY_TREE_NAME;
    const tree = {
      id: createUniqueTreeId(normalizedName, collection.trees.map((existingTree) => existingTree.id)),
      name: normalizedName,
      text
    };
    this.writeCollection({
      activeTreeId: tree.id,
      trees: [...collection.trees, tree]
    });
    return tree;
  }

  saveTreeText(treeId: string, text: string): void {
    const collection = this.readCollection();
    if (!collection) {
      return;
    }

    this.writeCollection({
      ...collection,
      trees: collection.trees.map((tree) => tree.id === treeId ? { ...tree, text } : tree)
    });
    this.storage.setItem(STORAGE_KEY, text);
  }

  setActiveTreeId(treeId: string): void {
    const collection = this.readCollection();
    if (!collection || !collection.trees.some((tree) => tree.id === treeId)) {
      return;
    }

    this.writeCollection({ ...collection, activeTreeId: treeId });
  }

  private createDefaultCollection(defaultText: string): PersistedFamilyTreeCollection {
    const migratedText = this.storage.getItem(STORAGE_KEY) ?? defaultText;
    return {
      activeTreeId: DEFAULT_TREE_ID,
      trees: [{
        id: DEFAULT_TREE_ID,
        name: DEFAULT_FAMILY_TREE_NAME,
        text: migratedText
      }]
    };
  }

  private findActiveTree(collection: PersistedFamilyTreeCollection): StoredFamilyTree | undefined {
    return collection.trees.find((tree) => tree.id === collection.activeTreeId);
  }

  private readCollection(): PersistedFamilyTreeCollection | null {
    const storedValue = this.storage.getItem(STORAGE_FAMILY_TREES_KEY);
    if (!storedValue) {
      return null;
    }

    try {
      const parsedValue = JSON.parse(storedValue) as Partial<PersistedFamilyTreeCollection>;
      if (!parsedValue.activeTreeId || !Array.isArray(parsedValue.trees)) {
        return null;
      }

      const trees = parsedValue.trees.filter(isStoredFamilyTree);
      return trees.length > 0 ? { activeTreeId: parsedValue.activeTreeId, trees } : null;
    } catch (error) {
      console.error('Failed to read family tree collection from localStorage.', error);
      return null;
    }
  }

  private writeCollection(collection: PersistedFamilyTreeCollection): void {
    this.storage.setItem(STORAGE_FAMILY_TREES_KEY, JSON.stringify(collection));
  }
}

function createUniqueTreeId(name: string, existingIds: readonly string[]): string {
  const baseId = toTreeId(name);
  if (!existingIds.includes(baseId)) {
    return baseId;
  }

  let suffix = CREATE_ID_COLLISION_SUFFIX_START;
  while (existingIds.includes(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}-${suffix}`;
}

function toTreeId(name: string): string {
  const normalizedId = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalizedId || DEFAULT_TREE_ID;
}

function isStoredFamilyTree(value: unknown): value is StoredFamilyTree {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredFamilyTree>;
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.text === 'string';
}
