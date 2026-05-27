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

const OVERLAPPING_KINSHIP_TEXT = `
dad:Father,g=m,b=1960
mom:Mother,g=f,b=1962
daughter:Daughter,g=f,b=1984
child:Child,g=m,b=2008
dad+mom->daughter
dad+daughter->child
`;

const VIETNAMESE_EXTENDED_KINSHIP_TEXT = `
greatGreatGrandfather:Kỵ,g=m
greatGrandfather:Cụ Ông,g=m
greatGrandmother:Cụ Bà,g=f
pgf:Ông Nội,g=m
pgm:Bà Nội,g=f
mgf:Ông Ngoại,g=m
mgm:Bà Ngoại,g=f
dadOlderBrother:Bác Trai,g=m
dadOlderBrotherWife:Bác Gái,g=f
dad:Dad,g=m
dadYoungerBrother:Chú,g=m
dadYoungerBrotherWife:Thím,g=f
dadYoungerSister:Cô,g=f
dadYoungerSisterHusband:Dượng Cô,g=m
momOlderSister:Bác Gái Mẹ,g=f
momOlderSisterHusband:Bác Trai Mẹ,g=m
mom:Mom,g=f
momYoungerBrother:Cậu,g=m
momYoungerBrotherWife:Mợ,g=f
momYoungerSister:Dì,g=f
momYoungerSisterHusband:Dượng Dì,g=m
olderBrother:Older Brother,g=m
olderBrotherWife:Older Brother Wife,g=f
olderSister:Older Sister,g=f
olderSisterHusband:Older Sister Husband,g=m
me:Me,g=m,b=2000
youngerBrother:Younger Brother,g=m
youngerBrotherWife:Younger Brother Wife,g=f
youngerSister:Younger Sister,g=f
youngerSisterHusband:Younger Sister Husband,g=m
olderMaleCousin:Older Male Cousin,g=m,b=1990
olderMaleCousinWife:Older Male Cousin Wife,g=f
olderFemaleCousin:Older Female Cousin,g=f,b=1992
olderFemaleCousinHusband:Older Female Cousin Husband,g=m
youngerCousin:Younger Cousin,g=f,b=2005
youngerBranchMaleCousin:Younger Branch Male Cousin,g=m,b=1990
wifeDad:Wife Dad,g=m
wifeMom:Wife Mom,g=f
wifePgf:Wife Paternal Grandfather,g=m
wifePgm:Wife Paternal Grandmother,g=f
wifeMgf:Wife Maternal Grandfather,g=m
wifeMgm:Wife Maternal Grandmother,g=f
wifeDadOlderBrother:Wife Dad Older Brother,g=m
wifeDadOlderBrotherWife:Wife Dad Older Brother Wife,g=f
wifeDadYoungerBrother:Wife Dad Younger Brother,g=m
wifeDadYoungerBrotherWife:Wife Dad Younger Brother Wife,g=f
wifeDadYoungerSister:Wife Dad Younger Sister,g=f
wifeDadYoungerSisterHusband:Wife Dad Younger Sister Husband,g=m
wifeMomOlderSister:Wife Mom Older Sister,g=f
wifeMomOlderSisterHusband:Wife Mom Older Sister Husband,g=m
wifeMomYoungerBrother:Wife Mom Younger Brother,g=m
wifeMomYoungerBrotherWife:Wife Mom Younger Brother Wife,g=f
wifeMomYoungerSister:Wife Mom Younger Sister,g=f
wifeMomYoungerSisterHusband:Wife Mom Younger Sister Husband,g=m
wifeOlderBrother:Wife Older Brother,g=m
wifeOlderSister:Wife Older Sister,g=f
wife:Wife,g=f,b=2001
wifeYoungerSibling:Wife Younger Sibling,g=f
wifeSister:Wife Sister,g=f,b=2004
wifeBrother:Wife Brother,g=m,b=2006
olderCoInLaw:Older Co In Law,g=m,b=1995
youngerCoInLaw:Younger Co In Law,g=m,b=2005
son:Son,g=m
daughter:Daughter,g=f
daughterInLawDad:Daughter In Law Dad,g=m
daughterInLawMom:Daughter In Law Mom,g=f
daughterInLaw:Daughter In Law,g=f
sonInLawDad:Son In Law Dad,g=m
sonInLawMom:Son In Law Mom,g=f
sonInLaw:Son In Law,g=m
grandson:Grandson,g=m
grandsonWifeDad:Grandson Wife Dad,g=m
grandsonWifeMom:Grandson Wife Mom,g=f
grandsonWifePgf:Grandson Wife Paternal Grandfather,g=m
grandsonWifePgm:Grandson Wife Paternal Grandmother,g=f
grandsonWifeDadOlderBrother:Grandson Wife Dad Older Brother,g=m
grandsonWifeDadOlderBrotherWife:Grandson Wife Dad Older Brother Wife,g=f
grandsonWifeDadYoungerBrother:Grandson Wife Dad Younger Brother,g=m
grandsonWifeDadYoungerBrotherWife:Grandson Wife Dad Younger Brother Wife,g=f
grandsonWifeDadYoungerSister:Grandson Wife Dad Younger Sister,g=f
grandsonWifeDadYoungerSisterHusband:Grandson Wife Dad Younger Sister Husband,g=m
grandsonWife:Grandson Wife,g=f
granddaughter:Granddaughter,g=f
granddaughterHusbandDad:Granddaughter Husband Dad,g=m
granddaughterHusbandMom:Granddaughter Husband Mom,g=f
granddaughterHusbandMgf:Granddaughter Husband Maternal Grandfather,g=m
granddaughterHusbandMgm:Granddaughter Husband Maternal Grandmother,g=f
granddaughterHusbandMomYoungerBrother:Granddaughter Husband Mom Younger Brother,g=m
granddaughterHusbandMomYoungerBrotherWife:Granddaughter Husband Mom Younger Brother Wife,g=f
granddaughterHusbandMomYoungerSister:Granddaughter Husband Mom Younger Sister,g=f
granddaughterHusbandMomYoungerSisterHusband:Granddaughter Husband Mom Younger Sister Husband,g=m
granddaughterHusband:Granddaughter Husband,g=m
greatGrandchild:Great Grandchild,g=f
greatGreatGrandfather->greatGrandfather
greatGrandfather+greatGrandmother->pgf
pgf+pgm->dadOlderBrother,dad,dadYoungerBrother,dadYoungerSister
mgf+mgm->momOlderSister,mom,momYoungerBrother,momYoungerSister
dadOlderBrother+dadOlderBrotherWife->olderMaleCousin,olderFemaleCousin,youngerCousin
olderMaleCousin+olderMaleCousinWife
olderFemaleCousin+olderFemaleCousinHusband
dadYoungerBrother+dadYoungerBrotherWife->youngerBranchMaleCousin
dadYoungerSister+dadYoungerSisterHusband
momOlderSister+momOlderSisterHusband
momYoungerBrother+momYoungerBrotherWife
momYoungerSister+momYoungerSisterHusband
dad+mom->olderBrother,olderSister,me,youngerBrother,youngerSister
olderBrother+olderBrotherWife
olderSister+olderSisterHusband
youngerBrother+youngerBrotherWife
youngerSister+youngerSisterHusband
wifePgf+wifePgm->wifeDadOlderBrother,wifeDad,wifeDadYoungerBrother,wifeDadYoungerSister
wifeMgf+wifeMgm->wifeMomOlderSister,wifeMom,wifeMomYoungerBrother,wifeMomYoungerSister
wifeDadOlderBrother+wifeDadOlderBrotherWife
wifeDadYoungerBrother+wifeDadYoungerBrotherWife
wifeDadYoungerSister+wifeDadYoungerSisterHusband
wifeMomOlderSister+wifeMomOlderSisterHusband
wifeMomYoungerBrother+wifeMomYoungerBrotherWife
wifeMomYoungerSister+wifeMomYoungerSisterHusband
wifeDad+wifeMom->wifeOlderBrother,wifeOlderSister,wife,wifeYoungerSibling,wifeSister,wifeBrother
me+wife->son,daughter
wifeSister+olderCoInLaw
wifeBrother+youngerCoInLaw
daughterInLawDad+daughterInLawMom->daughterInLaw
son+daughterInLaw->grandson
sonInLawDad+sonInLawMom->sonInLaw
daughter+sonInLaw->granddaughter
grandson->greatGrandchild
grandsonWifePgf+grandsonWifePgm->grandsonWifeDadOlderBrother,grandsonWifeDad,grandsonWifeDadYoungerBrother,grandsonWifeDadYoungerSister
grandsonWifeDadOlderBrother+grandsonWifeDadOlderBrotherWife
grandsonWifeDadYoungerBrother+grandsonWifeDadYoungerBrotherWife
grandsonWifeDadYoungerSister+grandsonWifeDadYoungerSisterHusband
grandsonWifeDad+grandsonWifeMom->grandsonWife
grandson+grandsonWife
granddaughterHusbandMgf+granddaughterHusbandMgm->granddaughterHusbandMom,granddaughterHusbandMomYoungerBrother,granddaughterHusbandMomYoungerSister
granddaughterHusbandMomYoungerBrother+granddaughterHusbandMomYoungerBrotherWife
granddaughterHusbandMomYoungerSister+granddaughterHusbandMomYoungerSisterHusband
granddaughterHusbandDad+granddaughterHusbandMom->granddaughterHusband
granddaughter+granddaughterHusband
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
    expect(describeKinship(document, 'me', 'sis', 'vi')?.selectedToHovered).toBe('chị ruột');
    expect(describeKinship(document, 'me', 'gf', 'vi')?.selectedToHovered).toBe('ông nội');
    expect(describeKinship(document, 'me', 'uncle', 'vi')?.selectedToHovered).toBe('bác trai');
    expect(describeKinship(document, 'me', 'aunt', 'vi')?.selectedToHovered).toBe('cô');
    expect(describeKinship(document, 'me', 'cousin', 'vi')?.selectedToHovered).toBe('em họ');
  });

  it('describes multiple English relationships when roles overlap', () => {
    const document = parseFamilyTreeText(OVERLAPPING_KINSHIP_TEXT);

    expect(describeKinship(document, 'daughter', 'dad', 'en')?.selectedToHovered).toBe('father, husband');
    expect(describeKinship(document, 'dad', 'daughter', 'en')?.selectedToHovered).toBe('daughter, wife');
    expect(describeKinship(document, 'child', 'dad', 'en')?.selectedToHovered).toBe('father, grandfather');
  });

  it('describes multiple Vietnamese relationships when roles overlap', () => {
    const document = parseFamilyTreeText(OVERLAPPING_KINSHIP_TEXT);

    expect(describeKinship(document, 'daughter', 'dad', 'vi')?.selectedToHovered).toBe('bố, chồng');
    expect(describeKinship(document, 'dad', 'daughter', 'vi')?.selectedToHovered).toBe('con, vợ');
    expect(describeKinship(document, 'child', 'dad', 'vi')?.selectedToHovered).toBe('bố, ông ngoại');
  });

  it('uses relationship-line child order as Vietnamese birth order when DOB is missing', () => {
    const document = parseFamilyTreeText(VIETNAMESE_EXTENDED_KINSHIP_TEXT);

    expect(describeKinship(document, 'me', 'olderBrother', 'vi')?.selectedToHovered).toBe('anh ruột');
    expect(describeKinship(document, 'me', 'olderSister', 'vi')?.selectedToHovered).toBe('chị ruột');
    expect(describeKinship(document, 'me', 'youngerBrother', 'vi')?.selectedToHovered).toBe('em trai');
    expect(describeKinship(document, 'me', 'youngerSister', 'vi')?.selectedToHovered).toBe('em gái');
  });

  it('describes northern Vietnamese aunt and uncle spouse terms', () => {
    const document = parseFamilyTreeText(VIETNAMESE_EXTENDED_KINSHIP_TEXT);

    expect(describeKinship(document, 'me', 'dadOlderBrother', 'vi')?.selectedToHovered).toBe('bác trai');
    expect(describeKinship(document, 'me', 'dadOlderBrotherWife', 'vi')?.selectedToHovered).toBe('bác gái');
    expect(describeKinship(document, 'me', 'dadYoungerBrother', 'vi')?.selectedToHovered).toBe('chú');
    expect(describeKinship(document, 'me', 'dadYoungerBrotherWife', 'vi')?.selectedToHovered).toBe('thím');
    expect(describeKinship(document, 'me', 'dadYoungerSister', 'vi')?.selectedToHovered).toBe('cô');
    expect(describeKinship(document, 'me', 'dadYoungerSisterHusband', 'vi')?.selectedToHovered).toBe('dượng');
    expect(describeKinship(document, 'me', 'momOlderSister', 'vi')?.selectedToHovered).toBe('bác gái');
    expect(describeKinship(document, 'me', 'momOlderSisterHusband', 'vi')?.selectedToHovered).toBe('bác trai');
    expect(describeKinship(document, 'me', 'momYoungerBrother', 'vi')?.selectedToHovered).toBe('cậu');
    expect(describeKinship(document, 'me', 'momYoungerBrotherWife', 'vi')?.selectedToHovered).toBe('mợ');
    expect(describeKinship(document, 'me', 'momYoungerSister', 'vi')?.selectedToHovered).toBe('dì');
    expect(describeKinship(document, 'me', 'momYoungerSisterHusband', 'vi')?.selectedToHovered).toBe('dượng');
  });

  it('describes northern Vietnamese cousin and sibling spouse terms', () => {
    const document = parseFamilyTreeText(VIETNAMESE_EXTENDED_KINSHIP_TEXT);

    expect(describeKinship(document, 'me', 'olderMaleCousin', 'vi')?.selectedToHovered).toBe('anh họ');
    expect(describeKinship(document, 'me', 'olderFemaleCousin', 'vi')?.selectedToHovered).toBe('chị họ');
    expect(describeKinship(document, 'me', 'youngerCousin', 'vi')?.selectedToHovered).toBe('chị họ');
    expect(describeKinship(document, 'me', 'youngerBranchMaleCousin', 'vi')?.selectedToHovered).toBe('em họ');
    expect(describeKinship(document, 'youngerBranchMaleCousin', 'me', 'vi')?.selectedToHovered).toBe('anh họ');
    expect(describeKinship(document, 'me', 'olderBrotherWife', 'vi')?.selectedToHovered).toBe('chị dâu');
    expect(describeKinship(document, 'me', 'olderSisterHusband', 'vi')?.selectedToHovered).toBe('anh rể');
    expect(describeKinship(document, 'me', 'youngerBrotherWife', 'vi')?.selectedToHovered).toBe('em dâu');
    expect(describeKinship(document, 'me', 'youngerSisterHusband', 'vi')?.selectedToHovered).toBe('em rể');
    expect(describeKinship(document, 'me', 'olderMaleCousinWife', 'vi')?.selectedToHovered).toBe('chị dâu');
    expect(describeKinship(document, 'me', 'olderFemaleCousinHusband', 'vi')?.selectedToHovered).toBe('anh rể');
  });

  it('describes northern Vietnamese spouse-side cousin terms through the spouse branch', () => {
    const document = parseFamilyTreeText(VIETNAMESE_EXTENDED_KINSHIP_TEXT);

    expect(describeKinship(document, 'youngerBrotherWife', 'olderMaleCousin', 'vi')?.selectedToHovered).toBe('anh chồng');
    expect(describeKinship(document, 'youngerBrotherWife', 'youngerCousin', 'vi')?.selectedToHovered).toBe('chị chồng');
    expect(describeKinship(document, 'olderMaleCousin', 'wife', 'vi')?.selectedToHovered).toBe('em dâu');
    expect(describeKinship(document, 'olderMaleCousinWife', 'me', 'vi')?.selectedToHovered).toBe('em chồng');
    expect(describeKinship(document, 'olderFemaleCousinHusband', 'me', 'vi')?.selectedToHovered).toBe('em vợ');
  });

  it('describes northern Vietnamese spouse-family and co-in-law terms', () => {
    const document = parseFamilyTreeText(VIETNAMESE_EXTENDED_KINSHIP_TEXT);

    expect(describeKinship(document, 'me', 'wifeDad', 'vi')?.selectedToHovered).toBe('bố vợ');
    expect(describeKinship(document, 'me', 'wifeMom', 'vi')?.selectedToHovered).toBe('mẹ vợ');
    expect(describeKinship(document, 'wife', 'dad', 'vi')?.selectedToHovered).toBe('bố chồng');
    expect(describeKinship(document, 'wife', 'mom', 'vi')?.selectedToHovered).toBe('mẹ chồng');
    expect(describeKinship(document, 'me', 'wifeOlderBrother', 'vi')?.selectedToHovered).toBe('anh vợ');
    expect(describeKinship(document, 'me', 'wifeOlderSister', 'vi')?.selectedToHovered).toBe('chị vợ');
    expect(describeKinship(document, 'me', 'wifeYoungerSibling', 'vi')?.selectedToHovered).toBe('em vợ');
    expect(describeKinship(document, 'wife', 'olderBrother', 'vi')?.selectedToHovered).toBe('anh chồng');
    expect(describeKinship(document, 'wife', 'olderSister', 'vi')?.selectedToHovered).toBe('chị chồng');
    expect(describeKinship(document, 'wife', 'youngerBrother', 'vi')?.selectedToHovered).toBe('em chồng');
    expect(describeKinship(document, 'me', 'olderCoInLaw', 'vi')?.selectedToHovered).toBe('anh đồng hao');
    expect(describeKinship(document, 'me', 'youngerCoInLaw', 'vi')?.selectedToHovered).toBe('em đồng hao');
  });

  it('describes northern Vietnamese extended terms through a spouse family', () => {
    const document = parseFamilyTreeText(VIETNAMESE_EXTENDED_KINSHIP_TEXT);

    expect(describeKinship(document, 'me', 'wifePgf', 'vi')?.selectedToHovered).toBe('ông');
    expect(describeKinship(document, 'me', 'wifePgm', 'vi')?.selectedToHovered).toBe('bà');
    expect(describeKinship(document, 'me', 'wifeDadOlderBrother', 'vi')?.selectedToHovered).toBe('bác trai');
    expect(describeKinship(document, 'me', 'wifeDadOlderBrotherWife', 'vi')?.selectedToHovered).toBe('bác gái');
    expect(describeKinship(document, 'me', 'wifeDadYoungerBrother', 'vi')?.selectedToHovered).toBe('chú');
    expect(describeKinship(document, 'me', 'wifeDadYoungerBrotherWife', 'vi')?.selectedToHovered).toBe('thím');
    expect(describeKinship(document, 'me', 'wifeDadYoungerSister', 'vi')?.selectedToHovered).toBe('cô');
    expect(describeKinship(document, 'me', 'wifeDadYoungerSisterHusband', 'vi')?.selectedToHovered).toBe('dượng');
    expect(describeKinship(document, 'me', 'wifeMomOlderSister', 'vi')?.selectedToHovered).toBe('bác gái');
    expect(describeKinship(document, 'me', 'wifeMomOlderSisterHusband', 'vi')?.selectedToHovered).toBe('bác trai');
    expect(describeKinship(document, 'me', 'wifeMomYoungerBrother', 'vi')?.selectedToHovered).toBe('cậu');
    expect(describeKinship(document, 'me', 'wifeMomYoungerBrotherWife', 'vi')?.selectedToHovered).toBe('mợ');
    expect(describeKinship(document, 'me', 'wifeMomYoungerSister', 'vi')?.selectedToHovered).toBe('dì');
    expect(describeKinship(document, 'me', 'wifeMomYoungerSisterHusband', 'vi')?.selectedToHovered).toBe('dượng');
  });

  it('describes northern Vietnamese spouse terms from extended relatives back to spouse', () => {
    const document = parseFamilyTreeText(VIETNAMESE_EXTENDED_KINSHIP_TEXT);

    expect(describeKinship(document, 'wife', 'dadYoungerSister', 'vi')?.selectedToHovered).toBe('cô');
    expect(describeKinship(document, 'dadYoungerSister', 'wife', 'vi')?.selectedToHovered).toBe('cháu dâu');
    expect(describeKinship(document, 'dadYoungerSisterHusband', 'wife', 'vi')?.selectedToHovered).toBe('cháu dâu');
    expect(describeKinship(document, 'wifeDadYoungerSister', 'me', 'vi')?.selectedToHovered).toBe('cháu rể');
    expect(describeKinship(document, 'wifeDadYoungerSisterHusband', 'me', 'vi')?.selectedToHovered).toBe('cháu rể');
  });

  it('describes northern Vietnamese extended terms through grandchild spouses', () => {
    const document = parseFamilyTreeText(VIETNAMESE_EXTENDED_KINSHIP_TEXT);

    expect(describeKinship(document, 'me', 'grandsonWifePgf', 'vi')?.selectedToHovered).toBe('ông');
    expect(describeKinship(document, 'me', 'grandsonWifePgm', 'vi')?.selectedToHovered).toBe('bà');
    expect(describeKinship(document, 'me', 'grandsonWifeDadOlderBrother', 'vi')?.selectedToHovered).toBe('bác trai');
    expect(describeKinship(document, 'me', 'grandsonWifeDadOlderBrotherWife', 'vi')?.selectedToHovered).toBe('bác gái');
    expect(describeKinship(document, 'me', 'grandsonWifeDadYoungerBrother', 'vi')?.selectedToHovered).toBe('chú');
    expect(describeKinship(document, 'me', 'grandsonWifeDadYoungerBrotherWife', 'vi')?.selectedToHovered).toBe('thím');
    expect(describeKinship(document, 'me', 'grandsonWifeDadYoungerSister', 'vi')?.selectedToHovered).toBe('cô');
    expect(describeKinship(document, 'me', 'grandsonWifeDadYoungerSisterHusband', 'vi')?.selectedToHovered).toBe('dượng');
    expect(describeKinship(document, 'me', 'granddaughterHusbandMgf', 'vi')?.selectedToHovered).toBe('ông');
    expect(describeKinship(document, 'me', 'granddaughterHusbandMgm', 'vi')?.selectedToHovered).toBe('bà');
    expect(describeKinship(document, 'me', 'granddaughterHusbandMomYoungerBrother', 'vi')?.selectedToHovered).toBe('cậu');
    expect(describeKinship(document, 'me', 'granddaughterHusbandMomYoungerBrotherWife', 'vi')?.selectedToHovered).toBe('mợ');
    expect(describeKinship(document, 'me', 'granddaughterHusbandMomYoungerSister', 'vi')?.selectedToHovered).toBe('dì');
    expect(describeKinship(document, 'me', 'granddaughterHusbandMomYoungerSisterHusband', 'vi')?.selectedToHovered).toBe('dượng');
  });

  it('describes northern Vietnamese descendant and in-law parent terms', () => {
    const document = parseFamilyTreeText(VIETNAMESE_EXTENDED_KINSHIP_TEXT);

    expect(describeKinship(document, 'me', 'greatGrandfather', 'vi')?.selectedToHovered).toBe('cụ');
    expect(describeKinship(document, 'me', 'greatGreatGrandfather', 'vi')?.selectedToHovered).toBe('kỵ');
    expect(describeKinship(document, 'me', 'daughterInLaw', 'vi')?.selectedToHovered).toBe('con dâu');
    expect(describeKinship(document, 'me', 'sonInLaw', 'vi')?.selectedToHovered).toBe('con rể');
    expect(describeKinship(document, 'me', 'grandson', 'vi')?.selectedToHovered).toBe('cháu nội');
    expect(describeKinship(document, 'me', 'grandsonWife', 'vi')?.selectedToHovered).toBe('cháu dâu');
    expect(describeKinship(document, 'me', 'granddaughter', 'vi')?.selectedToHovered).toBe('cháu ngoại');
    expect(describeKinship(document, 'me', 'granddaughterHusband', 'vi')?.selectedToHovered).toBe('cháu rể');
    expect(describeKinship(document, 'me', 'greatGrandchild', 'vi')?.selectedToHovered).toBe('chắt');
    expect(describeKinship(document, 'me', 'sonInLawDad', 'vi')?.selectedToHovered).toBe('ông thông gia');
    expect(describeKinship(document, 'wife', 'sonInLawMom', 'vi')?.selectedToHovered).toBe('bà thông gia');
  });
});
