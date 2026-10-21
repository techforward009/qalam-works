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
  return /(?:البر(?: |$)|(?:^| )(?:بر|وبر|ببر|فبر|بالبر)(?: |$)|العقوق|عقوق|احسان|احسن|حسن صحب|اطاع|الطاع|اطع|تطع|شكر|اشكر|وصينا|خفض|اخفض|ارفق|رفيق|شفيق|ارحم|اكرم|كرامه|تنهر|(?:^| )اف(?: |$)|قول كريم|قولا كريما|حسن سلو|احترام|عزت|نیکی|نيكي|خدمت|ادب|فرمانبردار|شفقت|نرمی|نرمى|آہستہ|عزت|مہربان|respect|honou?r|kindness|dutiful|obedien)/u.test(value);
}
/** Bare 'حق' is ambiguous in legal and inheritance records. */
function teachesParentRights(body: string): boolean {
  // A generic statement such as "Allah's promise is true" (Quran 31:33)
  // near the word "father" is NOT a parent's right. Demand an actual
  // parent/child right noun phrase, not proximity across clauses.
  return /(?:حق(?:وق)? (?:الوالد|الوالدين|الاب|الام|الولد|باپ|ماں|فرزند|والد|اولاد)|(?:والدين|والد|باپ|ماں|فرزند) (?:پر |کا |کے )?حق(?:وق)?|حقوق (?:والدين|والد|ماں|باپ))/u.test(body);
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

/**
 * Rank parent-respect Quran evidence by *explicit instructions within the
 * original ayah*, not by repeated occurrences of a parent word. This score
 * only orders already grounded/source-verified verses; it is not a fatwa or
 * a generated explanation.
 */
export function parentRespectQuranGuidanceStrength(text: string): number {
  const body = normalizeBookSearch(text);
  let weight = 0;
  for (const [phrase, value] of [
    ["بالوالدين احسانا", 5],
    ["فلا تقل لهما اف", 4],
    ["تنهرهما", 4],
    ["قولا كريما", 4],
    ["اخفض لهما", 5],
    ["ارحمهما", 4],
    ["صاحبهما في الدنيا معروفا", 4],
    ["فلا تطعهما", 3],
    ["اشكر لي ولوالديك", 2],
    ["وصينا الانسان بوالديه", 2],
    ["بر الوالدين", 3],
    ["عقوق الوالدين", 3],
  ] as const) if (body.includes(phrase)) weight += value;
  return weight;
}

/** Scripture may continue a parent-specific command using "them" (17:24).
 * Allow that verse only when its immediately preceding original ayah gives
 * explicit parent guidance and the continuation gives an ethical command.
 */
export function isParentRespectVerseContinuation(text: string, preceding: string | undefined): boolean {
  if (!preceding || !isRespectForParentsEvidence(preceding) ||
      parentRespectQuranGuidanceStrength(preceding) < 2) return false;
  const body = normalizeBookSearch(text);
  return /(?:^| )لهما(?: |$)|(?:^| )تطعهما(?: |$)|(?:^| )ارحمهما(?: |$)/u.test(body)
    && parentRespectQuranGuidanceStrength(text) >= 3;
}
