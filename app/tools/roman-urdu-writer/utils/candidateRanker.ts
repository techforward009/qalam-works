/**
 * Urdu Candidate Ranker — Phase 19A.12 candidate intelligence
 */
import type { BeamCandidate } from "./graphemeGenerator";
import WORD_LIST_DATA from "./urduWordList.json";
import { ngramScore } from "./urduNgramScorer";

const KNOWN_URDU_WORDS = new Set<string>(
  Array.isArray((WORD_LIST_DATA as { words?: string[] }).words)
    ? (WORD_LIST_DATA as { words: string[] }).words
    : []
);

const FREQ_PRIOR = new Set([
  "ہے", "ہیں", "ہوں", "تھا", "تھی", "تھے", "ہو",
  "کا", "کی", "کے", "کو", "نے", "سے", "پر", "میں", "اور", "یا", "تو", "بھی", "ہی", "نہ", "نہیں",
  "یہ", "وہ", "اس", "ان", "جو", "کیا", "کون", "کہاں", "کب", "کیوں", "کسی", "کچھ", "ہر",
  "آپ", "ہم", "تم", "شخص", "لوگ", "بات", "کام", "وقت", "دن", "سال", "بعد", "پہلے", "ساتھ",
  "محروم", "حقوق", "قانونی", "غیر", "ضروری", "مشکل", "مشکلات", "معاشرے", "شدید",
  "فلاح", "بہبود", "انصاف", "صبر", "علم", "اخلاق", "عبادت", "حکمت", "استقامت",
  "جاری", "قائم", "عدالت", "نوٹس", "کمیٹی", "ریاست", "قدم", "خلاف", "آج", "کل", "اب", "پھر",
  "چاہیے", "گیا", "گئے", "کرنا", "ہونا", "جانا", "آنا", "دینا", "لینا", "کہنا", "سمجھ", "رہا", "رہی", "رہے",
]);

const URDU_COMMON_ENDINGS = [
  "نا", "تا", "تی", "تے", "ہے", "ہیں", "ہوں", "گا", "گی", "گے",
  "یا", "ئی", "ئے", "اں", "وں", "ات", "ان", "کا", "کی", "کے",
  "نے", "کو", "سے", "پر", "میں", "نہ", "بھی", "ہی", "انہ", "اری", "اتی", "وری",
];

const URDU_COMMON_STARTS = [
  "ک", "م", "ہ", "ن", "ب", "ج", "ت", "ل", "س", "ا", "و", "پ",
  "آ", "ان", "بھ", "کر", "غ", "ف", "د", "ح", "خ", "ش", "ع", "ق",
];

const ROMAN_CONSONANT = /[bcdfghjklmnpqrstvwxyz]/gi;
const URDU_CONSONANT = /[^\sاآویےءًٌٍَُِ\-]/g;

const INVALID_PATTERNS: RegExp[] = [
  /آآ/, /ےے/, /ہہ/, /ااا/, /[\u064B-\u065F]{2,}/, /[اآویے]{4,}/, /ْْ/, /ًً/,
];

export function urduValidityScore(candidate: string): number {
  if (!candidate) return -10;
  let score = 0;
  for (const re of INVALID_PATTERNS) {
    if (re.test(candidate)) score -= 8;
  }
  if (/[\u064B-\u065F]/.test(candidate)) score -= 6;
  if (/ـ/.test(candidate)) score -= 3;
  if (candidate.length > 14) score -= 2;
  if (candidate.length > 18) score -= 4;
  const stripped = candidate.replace(/[\s\u064B-\u065F]/g, "");
  if (/[بتثجحخدذرزسشصضطظعغفقکگلمنوہی]{5,}/.test(stripped)) score -= 3;
  if (stripped.length >= 2 && stripped.length <= 10) score += 1;
  if (KNOWN_URDU_WORDS.has(candidate)) score += 10;
  if (FREQ_PRIOR.has(candidate)) score += 8;
  for (const ending of URDU_COMMON_ENDINGS) {
    if (candidate.endsWith(ending)) { score += 1.5; break; }
  }
  for (const start of URDU_COMMON_STARTS) {
    if (candidate.startsWith(start)) { score += 0.5; break; }
  }
  if (/[a-zA-Z]/.test(candidate)) score -= 12;
  return score;
}

export function plausibilityScore(candidate: string): number {
  return urduValidityScore(candidate);
}

export function romanFitScore(roman: string, urdu: string): number {
  if (!roman || !urdu) return 0;
  const r = roman.toLowerCase().replace(/3/g, "").replace(/'/g, "");
  let score = 0;
  const hasAa = /aa/.test(r);
  const madda = (urdu.match(/آ/g) || []).length;
  if (!hasAa && madda > 0) score -= 5 * madda;
  if (hasAa && madda >= 1) score += 1;
  if (/[iy]$|ee$|ii$/.test(r) && urdu.endsWith("ی")) score += 3;
  if (/[iy]$|ee$|ii$/.test(r) && urdu.endsWith("ا")) score -= 3;
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
  const romanShortA = (r.match(/a/g) || []).length;
  const romanAaPairs = (r.match(/aa/g) || []).length;
  const effectiveA = Math.max(0, romanShortA - romanAaPairs);
  const urduAlef = (urdu.match(/ا/g) || []).length;
  if (urduAlef > effectiveA + 1) score -= 2.5 * (urduAlef - effectiveA);
  if (effectiveA >= 1 && urduAlef === 0) score -= 2.5;
  if (effectiveA >= 1 && urduAlef >= 1) score += 2;
  if (/um$|om$/.test(r) && urdu.endsWith("وم")) score += 4;
  if (/um$|om$/.test(r) && urdu.endsWith("ام")) score -= 3;
  if (/oo|uu/.test(r) && urdu.includes("و")) score += 1.5;
  if (/^kis[ei]?$/.test(r) && urdu === "کسی") score += 6;
  if (/^shakh?s$/.test(r) && urdu === "شخص") score += 8;
  if (/^mahr?oo?m$|^mharoom$|^mehrum$/.test(r) && urdu === "محروم") score += 8;
  return score;
}

export function contextFitScore(candidate: string, prevUrdu?: string, nextRoman?: string): number {
  let score = 0;
  if (prevUrdu) {
    if (prevUrdu === "اس" && (candidate === "کے" || candidate === "کی" || candidate === "کا")) score += 3;
    if (prevUrdu === "کے" && (candidate === "لیے" || candidate === "خلاف" || candidate === "بغیر")) score += 2;
    if (prevUrdu === "غیر" && candidate.startsWith("قانون")) score += 4;
    if (prevUrdu === "ذمہ" && candidate.startsWith("دار")) score += 3;
    if (prevUrdu === "فلاح" && candidate === "و") score += 2;
    if (prevUrdu === "کسی" && (candidate === "شخص" || candidate === "طرح")) score += 4;
  }
  if (nextRoman) {
    const n = nextRoman.toLowerCase();
    if (n.startsWith("shakhs") && candidate === "کسی") score += 3;
    if (n.startsWith("qanoon") && candidate === "غیر") score += 3;
  }
  return score;
}

export function reRankCandidates(
  candidates: BeamCandidate[],
  plausibilityWeight = 0.4
): Array<BeamCandidate & { combined: number }> {
  const scored = candidates.map(c => ({
    ...c,
    combined: c.score + urduValidityScore(c.text) * plausibilityWeight,
  }));
  scored.sort((a, b) => b.combined - a.combined || a.text.localeCompare(b.text));
  return scored;
}

export interface RankContext {
  prevUrdu?: string;
  nextRoman?: string;
}

export function rankUrduCandidates(
  roman: string,
  candidates: Array<{ text: string; score: number }>,
  ngramFn?: (text: string) => number,
  ctx?: RankContext
): string[] {
  if (candidates.length === 0) return [];
  const poolHasKnown = candidates.some(
    c => KNOWN_URDU_WORDS.has(c.text) || FREQ_PRIOR.has(c.text)
  );
  const scored = candidates.map(c => {
    const validity = urduValidityScore(c.text);
    const fit = romanFitScore(roman, c.text);
    const ng = ngramFn ? ngramFn(c.text) : ngramScore(c.text);
    const isKnown = KNOWN_URDU_WORDS.has(c.text);
    const isFreq = FREQ_PRIOR.has(c.text);
    let known = isKnown ? 14 : isFreq ? 12 : 0;
    if (poolHasKnown && !isKnown && !isFreq) known -= 6;
    const ctxScore = contextFitScore(c.text, ctx?.prevUrdu, ctx?.nextRoman);
    const hardReject = validity < -12 ? -50 : 0;
    const cleanBonus = /[\u064B-\u065F]/.test(c.text) ? -8 : 0;
    return {
      text: c.text,
      total: c.score + validity * 0.85 + fit * 1.0 + ng * 0.65 + known + ctxScore + hardReject + cleanBonus,
      validity,
    };
  });
  scored.sort((a, b) => b.total - a.total || a.text.localeCompare(b.text));
  const filtered = scored.filter(c => c.validity >= -8);
  const pool = filtered.length > 0 ? filtered : scored;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of pool) {
    if (seen.has(c.text)) continue;
    seen.add(c.text);
    out.push(c.text);
    if (out.length >= 3) break;
  }
  return out;
}
