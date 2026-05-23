import { describe, expect, it } from 'vitest';
import { buildGenerationModel } from './generation';
import { buildTreeLayout, sortChildrenByAge } from './layout';
import { collectHiddenPersonIds, findAncestorFamilyIds } from './visibility';
import { PERSON_HORIZONTAL_GAP, PERSON_NODE_WIDTH } from '../constants';
import { parseFamilyTreeText } from '../services/parser';

describe('family tree domain layout', () => {
  it('keeps spouses on the same generation row and children below parents', () => {
    const document = parseFamilyTreeText(`
a:Alpha,g=u,b=1950
b:Beta,g=u,b=1952
c:Child,g=u,b=1975
a+b->c
`);
    const generations = buildGenerationModel(document);

    expect(generations.personGenerations.get('a')).toBe(generations.personGenerations.get('b'));
    expect(generations.personGenerations.get('c')).toBe((generations.personGenerations.get('a') ?? 0) + 1);
  });

  it('sorts siblings oldest to youngest with text order fallback', () => {
    const document = parseFamilyTreeText(`
p:Parent,g=u
a:Youngest,g=u,b=2003
b:Oldest,g=u,b=1999
c:Unknown,g=u
d:AlsoUnknown,g=u
p->a,b,c,d
`);
    const family = document.families.get('single:p');

    expect(family ? sortChildrenByAge(document, family) : []).toEqual(['b', 'a', 'c', 'd']);
  });

  it('hides collapsed family descendants', () => {
    const document = parseFamilyTreeText(`
p:Parent,g=u
c:Child,g=u
g:Grandchild,g=u
p->c
c->g
`);
    const hiddenIds = collectHiddenPersonIds(document, new Set(['single:p']));

    expect(hiddenIds.has('c')).toBe(true);
    expect(hiddenIds.has('g')).toBe(true);
  });

  it('finds ancestor families for search reveal', () => {
    const document = parseFamilyTreeText(`
p:Parent,g=u
c:Child,g=u
g:Grandchild,g=u
p->c
c->g
`);

    expect(Array.from(findAncestorFamilyIds(document, 'g')).sort()).toEqual(['single:c', 'single:p']);
  });

  it('places same-generation nodes on one row with minimum spacing', async () => {
    const document = parseFamilyTreeText(`
p:Parent,g=u
a:Older,g=u,b=1999
b:Younger,g=u,b=2001
p->b,a
`);
    const layout = await buildTreeLayout(document, new Set());
    const older = layout.people.find((node) => node.id === 'a');
    const younger = layout.people.find((node) => node.id === 'b');

    expect(older?.y).toBe(younger?.y);
    expect((older?.x ?? 0)).toBeLessThan(younger?.x ?? 0);
    expect(Math.abs((younger?.x ?? 0) - (older?.x ?? 0))).toBeGreaterThanOrEqual(PERSON_NODE_WIDTH + PERSON_HORIZONTAL_GAP);
  });
});
