import { describe, expect, it } from 'vitest';
import { buildTreeLayout } from './layout';
import {
  buildFocusedGraphContext,
  collectFocusedHiddenPersonIds,
  findInitialFocusPersonId
} from './visibility';
import { parseFamilyTreeText } from '../services/parser';

const SPOUSE_ANCESTRY_TEXT = `
pgf:Paternal Grandpa,g=m
dad:Dad,g=m
mom:Mom,g=f
mgf:Maternal Grandpa,g=m
me:Me,g=u
sis:Sister,g=f
pgf->dad
mgf->mom
dad+mom->me,sis
`;

describe('focused graph context', () => {
  it('uses the deepest descendant as the initial focus', () => {
    const document = parseFamilyTreeText(SPOUSE_ANCESTRY_TEXT);

    expect(findInitialFocusPersonId(document)).toBe('sis');
  });

  it('keeps a spouse as a shortcut in another lineage context', () => {
    const document = parseFamilyTreeText(SPOUSE_ANCESTRY_TEXT);
    const context = buildFocusedGraphContext(document, 'me', new Set());

    expect(context.mainPersonIds.has('dad')).toBe(true);
    expect(context.mainPersonIds.has('me')).toBe(true);
    expect(context.mainPersonIds.has('mom')).toBe(false);
    expect(context.mainPersonIds.has('mgf')).toBe(false);
    expect(context.spouseShortcutsByPersonId.get('dad')).toEqual(['mom']);
  });

  it('switches visible ancestry when the spouse becomes focused', async () => {
    const document = parseFamilyTreeText(SPOUSE_ANCESTRY_TEXT);
    const layout = await buildTreeLayout(document, new Set(), 'mom');
    const visibleIds = layout.people.map((node) => node.id);

    expect(visibleIds).toContain('mom');
    expect(visibleIds).toContain('mgf');
    expect(visibleIds).not.toContain('dad');
    expect(layout.people.find((node) => node.id === 'mom')?.spouseShortcuts.map((shortcut) => shortcut.personId)).toEqual(['dad']);
  });

  it('hides collapsed descendants in the focused graph only for that family line', () => {
    const document = parseFamilyTreeText(SPOUSE_ANCESTRY_TEXT);
    const hiddenIds = collectFocusedHiddenPersonIds(document, 'me', new Set(['couple:dad+mom']));

    expect(hiddenIds.has('me')).toBe(true);
    expect(hiddenIds.has('sis')).toBe(true);
    expect(hiddenIds.has('dad')).toBe(false);
  });

  it('keeps visible ancestors when the focused descendant is hidden by collapse', () => {
    const document = parseFamilyTreeText(`
p:Parent,g=u
c:Child,g=u
g:Grandchild,g=u
p->c
c->g
`);
    const context = buildFocusedGraphContext(document, 'g', new Set(['single:c']));

    expect(context.mainPersonIds.has('c')).toBe(true);
    expect(context.mainPersonIds.has('p')).toBe(true);
    expect(context.mainPersonIds.has('g')).toBe(false);
    expect(context.visibleFamilyIds.has('single:c')).toBe(true);
  });
});
