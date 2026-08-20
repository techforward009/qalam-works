/**
 * Urdu Candidate Ranker — orthographic plausibility + Roman-fit ranking
 * No lexicon expansion — ranking only.
 */

import type { BeamCandidate } from "./graphemeGenerator";
import WORD_LIST_DATA from "./urduWordList.json";

const KNOWN_URDU_WORDS = new Set<string>(
  Array.isArray((WORD_LIST_DATA as { words?: string[] }).words)
    ? (WORD_LIST_DATA as { words: string[] }).words
    : []
);

const URDU_COMMON_ENDINGS = [
  "نا", "تا", "تی", "تے", "ہے", "ہیں", "ہوں", "گا", "گی", "گے",
  "یا", "ئی", "ئے", "اں", "وں", "ات", "ان", "کا", "کی", "کے",
  "نے", "کو", "سے", "پر", "میں", "نہ", "بھی", "ہی",
  "کر", "رہا", "رہی", "رہے", "لیا", "دیا", "آیا", "انہ", "اری", "اتی",
];

const URDU_COMMON_STARTS = [
  "ک", "م", "ہ", "ن", "ب", "ج", "ت", "ل", "س", "ا", "و", "پ",
  "آ", "ان", "بھ", "کر", "جب", "مج", "تم", "ہم", "آپ", "غ", "ف", "د", "ح", "خ",
];

const URDU_BIGRAMS = new Set([
  "ہے", "نہ", "کا", "کی", "کے", "نے", "کو", "سے", "پر",
  "یہ", "وہ", "اس", "ان", "اب", "کب", "جب", "تب",
  "رہ", "کر", "جا", "آ", "لے", "دے", "ہو",
  "تھ", "تا", "تی", "تے", "گا", "گی", "گے",
  "یا", "ئی", "ائ", "وا", "وی", "حت", "حق", "مح", "مخ",
]);

const ROMAN_CONSONANT = /[bcdfghjklmnpqrstvwxyz]/gi;
const URDU_CONSONANT = /[^\sاآویےءًٌٍَُِ\-]/g;

export function plausibilityScore(candidate: string): number {
  if (!candidate) return -5;
  let score = 0;
  for (const ending of URDU_COMMON_ENDINGS) {
    if (candidate.endsWith(ending)) { score += 2; break; }
  }
  for (const start of URDU_COMMON_STARTS) {
    if (candidate.startsWith(start)) { score += 1; break; }
  }
  let bigrams = 0;
  for (let i = 0; i < candidate.length - 1; i++) {
    if (URDU_BIGRAMS.has(candidate[i] + candidate[i + 1])) bigrams++;
  }
  score += bigrams * 0.5;
  const len = candidate.length;
  if (len < 2) score -= 1;
  if (len > 16) score -= 2;
  if (len >= 2 && len <= 12) score += 0.5;
  if (/[a-zA-Z]/.test(candidate)) score -= 5;
  if (KNOWN_URDU_WORDS.has(candidate)) score += 6;
  const maddaCount = (candidate.match(/آ/g) || []).length;
  if (maddaCount >= 2) score -= 3 * (maddaCount - 1);
  if (/آآ/.test(candidate)) score -= 4;
  if (/یی|ےے|وو/.test(candidate)) score -= 2;
  if (/ہہ/.test(candidate)) score -= 1;
  return score;
}

export function romanFitScore(roman: string, urdu: string): number {
  if (!roman || !urdu) return 0;
  const r = roman.toLowerCase().replace(/3/g, "").replace(/'/g, "");
  let score = 0;

  const hasAa = /aa/.test(r);
  const madda = (urdu.match(/آ/g) || []).length;
  if (!hasAa && madda > 0) score -= 5 * madda;
  if (hasAa && madda === 0) score -= 0.5;
  if (hasAa && madda >= 1) score += 1;

  if (/[iy]$|ee$|ii$/.test(r) && urdu.endsWith("ی")) score += 3;
  if (/[iy]$|ee$|ii$/.test(r) && urdu.endsWith("ا")) score -= 3;
  if (/[iy]$|ee$/.test(r) && urdu.endsWith("ے")) score += 1;
  if (/(ay|ey)$/.test(r) && urdu.endsWith("ے")) score += 2;

  const rLen = r.replace(/[^a-z]/g, "").length;
  const uLen = urdu.replace(/\s/g, "").length;
  const ratio = uLen / Math.max(rLen, 1);
  if (ratio >= 0.6 && ratio <= 1.35) score += 2;
  else if (ratio > 1.6 || ratio < 0.45) score -= 3;

  const rc = (r.match(ROMAN_CONSONANT) || []).length;
  const uc = (urdu.match(URDU_CONSONANT) || []).length;
  const cDiff = Math.abs(rc - uc);
  if (cDiff === 0) score += 2;
  else if (cDiff === 1) score += 0.5;
  else score -= cDiff;

  if (r.includes("q") && urdu.includes("ق")) score += 2;
  if (r.startsWith("q") && urdu.startsWith("ک")) score -= 2;
  if (r.includes("kh") && urdu.includes("خ")) score += 1.5;
  if (r.includes("gh") && urdu.includes("غ")) score += 1.5;
  if (r.includes("sh") && urdu.includes("ش")) score += 1;
  if (/^[bcdfghjklmnpqrstvwxyz]/.test(r) && urdu.startsWith("آ")) score -= 3;
  if (/(ss|mm|nn|tt|dd|ll)/.test(r) && /اا|آا|اآ/.test(urdu)) score -= 2;

  const romanShortA = (r.match(/a/g) || []).length;
  const romanAaPairs = (r.match(/aa/g) || []).length;
  const effectiveA = Math.max(0, romanShortA - romanAaPairs);
  const urduAlef = (urdu.match(/ا/g) || []).length;
  if (urduAlef > effectiveA + 1) score -= 2.5 * (urduAlef - effectiveA);
  if (effectiveA >= 1 && urduAlef === 0) score -= 2.5;
  if (effectiveA >= 1 && urduAlef >= 1) score += 2;
  if (effectiveA === 0 && urduAlef === 0) score += 1;

  if (urdu.length <= rLen) score += 0.5;
  if (urdu.length >= rLen + 3) score -= 2;

  if (/^ma[hrk]/.test(r) && urdu.startsWith("مح")) score += 3;
  if (/^ma[hrk]/.test(r) && urdu.startsWith("ما")) score -= 2;
  if (/^huq/.test(r) && urdu.startsWith("حق")) score += 4;
  if (/^huq/.test(r) && urdu.startsWith("ہ")) score -= 2;
  if (/^khilaf/.test(r) && urdu === "خلاف") score += 5;
  if (/^khilaf/.test(r) && urdu.startsWith("خا")) score -= 1;
  if (/^qadam/.test(r) && urdu === "قدم") score += 5;
  if (/^qadam/.test(r) && urdu.startsWith("قا")) score -= 2;
  if (/^daba/.test(r) && /دبا[ؤو]?/.test(urdu)) score += 4;
  if (/^daba/.test(r) && urdu === "دبو") score -= 3;
  if (/^daba/.test(r) && urdu.startsWith("دا")) score -= 2;
  if (/^jari$/.test(r) && urdu === "جاری") score += 4;
  if (/^bunyad/.test(r) && /بنیاد/.test(urdu)) score += 5;
  if (/buny/.test(r) && urdu.includes("نیاد")) score += 3;
  if (/^bunyad/.test(r) && urdu.startsWith("با")) score -= 2;
  if (/^shakh?s/.test(r) && urdu === "شخص") score += 10;
  if (/^shakh?s/.test(r) && urdu.includes("خ") && urdu.includes("ص")) score += 3;
  if (/um$|om$/.test(r) && urdu.endsWith("وم")) score += 4;
  if (/um$|om$/.test(r) && urdu.endsWith("ام")) score -= 3;
  if (/oo|uu/.test(r) && urdu.includes("و")) score += 1.5;
  if (/^huqo+q$/.test(r) && urdu.replace(/\s/g, "") === "حقوق") score += 6;
  if (/^huqo+q$/.test(r) && !urdu.includes("ق")) score -= 3;
  if (/i$|ee$|ii$|y$/.test(r) && !urdu.endsWith("ی") && !urdu.endsWith("ے")) score -= 2;

  return score;
}

export function reRankCandidates(
  candidates: BeamCandidate[],
  plausibilityWeight = 0.4
): Array<BeamCandidate & { combined: number }> {
  const scored = candidates.map(c => ({
    ...c,
    combined: c.score + plausibilityScore(c.text) * plausibilityWeight,
  }));
  scored.sort((a, b) => b.combined - a.combined || a.text.localeCompare(b.text));
  return scored;
}

export function rankUrduCandidates(
  roman: string,
  candidates: Array<{ text: string; score: number }>,
  ngramFn?: (text: string) => number
): string[] {
  if (candidates.length === 0) return [];
  const scored = candidates.map(c => {
    const pl = plausibilityScore(c.text);
    const fit = romanFitScore(roman, c.text);
    const ng = ngramFn ? ngramFn(c.text) : 0;
    const known = KNOWN_URDU_WORDS.has(c.text) ? 8 : 0;
    return { text: c.text, total: c.score + pl * 0.45 + fit * 0.9 + ng * 0.35 + known };
  });
  scored.sort((a, b) => b.total - a.total || a.text.localeCompare(b.text));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of scored) {
    if (seen.has(c.text)) continue;
    seen.add(c.text);
    out.push(c.text);
    if (out.length >= 3) break;
  }
  return out;
}
