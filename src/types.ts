export type Gender = 'male' | 'female' | 'other' | 'unknown';

export type Language = 'en' | 'vi';

export type DiagnosticSeverity = 'error' | 'warning';

export interface ParseDiagnostic {
  readonly severity: DiagnosticSeverity;
  readonly line: number;
  readonly code: string;
  readonly message: string;
}

export interface PersonRecord {
  readonly id: string;
  readonly name: string;
  readonly gender: Gender;
  readonly born?: string;
  readonly died?: string;
  readonly note?: string;
}

export interface FamilyRecord {
  readonly id: string;
  readonly parents: readonly [string] | readonly [string, string];
  readonly children: readonly string[];
  readonly line?: number;
}

export interface FamilyTreeDocument {
  readonly people: ReadonlyMap<string, PersonRecord>;
  readonly families: ReadonlyMap<string, FamilyRecord>;
  readonly diagnostics: readonly ParseDiagnostic[];
}

export interface PersonDraft {
  readonly id: string;
  readonly name: string;
  readonly gender: Gender;
  readonly born?: string;
  readonly died?: string;
  readonly note?: string;
}

export type FamilyTreeEdit =
  | {
      readonly type: 'add-spouse';
      readonly personId: string;
      readonly spouseId: string;
      readonly spouse?: PersonDraft;
    }
  | {
      readonly type: 'add-child';
      readonly parents: readonly [string] | readonly [string, string];
      readonly childId: string;
      readonly child?: PersonDraft;
    }
  | {
      readonly type: 'upsert-person';
      readonly person: PersonDraft;
    };

export interface GenerationModel {
  readonly personGenerations: ReadonlyMap<string, number>;
  readonly personGroups: ReadonlyMap<string, string>;
  readonly groupMembers: ReadonlyMap<string, readonly string[]>;
}

export interface FocusedGraphContext {
  readonly focusPersonId: string | null;
  readonly mainPersonIds: ReadonlySet<string>;
  readonly visibleFamilyIds: ReadonlySet<string>;
  readonly hiddenPersonIds: ReadonlySet<string>;
  readonly spouseShortcutsByPersonId: ReadonlyMap<string, readonly string[]>;
}

export interface LayoutPersonNode {
  readonly id: string;
  readonly person: PersonRecord;
  readonly generation: number;
  readonly x: number;
  readonly y: number;
  readonly spouseIds: readonly string[];
}

export interface LayoutFamilyControl {
  readonly id: string;
  readonly family: FamilyRecord;
  readonly x: number;
  readonly y: number;
  readonly isCollapsed: boolean;
}

export interface LayoutEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type: 'marriage' | 'child';
}

export interface TreeLayout {
  readonly people: readonly LayoutPersonNode[];
  readonly families: readonly LayoutFamilyControl[];
  readonly edges: readonly LayoutEdge[];
}

export interface KinshipResult {
  readonly selectedPersonId: string;
  readonly hoveredPersonId: string;
  readonly selectedToHovered: string;
  readonly hoveredToSelected: string;
}
