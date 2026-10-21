import { normalizeBookSearch } from "./bookCorpus";

/**
 * Source-bound relevance gate for a *specific ethical question*, not generic
 * mentions of family relations. Uses no generated prose or invented citations.
 * Applied after lexical retrieval; never changes the original text.
 */
export function asksAboutRespectForParents(question: string): boolean {
  const q = normalizeBookSearch(question);
  const parent = /(?:والدين|والد|ماں|باپ|parents?|mother|father|والديه|ابويه)/u.test(q);
  const conduct = /(?:احترام|عزت|نیکی|نيكي|حسن سلوك|حسنِ سلوک|حقوق|حقوق|اطاعت|خدمت|ادب|فرمانبردار|نافرمان|بدسلوك|احسان|شفقت|respect|honou?r|duties|rights|kindness|disobedien|birr|عقوق|بر الوالدين)/u.test(q);
  return parent && conduct;
}

/** Avoid pronouns and 'Abu' in isnads: they do not identify a parent topic. */
function hasDirectParentReference(value: string): boolean {
  return /(?:والد|والدين|والديه|ابويه|ابوين|ابويك|ابوه|امها|والدہ|ماں|باپ|پدر|فرزند|parents?|mother|father|(?:^| )الاب(?: |$)|(?:^| )الام(?: |$))/u.test(value);
}
function hasEthicalConduct(value: string): boolean {
  return /(?:البر(?: |$)|(?:^| )بر(?: |$)|العقوق|عقوق|احسان|احسن|حسن صحب|اطاع|الطاع|اطع|تطع|شكر|اشكر|وصينا|خفض|اخفض|ارفق|رفيق|شفيق|ارحم|اكرم|كرامه|تنهر|(?:^| )اف(?: |$)|قول كريم|قولا كريما|حسن سلو|احترام|عزت|نیکی|نيكي|خدمت|ادب|فرمانبردار|شفقت|نرمی|نرمى|آہستہ|عزت|مہربان|respect|honou?r|kindness|dutiful|obedien)/u.test(value);
}
/** Bare 'حق' is ambiguous in legal and inheritance records. */
function teachesParentRights(body: string): boolean {
  return /(?:والد|باپ|پدر|فرزند|الولد).{0,100}(?:حق|حقوق)|(?:حق|حقوق).{0,100}(?:والد|باپ|پدر|فرزند|الولد)/u.test(body);
}
function explicitlyAboutParents(title: string): boolean {
  return hasDirectParentReference(title) &&
    (hasEthicalConduct(title) || /(?:حقوق|حق|دعاؤ|دعا|دعاء|صلاه|صلوه)/u.test(title));
}

/** Genuine source content, not merely subject words or a matching heading. */
export function isRespectForParentsEvidence(text: string, heading = ""): boolean {
  const body = normalizeBookSearch(text);
  const title = normalizeBookSearch(heading);
  if (!hasEthicalConduct(body) && !teachesParentRights(body)) return false;
  return hasDirectParentReference(body) || explicitlyAboutParents(title);
}
