import { describe, expect, it } from 'vitest';
import { parseFamilyTreeText } from './parser';
import { replaceCurrentDslIdToken, suggestPeople } from './suggestions';

describe('suggestPeople', () => {
  it('prioritizes id matches before name matches', () => {
    const document = parseFamilyTreeText(`
dad:Robert,g=m
mom:Linda,g=f
robertjr:Junior,g=m
`);

    expect(suggestPeople(document, 'ro').map((person) => person.id)).toEqual(['robertjr', 'dad']);
  });
});

describe('replaceCurrentDslIdToken', () => {
  it('replaces the current relationship id token', () => {
    const text = 'dad+mo->child';
    const result = replaceCurrentDslIdToken(text, 6, 'mom');

    expect(result).toEqual({ text: 'dad+mom->child', caretPosition: 7 });
  });

  it('does not replace text inside a person definition name', () => {
    expect(replaceCurrentDslIdToken('dad:Robert', 5, 'mom')).toBeNull();
  });
});
