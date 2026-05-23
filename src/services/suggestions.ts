import { FamilyTreeDocument, PersonRecord } from '../types';

const ID_TOKEN_PATTERN = /[A-Za-z0-9_.-]/;
const RELATIONSHIP_CONTEXT_PATTERN = /(^|[+,]|->)\s*$/;

export interface DslTokenReplacement {
  readonly text: string;
  readonly caretPosition: number;
}

export interface DslIdToken {
  readonly query: string;
  readonly start: number;
  readonly end: number;
}

export function suggestPeople(document: FamilyTreeDocument, query: string, limit = 8): readonly PersonRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return Array.from(document.people.values())
    .map((person, index) => ({ person, index, score: getSuggestionScore(person, normalizedQuery) }))
    .filter((candidate) => candidate.score !== null)
    .sort((first, second) => (first.score ?? 0) - (second.score ?? 0) || first.index - second.index)
    .slice(0, limit)
    .map((candidate) => candidate.person);
}

export function getCurrentDslIdToken(text: string, caretPosition: number): DslIdToken | null {
  const lineStart = text.lastIndexOf('\n', Math.max(0, caretPosition - 1)) + 1;
  const nextLineBreak = text.indexOf('\n', caretPosition);
  const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
  const line = text.slice(lineStart, lineEnd);
  const relativeCaret = caretPosition - lineStart;

  if (isPersonDefinitionContext(line, relativeCaret)) {
    return null;
  }

  let tokenStart = relativeCaret;
  while (tokenStart > 0 && ID_TOKEN_PATTERN.test(line[tokenStart - 1])) {
    tokenStart -= 1;
  }

  let tokenEnd = relativeCaret;
  while (tokenEnd < line.length && ID_TOKEN_PATTERN.test(line[tokenEnd]) && !isArrowStart(line, tokenEnd)) {
    tokenEnd += 1;
  }

  const contextBeforeToken = line.slice(0, tokenStart);
  if (!RELATIONSHIP_CONTEXT_PATTERN.test(contextBeforeToken)) {
    return null;
  }

  return {
    query: line.slice(tokenStart, tokenEnd),
    start: lineStart + tokenStart,
    end: lineStart + tokenEnd
  };
}

function isArrowStart(line: string, index: number): boolean {
  return line[index] === '-' && line[index + 1] === '>';
}

export function replaceCurrentDslIdToken(
  text: string,
  caretPosition: number,
  selectedPersonId: string
): DslTokenReplacement | null {
  const token = getCurrentDslIdToken(text, caretPosition);
  if (!token) {
    return null;
  }

  const nextText = `${text.slice(0, token.start)}${selectedPersonId}${text.slice(token.end)}`;
  return {
    text: nextText,
    caretPosition: token.start + selectedPersonId.length
  };
}

function getSuggestionScore(person: PersonRecord, normalizedQuery: string): number | null {
  const id = person.id.toLowerCase();
  const name = person.name.toLowerCase();
  if (id.startsWith(normalizedQuery)) {
    return 0;
  }

  if (id.includes(normalizedQuery)) {
    return 1;
  }

  if (name.startsWith(normalizedQuery)) {
    return 2;
  }

  if (name.includes(normalizedQuery)) {
    return 3;
  }

  return null;
}

function isPersonDefinitionContext(line: string, relativeCaret: number): boolean {
  const colonIndex = line.indexOf(':');
  const arrowIndex = line.indexOf('->');
  return colonIndex !== -1 && colonIndex < relativeCaret && (arrowIndex === -1 || colonIndex < arrowIndex);
}
