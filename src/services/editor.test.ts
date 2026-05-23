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

  it('creates deterministic unique ids from names', () => {
    expect(createUniquePersonId('Alex Smith', new Set(['alexsmith']))).toBe('alexsmith2');
  });
});
