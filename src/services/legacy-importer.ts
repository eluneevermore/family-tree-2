import { Gender } from '../types';

const COMMENT_PREFIX = '#';
const RELATIONSHIP_ARROW = '->';
const PERSON_SEPARATOR = ':';
const FIELD_SEPARATOR = ',';
const SPOUSE_SEPARATOR = '+';

export function looksLikeLegacyFamilyText(text: string): boolean {
  return text.split(/\r?\n/).some((line) => isLegacyPersonLine(line.trim()));
}

export function importLegacyFamilyText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => convertLegacyLine(line))
    .join('\n')
    .trimEnd() + '\n';
}

function convertLegacyLine(rawLine: string): string {
  const line = rawLine.trim();
  if (!line || line.startsWith(COMMENT_PREFIX)) {
    return rawLine;
  }

  if (isLegacyPersonLine(line)) {
    return convertLegacyPersonLine(line);
  }

  if (line.includes(RELATIONSHIP_ARROW) || line.includes(SPOUSE_SEPARATOR)) {
    return line.replace(/\s+/g, '');
  }

  return rawLine;
}

function isLegacyPersonLine(line: string): boolean {
  if (!line.includes(PERSON_SEPARATOR) || line.includes(RELATIONSHIP_ARROW)) {
    return false;
  }

  const payload = line.slice(line.indexOf(PERSON_SEPARATOR) + 1);
  const fields = payload.split(FIELD_SEPARATOR).map((field) => field.trim());
  return fields.length >= 2 && !fields[1].includes('=');
}

function convertLegacyPersonLine(line: string): string {
  const separatorIndex = line.indexOf(PERSON_SEPARATOR);
  const id = line.slice(0, separatorIndex).trim();
  const fields = line.slice(separatorIndex + 1).split(FIELD_SEPARATOR).map((field) => field.trim());
  const [name, rawGender, born] = fields;
  const attributes = [`g=${formatLegacyGender(rawGender)}`, born ? `b=${born}` : null].filter(
    (attribute): attribute is string => Boolean(attribute)
  );
  return `${id}:${name}${attributes.length > 0 ? `,${attributes.join(',')}` : ''}`;
}

function formatLegacyGender(value: string | undefined): string {
  const gender = parseLegacyGender(value);
  if (gender === 'male') {
    return 'm';
  }

  if (gender === 'female') {
    return 'f';
  }

  if (gender === 'other') {
    return 'o';
  }

  return 'u';
}

function parseLegacyGender(value: string | undefined): Gender {
  const normalizedValue = value?.toLowerCase() ?? '';
  if (normalizedValue === 'm' || normalizedValue === 'male') {
    return 'male';
  }

  if (normalizedValue === 'f' || normalizedValue === 'female') {
    return 'female';
  }

  if (normalizedValue === 'other' || normalizedValue === 'o') {
    return 'other';
  }

  return 'unknown';
}
