export const DEFAULT_TREE_TEXT = `# people
gf:John Smith,g=m,b=1950,d=2020
gm:Mary Smith,g=f,b=1952,d=2021
f:Robert Smith,g=m,b=1975
u:David Smith,g=m,b=1978
aunt:Karen Smith,g=f,b=1981
uncleInLaw:Paul Nguyen,g=m,b=1979

m:Linda Jones,g=f,b=1977
me:Alex Smith,g=m,b=2000
sis:Chloe Smith,g=f,b=2003
daughter:Maya Smith,g=f,b=2005
step:Ana Lee,g=f,b=1982
half:Noah Smith,g=m,b=2010
cousin:Lan Nguyen,g=f,b=2004
crossKid:River Smith,g=o,b=2028
overlapSon:Theo Smith,g=m,b=2026
overlapDaughter:Ivy Smith,g=f,b=2029
solo:June Carter,g=f,b=1988
soloChild:Kai Carter,g=u,b=2016

# relationships
gf+gm->f,u,aunt

f+m->me,sis,daughter
aunt+uncleInLaw->cousin
f+step->half
me+cousin->crossKid
solo->soloChild

# stress case: overlapping roles, e.g. spouse and parent at the same time
f+daughter->overlapSon,overlapDaughter
`;

export const STORAGE_KEY = 'family-tree-v2-text';
export const STORAGE_FAMILY_TREES_KEY = 'family-tree-v2-family-trees';
export const STORAGE_SITE_CONFIGURATION_KEY = 'family-tree-v2-site-configuration';
export const STORAGE_VIEW_MODE_KEY = 'family-tree-v2-view-mode';
export const STORAGE_LANGUAGE_KEY = 'family-tree-v2-language';
export const EXPORT_FILE_NAME = 'family-tree.family.txt';

export const DEFAULT_FAMILY_TREE_NAME = 'Family Tree';
export const NEW_TREE_TEXT = '# people\n\n# relationships\n';
export const PERSON_NODE_WIDTH = 172;
export const PERSON_NODE_HEIGHT = 88;
export const MIN_PERSON_NODE_HEIGHT = 72;
export const MAX_PERSON_NODE_HEIGHT = 180;
export const PERSON_NODE_HEIGHT_STEP = 8;
export const MIN_PERSON_NODE_WIDTH = 140;
export const MAX_PERSON_NODE_WIDTH = 320;
export const PERSON_NODE_WIDTH_STEP = 8;
export const PERSON_HORIZONTAL_GAP = 72;
export const MIN_PERSON_HORIZONTAL_GAP = 32;
export const MAX_PERSON_HORIZONTAL_GAP = 220;
export const PERSON_HORIZONTAL_GAP_STEP = 8;
export const SPOUSE_HORIZONTAL_GAP = 32;
export const GENERATION_VERTICAL_GAP = 190;
export const CANVAS_PADDING_X = 96;
export const CANVAS_PADDING_Y = 72;

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
