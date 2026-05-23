import { describe, expect, it } from 'vitest';
import { describeKinship } from './kinship';
import { parseFamilyTreeText } from '../services/parser';

const KINSHIP_TEXT = `
gf:Grandfather,g=m,b=1940
gm:Grandmother,g=f,b=1942
dad:Dad,g=m,b=1970
uncle:Uncle,g=m,b=1968
aunt:Aunt,g=f,b=1975
mom:Mom,g=f,b=1972
me:Me,g=m,b=2000
sis:Sister,g=f,b=1998
cousin:Cousin,g=f,b=2004
child:Child,g=m,b=2025
gf+gm->uncle,dad,aunt
dad+mom->sis,me
aunt->cousin
me->child
`;

describe('describeKinship', () => {
  it('describes direct English relationships both ways', () => {
    const document = parseFamilyTreeText(KINSHIP_TEXT);
    const result = describeKinship(document, 'me', 'dad', 'en');

    expect(result?.selectedToHovered).toBe('father');
    expect(result?.hoveredToSelected).toBe('son');
  });

  it('describes extended English relationships', () => {
    const document = parseFamilyTreeText(KINSHIP_TEXT);

    expect(describeKinship(document, 'me', 'gf', 'en')?.selectedToHovered).toBe('grandfather');
    expect(describeKinship(document, 'me', 'aunt', 'en')?.selectedToHovered).toBe('aunt');
    expect(describeKinship(document, 'me', 'cousin', 'en')?.selectedToHovered).toBe('cousin');
  });

  it('describes northern Vietnamese relationships with best-effort age and side terms', () => {
    const document = parseFamilyTreeText(KINSHIP_TEXT);

    expect(describeKinship(document, 'me', 'dad', 'vi')?.selectedToHovered).toBe('bố');
    expect(describeKinship(document, 'me', 'sis', 'vi')?.selectedToHovered).toBe('chị');
    expect(describeKinship(document, 'me', 'gf', 'vi')?.selectedToHovered).toBe('ông nội');
    expect(describeKinship(document, 'me', 'uncle', 'vi')?.selectedToHovered).toBe('bác');
    expect(describeKinship(document, 'me', 'aunt', 'vi')?.selectedToHovered).toBe('cô');
    expect(describeKinship(document, 'me', 'cousin', 'vi')?.selectedToHovered).toBe('em họ');
  });
});
