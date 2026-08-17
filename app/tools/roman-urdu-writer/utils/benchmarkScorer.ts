/**
 * Qalam Roman Urdu Benchmark — Scoring Utilities
 *
 * Pure, engine-agnostic. Multiple future engines can implement
 * RomanUrduEngine and be evaluated against the same corpus.
 *
 * Quality gates (product targets, not current performance claims):
 *   Top-1 accuracy       ≥ 90 %
 *   Top-3 coverage       ≥ 97 %
 *   Protected-token integrity  100 %
 *   Destructive unknown rate   ≤ 1 %
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type BenchmarkCategory =
  | "everyday"
  | "spelling_variants"
  | "mixed"
  | "ambiguous"
  | "names_places"
  | "numbers_urls"
  | "noisy";

export type BenchmarkSplit = "development" | "holdout";

export interface BenchmarkExample {
  id: string;
  split: BenchmarkSplit;
  category: BenchmarkCategory;
  input: string;
  expected: string;
  acceptableAlternatives?: string[];
  protectedTokens?: string[];
  ambiguousTokens?: string[];
  note?: string;
}

export interface BenchmarkCorpus {
  meta: {
    version: string;
    description: string;
    totalExamples: number;
    developmentCount: number;
    holdoutCount: number;
    categories: BenchmarkCategory[];
    qualityGates: {
      top1AccuracyTarget: number;
      top3AccuracyTarget: number;
      protectedTokenIntegrity: number;
      destructiveUnknownRate: number;
    };
  };
  examples: BenchmarkExample[];
}

/** Single candidate from an engine. */
export interface EngineCandidate {
  output: string;
  score?: number;
}

/** What an engine returns for one input. */
export interface EngineResult {
  /** Best single output (used for Top-1). */
  output: string;
  /** Up to 3 candidates including output (used for Top-3). */
  candidates?: EngineCandidate[];
}

/** Engine interface — implement this to plug into the benchmark. */
export interface RomanUrduEngine {
  readonly name: string;
  convert(input: string): EngineResult;
}

// ── Per-example scoring ───────────────────────────────────────────────────────

export interface ExampleScore {
  id: string;
  category: BenchmarkCategory;
  split: BenchmarkSplit;
  input: string;
  expected: string;
  actual: string;
  top1Pass: boolean;
  top3Pass: boolean;
  protectedTokensPass: boolean;
  /** True if input had no acceptable translation and the unknown token was NOT destructively converted. */
  unknownWordSafe: boolean;
  protectedTokenFailures: string[];
}

/** Returns all strings that count as "acceptable" for this example. */
export function acceptableOutputs(ex: BenchmarkExample): string[] {
  const outputs = [ex.expected];
  if (ex.acceptableAlternatives) outputs.push(...ex.acceptableAlternatives);
  return outputs;
}

/** Checks whether a token is preserved verbatim somewhere in the output string. */
export function tokenPreservedIn(token: string, output: string): boolean {
  return output.includes(token);
}

/** Score a single example given an engine result. */
export function scoreExample(
  ex: BenchmarkExample,
  result: EngineResult
): ExampleScore {
  const acceptable = acceptableOutputs(ex);
  const top1Pass = acceptable.includes(result.output);

  const candidates = result.candidates ?? [{ output: result.output }];
  const top3Pass = candidates
    .slice(0, 3)
    .some(c => acceptable.includes(c.output));

  // Protected-token check
  const ptFails: string[] = [];
  if (ex.protectedTokens) {
    for (const token of ex.protectedTokens) {
      if (!tokenPreservedIn(token, result.output)) {
        ptFails.push(token);
      }
    }
  }
  const protectedTokensPass = ptFails.length === 0;

  // Unknown-word safety: if input has no known-Urdu translation
  // (proxy: the example is in the "noisy" category and protectedTokens are set),
  // verify each protected unknown token was not destructively rewritten.
  const unknownWordSafe =
    ex.category !== "noisy" ||
    !ex.protectedTokens ||
    ex.protectedTokens.every(t => tokenPreservedIn(t, result.output));

  return {
    id: ex.id,
    category: ex.category,
    split: ex.split,
    input: ex.input,
    expected: ex.expected,
    actual: result.output,
    top1Pass,
    top3Pass,
    protectedTokensPass,
    unknownWordSafe,
    protectedTokenFailures: ptFails,
  };
}

// ── Aggregate scoring ─────────────────────────────────────────────────────────

export interface CategoryResult {
  category: BenchmarkCategory;
  total: number;
  top1Correct: number;
  top3Correct: number;
  top1Accuracy: number;
  top3Accuracy: number;
  protectedTokenFailures: number;
}

export interface BenchmarkResult {
  engineName: string;
  split: BenchmarkSplit;
  totalExamples: number;
  top1Correct: number;
  top3Correct: number;
  top1Accuracy: number;
  top3Accuracy: number;
  protectedTokenIntegrity: number;
  unknownWordSafeRate: number;
  perCategory: CategoryResult[];
  failedExamples: ExampleScore[];
  meetsTop1Target: boolean;
  meetsTop3Target: boolean;
  meetsProtectedTokenTarget: boolean;
  meetsUnknownSafetyTarget: boolean;
}

/** Compute per-category breakdown from scored examples. */
export function aggregateByCategory(scores: ExampleScore[]): CategoryResult[] {
  const map = new Map<BenchmarkCategory, ExampleScore[]>();
  for (const s of scores) {
    if (!map.has(s.category)) map.set(s.category, []);
    map.get(s.category)!.push(s);
  }
  const results: CategoryResult[] = [];
  for (const [category, examples] of map) {
    const total = examples.length;
    const top1Correct = examples.filter(e => e.top1Pass).length;
    const top3Correct = examples.filter(e => e.top3Pass).length;
    results.push({
      category,
      total,
      top1Correct,
      top3Correct,
      top1Accuracy: total > 0 ? top1Correct / total : 0,
      top3Accuracy: total > 0 ? top3Correct / total : 0,
      protectedTokenFailures: examples.filter(e => !e.protectedTokensPass).length,
    });
  }
  return results.sort((a, b) => a.category.localeCompare(b.category));
}

/** Quality gate thresholds. */
export const QUALITY_GATES = {
  top1Accuracy: 0.90,
  top3Accuracy: 0.97,
  protectedTokenIntegrity: 1.0,
  destructiveUnknownRate: 0.01,
} as const;

/**
 * Run the full benchmark for a given split against an engine.
 * Deterministic: same input → same result for a given engine.
 */
export function runBenchmark(
  corpus: BenchmarkCorpus,
  engine: RomanUrduEngine,
  split: BenchmarkSplit = "development"
): BenchmarkResult {
  const examples = corpus.examples.filter(e => e.split === split);
  const scores = examples.map(ex => scoreExample(ex, engine.convert(ex.input)));

  const total = scores.length;
  const top1Correct = scores.filter(s => s.top1Pass).length;
  const top3Correct = scores.filter(s => s.top3Pass).length;
  const ptFailed = scores.filter(s => !s.protectedTokensPass).length;
  const unknownSafe = scores.filter(s => s.unknownWordSafe).length;

  const top1Accuracy = total > 0 ? top1Correct / total : 0;
  const top3Accuracy = total > 0 ? top3Correct / total : 0;
  const protectedTokenIntegrity = total > 0 ? (total - ptFailed) / total : 1;
  const unknownWordSafeRate = total > 0 ? unknownSafe / total : 1;

  return {
    engineName: engine.name,
    split,
    totalExamples: total,
    top1Correct,
    top3Correct,
    top1Accuracy,
    top3Accuracy,
    protectedTokenIntegrity,
    unknownWordSafeRate,
    perCategory: aggregateByCategory(scores),
    failedExamples: scores.filter(s => !s.top1Pass),
    meetsTop1Target: top1Accuracy >= QUALITY_GATES.top1Accuracy,
    meetsTop3Target: top3Accuracy >= QUALITY_GATES.top3Accuracy,
    meetsProtectedTokenTarget:
      protectedTokenIntegrity >= QUALITY_GATES.protectedTokenIntegrity,
    meetsUnknownSafetyTarget:
      1 - unknownWordSafeRate <= QUALITY_GATES.destructiveUnknownRate,
  };
}

// ── Corpus validation helpers ─────────────────────────────────────────────────

export interface CorpusValidationResult {
  valid: boolean;
  errors: string[];
}

export const VALID_CATEGORIES: readonly BenchmarkCategory[] = [
  "everyday",
  "spelling_variants",
  "mixed",
  "ambiguous",
  "names_places",
  "numbers_urls",
  "noisy",
];

export const VALID_SPLITS: readonly BenchmarkSplit[] = [
  "development",
  "holdout",
];

export function validateCorpus(corpus: BenchmarkCorpus): CorpusValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();

  let devCount = 0;
  let holdCount = 0;

  for (const ex of corpus.examples) {
    // Unique IDs
    if (ids.has(ex.id)) errors.push(`Duplicate ID: ${ex.id}`);
    else ids.add(ex.id);

    // Valid split
    if (!VALID_SPLITS.includes(ex.split)) {
      errors.push(`${ex.id}: invalid split "${ex.split}"`);
    } else {
      if (ex.split === "development") devCount++;
      else holdCount++;
    }

    // Valid category
    if (!VALID_CATEGORIES.includes(ex.category)) {
      errors.push(`${ex.id}: invalid category "${ex.category}"`);
    }

    // Non-empty input and expected
    if (!ex.input || !ex.input.trim()) errors.push(`${ex.id}: empty input`);
    if (!ex.expected || !ex.expected.trim()) errors.push(`${ex.id}: empty expected`);

    // Protected tokens present in expected
    if (ex.protectedTokens) {
      for (const token of ex.protectedTokens) {
        if (!ex.expected.includes(token)) {
          errors.push(
            `${ex.id}: protected token "${token}" not found in expected output`
          );
        }
      }
    }
  }

  // Split counts
  if (devCount !== corpus.meta.developmentCount) {
    errors.push(
      `Development count mismatch: meta says ${corpus.meta.developmentCount}, found ${devCount}`
    );
  }
  if (holdCount !== corpus.meta.holdoutCount) {
    errors.push(
      `Holdout count mismatch: meta says ${corpus.meta.holdoutCount}, found ${holdCount}`
    );
  }
  if (corpus.examples.length !== corpus.meta.totalExamples) {
    errors.push(
      `Total count mismatch: meta says ${corpus.meta.totalExamples}, found ${corpus.examples.length}`
    );
  }

  return { valid: errors.length === 0, errors };
}
