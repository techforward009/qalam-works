/**
 * Phase 19A.0f — Challenge Evaluation Adapter
 *
 * READ-ONLY. Does not modify Engine V2, lexicon, phrase table, or corpus.
 * Runs the frozen engine candidate (c51776bb) against the frozen challenge
 * corpus (d81b9574) exactly once.
 */

import type { RomanUrduEngine, EngineResult } from "./benchmarkScorer";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChallengeExample {
  id: string;
  split: "challenge";
  category: string;
  input: string;
  expected: string;
  acceptableAlternatives?: string[];
  protectedTokens?: string[];
  unknownTokens?: string[];
  ambiguousTokens?: string[];
  note?: string;
}

export interface ChallengeCorpus {
  meta: Record<string, unknown>;
  examples: ChallengeExample[];
}

// ── Per-example score ─────────────────────────────────────────────────────────

export interface ChallengeExampleScore {
  id: string;
  category: string;
  input: string;
  expected: string;
  actual: string;
  top1Pass: boolean;
  top3Pass: boolean;
  protectedTokensPass: boolean;
  protectedTokenFailures: string[];
  unknownTokensSafe: boolean;
  unknownTokenFailures: string[];
  candidateCount: number;
  candidatesUnique: boolean;
  primaryMatchesCandidateOne: boolean;
  latencyMs: number;
}

function acceptableFor(ex: ChallengeExample): string[] {
  return [ex.expected, ...(ex.acceptableAlternatives ?? [])];
}

export function scoreChallenge(
  ex: ChallengeExample,
  result: EngineResult,
  latencyMs: number
): ChallengeExampleScore {
  const acceptable = acceptableFor(ex);
  const top1Pass = acceptable.includes(result.output);
  const candidates = result.candidates ?? [{ output: result.output }];
  const top3Pass = candidates.slice(0, 3).some(c => acceptable.includes(c.output));

  // Protected tokens
  const ptFails: string[] = [];
  for (const token of (ex.protectedTokens ?? []) as string[]) {
    if (!result.output.includes(token)) ptFails.push(token);
    for (const c of candidates as Array<{ output: string }>) {
      if (!c.output.includes(token) && !ptFails.includes(token)) ptFails.push(token);
    }
  }

  const unkFails: string[] = [];
  for (const token of (ex.unknownTokens ?? []) as string[]) {
    if (!result.output.includes(token)) unkFails.push(token);
  }

  // Candidate quality
  const candidateStrings = candidates.map(c => c.output);
  const candidatesUnique = new Set(candidateStrings).size === candidateStrings.length;
  const primaryMatchesCandidateOne =
    candidates.length === 0 || candidates[0].output === result.output;

  return {
    id: ex.id,
    category: ex.category,
    input: ex.input,
    expected: ex.expected,
    actual: result.output,
    top1Pass,
    top3Pass,
    protectedTokensPass: ptFails.length === 0,
    protectedTokenFailures: ptFails,
    unknownTokensSafe: unkFails.length === 0,
    unknownTokenFailures: unkFails,
    candidateCount: candidateStrings.length,
    candidatesUnique,
    primaryMatchesCandidateOne,
    latencyMs,
  };
}

// ── Full evaluation run ───────────────────────────────────────────────────────

export interface CategoryResult {
  category: string;
  total: number;
  top1Correct: number;
  top3Correct: number;
  top1Accuracy: number;
  top3Accuracy: number;
  ptFailures: number;
}

export interface ChallengeEvalResult {
  totalExamples: number;
  top1Correct: number;
  top3Correct: number;
  top1Accuracy: number;
  top3Accuracy: number;

  // Protected tokens
  ptExamplesChecked: number;
  ptTokensChecked: number;
  ptTokensFailed: number;
  ptIntegrity: number;

  // Unknown tokens
  unkExamplesChecked: number;
  unkTokensChecked: number;
  unkTokensFailed: number;
  unkSafeRate: number;

  // Candidates
  examplesWith1Candidate: number;
  examplesWith2Candidates: number;
  examplesWith3Candidates: number;
  uniquenessFailures: number;
  primaryCandidateMismatches: number;

  // Latency (ms)
  avgLatencyMs: number;
  maxLatencyMs: number;

  // Per-category
  perCategory: CategoryResult[];

  // Individual scores for failure analysis
  scores: ChallengeExampleScore[];
}

export function runChallengeEval(
  corpus: ChallengeCorpus,
  engine: RomanUrduEngine
): ChallengeEvalResult {
  const scores: ChallengeExampleScore[] = [];

  for (const ex of corpus.examples) {
    const start = performance.now();
    const result = engine.convert(ex.input);
    const latencyMs = performance.now() - start;
    scores.push(scoreChallenge(ex, result, latencyMs));
  }

  const total = scores.length;
  const top1Correct = scores.filter(s => s.top1Pass).length;
  const top3Correct = scores.filter(s => s.top3Pass).length;

  // PT stats
  const ptExamples = corpus.examples.filter(e => e.protectedTokens && e.protectedTokens.length > 0);
  const ptTokensChecked = ptExamples.reduce((n, e) => n + (e.protectedTokens?.length ?? 0), 0);
  const ptTokensFailed = scores.flatMap(s => s.protectedTokenFailures).length;

  // Unknown stats
  const unkExamples = corpus.examples.filter(e => e.unknownTokens && e.unknownTokens.length > 0);
  const unkTokensChecked = unkExamples.reduce((n, e) => n + (e.unknownTokens?.length ?? 0), 0);
  const unkTokensFailed = scores.flatMap(s => s.unknownTokenFailures).length;

  // Candidate stats
  const c1 = scores.filter(s => s.candidateCount === 1).length;
  const c2 = scores.filter(s => s.candidateCount === 2).length;
  const c3 = scores.filter(s => s.candidateCount >= 3).length;
  const uniqueFails = scores.filter(s => !s.candidatesUnique).length;
  const primaryMismatches = scores.filter(s => !s.primaryMatchesCandidateOne).length;

  // Latency
  const latencies = scores.map(s => s.latencyMs);
  const avgLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatencyMs = Math.max(...latencies);

  // Per-category
  const catMap = new Map<string, ChallengeExampleScore[]>();
  for (const s of scores) {
    if (!catMap.has(s.category)) catMap.set(s.category, []);
    catMap.get(s.category)!.push(s);
  }
  const perCategory: CategoryResult[] = [];
  for (const [cat, catScores] of catMap) {
    const t = catScores.length;
    const t1 = catScores.filter(s => s.top1Pass).length;
    const t3 = catScores.filter(s => s.top3Pass).length;
    perCategory.push({
      category: cat,
      total: t,
      top1Correct: t1,
      top3Correct: t3,
      top1Accuracy: t > 0 ? t1 / t : 0,
      top3Accuracy: t > 0 ? t3 / t : 0,
      ptFailures: catScores.filter(s => !s.protectedTokensPass).length,
    });
  }
  perCategory.sort((a, b) => a.category.localeCompare(b.category));

  return {
    totalExamples: total,
    top1Correct, top3Correct,
    top1Accuracy: total > 0 ? top1Correct / total : 0,
    top3Accuracy: total > 0 ? top3Correct / total : 0,
    ptExamplesChecked: ptExamples.length,
    ptTokensChecked,
    ptTokensFailed,
    ptIntegrity: ptTokensChecked > 0 ? (ptTokensChecked - ptTokensFailed) / ptTokensChecked : 1,
    unkExamplesChecked: unkExamples.length,
    unkTokensChecked,
    unkTokensFailed,
    unkSafeRate: unkTokensChecked > 0 ? (unkTokensChecked - unkTokensFailed) / unkTokensChecked : 1,
    examplesWith1Candidate: c1,
    examplesWith2Candidates: c2,
    examplesWith3Candidates: c3,
    uniquenessFailures: uniqueFails,
    primaryCandidateMismatches: primaryMismatches,
    avgLatencyMs,
    maxLatencyMs,
    perCategory,
    scores,
  };
}
