import { describe, expect, it } from 'vitest';
import { decodeSharedTreeText, encodeSharedTreeText } from './share-link';

describe('share-link', () => {
  it('round-trips shared tree text with Vietnamese characters', () => {
    const text = 'a:Nguyễn Văn A,g=m,n=ghi chú\nb:Trần Thị B,g=f';

    expect(decodeSharedTreeText(encodeSharedTreeText(text))).toBe(text);
  });

  it('returns null for invalid shared text payloads', () => {
    expect(decodeSharedTreeText('not valid base64!')).toBeNull();
  });
});
