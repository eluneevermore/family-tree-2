export const DEFAULT_TREE_TEXT = `# people
gf:John Smith,g=m,b=1950
gm:Mary Smith,g=f,b=1952
f:Robert Smith,g=m,b=1975
u:David Smith,g=m,b=1978

# relationships
gf+gm->f,u

m:Linda Jones,g=f,b=1977
me:Alex Smith,g=m,b=2000
sis:Chloe Smith,g=f,b=2003

f+m->me,sis
`;

export const STORAGE_KEY = 'family-tree-v2-text';
export const STORAGE_VIEW_MODE_KEY = 'family-tree-v2-view-mode';
export const STORAGE_LANGUAGE_KEY = 'family-tree-v2-language';
export const EXPORT_FILE_NAME = 'family-tree.family.txt';

export const PERSON_NODE_WIDTH = 172;
export const PERSON_NODE_HEIGHT = 88;
export const PERSON_HORIZONTAL_GAP = 72;
export const SPOUSE_HORIZONTAL_GAP = 32;
export const GENERATION_VERTICAL_GAP = 190;
export const CANVAS_PADDING_X = 96;
export const CANVAS_PADDING_Y = 72;
export const FAMILY_TOGGLE_OFFSET_Y = 92;

export const GENDER_COLORS = {
  male: '#2563eb',
  female: '#db2777',
  other: '#7c3aed',
  unknown: '#64748b'
} as const;

export const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  unknown: 'Unknown'
} as const;
