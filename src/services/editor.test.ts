import { describe, expect, it } from 'vitest';
import { applyFamilyTreeEdit, createUniquePersonId } from './editor';
import { parseFamilyTreeText } from './parser';

describe('applyFamilyTreeEdit', () => {
  it('adds a spouse and serializes the compact relationship', () => {
    const text = applyFamilyTreeEdit('a:Alpha,g=u\n', {
      type: 'add-spouse',
      personId: 'a',
      spouseId: 'b',
      spouse: { id: 'b', name: 'Beta', gender: 'female' }
    });

    expect(text).toContain('b:Beta,g=f');
    expect(text).toContain('a+b');
  });

  it('adds a child to an existing couple', () => {
    const text = applyFamilyTreeEdit('a:Alpha,g=u\nb:Beta,g=u\na+b\n', {
      type: 'add-child',
      parents: ['a', 'b'],
      childId: 'c',
      child: { id: 'c', name: 'Child', gender: 'unknown', born: '2000' }
    });
    const document = parseFamilyTreeText(text);

    expect(document.families.get('couple:a+b')?.children).toEqual(['c']);
  });

  it('adds a parent and reuses a single-parent family', () => {
    const text = applyFamilyTreeEdit('a:Alpha,g=u\nb:Beta,g=u\nc:Child,g=u\na->c\n', {
      type: 'add-parent',
      childId: 'c',
      parentId: 'b'
    });
    const document = parseFamilyTreeText(text);

    expect(document.families.has('single:a')).toBe(false);
    expect(document.families.get('couple:a+b')?.children).toEqual(['c']);
  });

  it('adds a parent as a new single-parent family when existing parents are full', () => {
    const text = applyFamilyTreeEdit('a:Alpha,g=u\nb:Beta,g=u\nc:Child,g=u\na+b->c\n', {
      type: 'add-parent',
      childId: 'c',
      parentId: 'd',
      parent: { id: 'd', name: 'Delta', gender: 'unknown' }
    });
    const document = parseFamilyTreeText(text);

    expect(document.people.get('d')?.name).toBe('Delta');
    expect(document.families.get('single:d')?.children).toEqual(['c']);
  });

  it('creates deterministic unique ids from names', () => {
    expect(createUniquePersonId('Alex Smith', new Set(['alexsmith']))).toBe('alexsmith2');
  });
});
