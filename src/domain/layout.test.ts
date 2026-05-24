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

  it('places a node descendant toggle and checked spouse line controls by default', async () => {
    const document = parseFamilyTreeText(`
a:Alpha,g=u
s1:Spouse One,g=u
s2:Spouse Two,g=u
c1:Child One,g=u
c2:Child Two,g=u
c3:Child Three,g=u
c4:Child Four,g=u
a+s1->c1,c2
a+s2->c3,c4
`);
    const layout = await buildTreeLayout(document, new Set(), 'a');
    const alpha = layout.people.find((person) => person.id === 'a');
    const shortcutTargets = alpha?.spouseShortcuts.map((shortcut) => {
      return `${shortcut.personId}:${shortcut.family.id}:${shortcut.isChecked ? 'on' : 'off'}`;
    }) ?? [];
    const floatingFamilyIds = layout.families.map((family) => family.family.id);

    expect(alpha?.childLineToggle?.isCollapsed).toBe(false);
    expect(shortcutTargets).toEqual(['s1:couple:a+s1:on', 's2:couple:a+s2:on']);
    expect(floatingFamilyIds).not.toContain('couple:a+s1');
    expect(floatingFamilyIds).not.toContain('couple:a+s2');
  });

  it('places a no-spouse descendant toggle inside the parent node', async () => {
    const document = parseFamilyTreeText(`
p:Parent,g=u
c:Child,g=u
p->c
`);
    const layout = await buildTreeLayout(document, new Set(), 'p');
    const parent = layout.people.find((person) => person.id === 'p');

    expect(parent?.childLineToggle).toEqual({ personId: 'p', isCollapsed: false });
    expect(layout.families).toHaveLength(0);
  });

  it('collapses all child lines from one person node', async () => {
    const document = parseFamilyTreeText(`
a:Alpha,g=u
s1:Spouse One,g=u
s2:Spouse Two,g=u
c1:Child One,g=u
c2:Child Two,g=u
c3:Child Three,g=u
c4:Child Four,g=u
a+s1->c1,c2
a+s2->c3,c4
`);
    const layout = await buildTreeLayout(document, new Set(), 'a', new Set(['a']));
    const visiblePeople = layout.people.map((person) => person.id);

    expect(visiblePeople).not.toContain('c1');
    expect(visiblePeople).not.toContain('c2');
    expect(visiblePeople).not.toContain('c3');
    expect(visiblePeople).not.toContain('c4');
  });

  it('collapses descendants for one spouse family without hiding another spouse family', async () => {
    const document = parseFamilyTreeText(`
a:Alpha,g=u
s1:Spouse One,g=u
s2:Spouse Two,g=u
c1:Child One,g=u
c2:Child Two,g=u
c3:Child Three,g=u
c4:Child Four,g=u
a+s1->c1,c2
a+s2->c3,c4
`);
    const layout = await buildTreeLayout(document, new Set(['couple:a+s1']), 'a');
    const visiblePeople = layout.people.map((person) => person.id);

    expect(visiblePeople).not.toContain('c1');
    expect(visiblePeople).not.toContain('c2');
    expect(visiblePeople).toContain('c3');
    expect(visiblePeople).toContain('c4');
  });
});
