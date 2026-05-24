import { describe, expect, it } from 'vitest';
import { importLegacyFamilyText, looksLikeLegacyFamilyText } from './legacy-importer';
import { parseFamilyTreeText, serializeFamilyTreeDocument } from './parser';
import { DEFAULT_TREE_TEXT } from '../constants';

describe('parseFamilyTreeText', () => {
  it('parses compact people and relationship lines', () => {
    const document = parseFamilyTreeText(`
gf:John Smith,g=m,b=1950
gm:Mary Smith,g=f,b=1952
f:Robert Smith,g=m,b=1975
u:David Smith,g=m,b=1978
gf+gm->f,u
`);

    expect(document.people.get('gf')?.name).toBe('John Smith');
    expect(document.people.get('gm')?.gender).toBe('female');
    expect(document.families.get('couple:gf+gm')?.children).toEqual(['f', 'u']);
    expect(document.diagnostics).toEqual([]);
  });

  it('accepts spaces and serializes back to compact format', () => {
    const document = parseFamilyTreeText(`
      a : Ada Lovelace , g = f , b = 1815
      b: Charles Babbage,g=m
      a + b -> c
      c: Child,g=u
    `);

    expect(serializeFamilyTreeDocument(document)).toContain('a:Ada Lovelace,g=f,b=1815');
    expect(serializeFamilyTreeDocument(document)).toContain('a+b->c');
  });

  it('merges duplicate family lines and reports a warning', () => {
    const document = parseFamilyTreeText(`
a:Parent A,g=u
b:Parent B,g=u
c:Child C,g=u
d:Child D,g=u
a+b->c
b+a->d
`);

    expect(document.families.get('couple:a+b')?.children).toEqual(['c', 'd']);
    expect(document.diagnostics.some((diagnostic) => diagnostic.code === 'duplicate-family')).toBe(true);
  });

  it('reports duplicate people, unknown references, and cycles', () => {
    const document = parseFamilyTreeText(`
a:Alpha,g=u
a:Duplicate,g=u
b:Beta,g=u
a+b->missing
b->a
a->b
`);

    expect(document.diagnostics.some((diagnostic) => diagnostic.code === 'duplicate-person')).toBe(true);
    expect(document.diagnostics.some((diagnostic) => diagnostic.code === 'unknown-reference')).toBe(true);
    expect(document.diagnostics.some((diagnostic) => diagnostic.code === 'cycle')).toBe(true);
  });

  it('keeps the default stress sample parseable', () => {
    const document = parseFamilyTreeText(DEFAULT_TREE_TEXT);

    expect(document.people.size).toBeGreaterThan(10);
    expect(document.families.size).toBeGreaterThan(5);
    expect(document.diagnostics).toEqual([]);
  });
});

describe('legacy importer', () => {
  it('detects and converts v1 person syntax', () => {
    const legacyText = `
GF: John Smith, M, 1950
GM: Mary Smith, F, 1952
GF + GM -> F
F: Robert Smith, M, 1975
`;

    expect(looksLikeLegacyFamilyText(legacyText)).toBe(true);
    expect(importLegacyFamilyText(legacyText)).toContain('GF:John Smith,g=m,b=1950');
    expect(importLegacyFamilyText(legacyText)).toContain('GF+GM->F');
  });
});
