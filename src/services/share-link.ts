export const SHARE_QUERY_PARAMETER = 'share';

const BASE64_URL_TO_STANDARD_REPLACEMENTS = [
  ['-', '+'],
  ['_', '/']
] as const;
const BASE64_STANDARD_TO_URL_REPLACEMENTS = [
  ['+', '-'],
  ['/', '_']
] as const;
const BASE64_BLOCK_SIZE = 4;
const INVALID_BASE64_REMAINDER = 1;

export function encodeSharedTreeText(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binaryText = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

  return BASE64_STANDARD_TO_URL_REPLACEMENTS.reduce(
    (encodedText, [from, to]) => encodedText.replaceAll(from, to),
    btoa(binaryText)
  ).replace(/=+$/u, '');
}

export function decodeSharedTreeText(encodedText: string): string | null {
  if (encodedText.length % BASE64_BLOCK_SIZE === INVALID_BASE64_REMAINDER) {
    return null;
  }

  try {
    const standardBase64 = restoreBase64Padding(BASE64_URL_TO_STANDARD_REPLACEMENTS.reduce(
      (text, [from, to]) => text.replaceAll(from, to),
      encodedText
    ));
    const binaryText = atob(standardBase64);
    const bytes = Uint8Array.from(binaryText, (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    console.error('Failed to decode shared family tree text.', error);
    return null;
  }
}

export function createSharedTreeUrl(text: string, href: string): string {
  const url = new URL(href);
  url.searchParams.set(SHARE_QUERY_PARAMETER, encodeSharedTreeText(text));
  return url.toString();
}

export function readSharedTreeTextFromSearch(search: string): string | null {
  const encodedText = new URLSearchParams(search).get(SHARE_QUERY_PARAMETER);
  return encodedText === null ? null : decodeSharedTreeText(encodedText);
}

export function removeSharedTreeParameterFromUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(SHARE_QUERY_PARAMETER);
  return `${url.pathname}${url.search}${url.hash}`;
}

function restoreBase64Padding(base64Text: string): string {
  const missingPadding = (BASE64_BLOCK_SIZE - (base64Text.length % BASE64_BLOCK_SIZE)) % BASE64_BLOCK_SIZE;
  return `${base64Text}${'='.repeat(missingPadding)}`;
}
