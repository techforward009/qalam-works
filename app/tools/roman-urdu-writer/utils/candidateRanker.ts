/**
 * Urdu Candidate Ranker
 *
 * Re-ranks grapheme-generated candidates using:
 * 1. Urdu script character frequency patterns (common endings, known morphemes)
 * 2. Word-length plausibility
 * 3. Known suffix/prefix patterns for Pakistani Urdu
 *
 * Does NOT use a full language model — purely rule-based and deterministic.
 */

import type { BeamCandidate } from "./graphemeGenerator";

// ── Known Urdu word patterns (high-frequency) ─────────────────────────────────

// Common word endings in Urdu script
const URDU_COMMON_ENDINGS = [
  "نا", "تا", "تی", "تے", "ہے", "ہیں", "ہوں", "گا", "گی", "گے",
  "یا", "ئی", "ئے", "اں", "وں", "ات", "ان", "کا", "کی", "کے",
  "نے", "کو", "سے", "پر", "میں", "میں", "نہ", "بھی", "ہی",
  "کر", "کے", "رہا", "رہی", "رہے", "لیا", "دیا", "آیا",
];

// Common word beginnings in Urdu
const URDU_COMMON_STARTS = [
  "ک", "م", "ہ", "ن", "ب", "ج", "ت", "ل", "س", "ا", "و", "پ",
  "آ", "ان", "بھ", "کر", "جب", "مج", "تم", "ہم", "آپ",
];

// High-frequency Urdu bigrams in script
const URDU_BIGRAMS = new Set([
  "ہے", "نہ", "کا", "کی", "کے", "نے", "کو", "سے", "پر",
  "یہ", "وہ", "اس", "ان", "اب", "کب", "جب", "تب",
  "رہ", "کر", "جا", "آ", "لے", "دے", "ہو",
  "تھ", "تا", "تی", "تے", "گا", "گی", "گے",
  "یا", "ئی", "ائ", "وا", "وی",
]);

// ── Plausibility scorer ───────────────────────────────────────────────────────

/**
 * Returns a plausibility score for a candidate Urdu string.
 * Higher = more plausible as a natural Urdu word.
 * Score is additive (for re-ranking beam candidates).
 */
export function plausibilityScore(candidate: string): number {
  if (!candidate) return -5;
  let score = 0;

  // Reward common endings
  for (const ending of URDU_COMMON_ENDINGS) {
    if (candidate.endsWith(ending)) { score += 2; break; }
  }

  // Reward common starts
  for (const start of URDU_COMMON_STARTS) {
    if (candidate.startsWith(start)) { score += 1; break; }
  }

  // Reward matching Urdu bigrams
  let bigrams = 0;
  for (let i = 0; i < candidate.length - 1; i++) {
    const bg = candidate[i] + candidate[i + 1];
    if (URDU_BIGRAMS.has(bg)) bigrams++;
  }
  score += bigrams * 0.5;

  // Penalize very short or very long outputs (typical Urdu word: 2–12 chars)
  const len = candidate.length;
  if (len < 2) score -= 1;
  if (len > 16) score -= 2;
  if (len >= 2 && len <= 10) score += 0.5; // sweet spot

  // Penalize if it looks like the Roman input leaked through (ASCII chars present)
  if (/[a-zA-Z]/.test(candidate)) score -= 3;

  return score;
}

/**
 * Re-ranks beam candidates by combining grapheme score and plausibility.
 * beam_score is log-probability from grapheme generator.
 */
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
