/**
 * Urdu Character Trigram Scorer — Direction C
 *
 * Built from urduhack/urdu-words (MIT) — 50k word forms.
 * 6,885 trigrams (count ≥ 5), add-1/10 smoothed log-probabilities.
 *
 * Answers: "How Urdu-orthographically plausible is this candidate string?"
 * Does NOT generate text.
 *
 * Source:  https://github.com/urduhack/urdu-words
 * License: MIT
 * Size:    86 KB JSON → loaded once at module init.
 */

import NGRAM_DATA from "./urduNgramModel.json";

// ── Load model ────────────────────────────────────────────────────────────────

interface NgramModel {
  source: string;
  license: string;
  wordCount: number;
  trigramCount: number;
  smoothing: number;
  unkScore: number;
  model: Record<string, number>;
}

const MODEL = NGRAM_DATA as unknown as NgramModel;
const NGRAMS: Readonly<Record<string, number>> = MODEL.model;
const UNK_SCORE: number = MODEL.unkScore;

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Returns the mean trigram log-probability for a Urdu-script string.
 * Higher (less negative) = more Urdu-orthographically plausible.
 *
 * Boundary markers ^ and $ are added automatically.
 * Unknown trigrams receive the smoothed floor (UNK_SCORE).
 */
export function ngramScore(candidate: string): number {
  if (!candidate || candidate.length === 0) return UNK_SCORE;
  const padded = "^" + candidate + "$";
  let total = 0;
  let count = 0;
  for (let i = 0; i <= padded.length - 3; i++) {
    const tri = padded[i] + padded[i + 1] + padded[i + 2];
    total += (NGRAMS[tri] ?? UNK_SCORE);
    count++;
  }
  return count > 0 ? total / count : UNK_SCORE;
}

/**
 * Compares two candidates. Returns positive if a is more plausible than b.
 */
export function compareNgramScore(a: string, b: string): number {
  return ngramScore(a) - ngramScore(b);
}

/**
 * Re-ranks a list of candidates by combined score:
 *   combined = graphemeScore + ngramWeight * ngramScore
 *
 * Deterministic: secondary sort by text for ties.
 */
export function ngramRerank(
  candidates: Array<{ text: string; score: number; combined?: number }>,
  ngramWeight = 0.6
): Array<{ text: string; score: number; combined: number; ngramScore: number }> {
  const scored = candidates.map(c => {
    const ng = ngramScore(c.text);
    return {
      text: c.text,
      score: c.score,
      ngramScore: ng,
      combined: (c.combined ?? c.score) + ngramWeight * ng,
    };
  });
  scored.sort((a, b) => b.combined - a.combined || a.text.localeCompare(b.text));
  return scored;
}

// ── Model metadata ────────────────────────────────────────────────────────────

export const NGRAM_META = {
  source: MODEL.source,
  license: MODEL.license,
  wordCount: MODEL.wordCount,
  trigramCount: MODEL.trigramCount,
  smoothing: MODEL.smoothing,
} as const;
