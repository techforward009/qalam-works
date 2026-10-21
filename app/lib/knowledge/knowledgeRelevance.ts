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

function hasParentReference(value: string): boolean {
  return /(?:والد|ابوي|اباء|ابناؤ|الام|الاب|ابويه|والديه|لهما|بهما|هما|والدين|ماں|باپ|والدين|امی|ابو|mother|father|parent)/u.test(value);
}
function hasRespectConduct(value: string): boolean {
  return /(?:البر|بر الوالدين|بِرِّ|بِرُّ|العقوق|عقوق|احسان|احسن|احسِن|إحسان|حسن صحب|صُحْبَ|اطاع|الطاع|اطع|تطع|حق|حقوق|شكر|اشكر|وصينا|خفض|اخفض|ارفق|رفيق|شفيق|ارحم|اكرم|كرامه|انفق|أف|اف|تنهر|تَنْهَر|قول كريم|قولا كريما|لين|صوتي|ادب|حسن سلو|احترام|عزت|نیکی|نيكي|خدمت|ادب|فرمانبردار|شفقت|نرمی|نرمى|آہستہ|آہستہ|عزّت|مہربان|بخشتا|respect|honou?r|kind|dutiful|obedien)/u.test(value);
}

/**
 * A chapter heading gives context, but never alone establishes that the
 * returned passage teaches an ethical duty: the passage must itself contain
 * a conduct signal. Prevents legal parent-child testimony/inheritance hits.
 */
export function isRespectForParentsEvidence(text: string, heading = ""): boolean {
  const body = normalizeBookSearch(text);
  const title = normalizeBookSearch(heading);
  if (!hasRespectConduct(body)) return false;
  return hasParentReference(body) || hasParentReference(title);
}
