/**
 * Qalam Roman Urdu Benchmark — Infrastructure Tests
 *
 * Tests the corpus and scoring utilities themselves, not any engine.
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  validateCorpus,
  scoreExample,
  runBenchmark,
  aggregateByCategory,
  acceptableOutputs,
  tokenPreservedIn,
  VALID_CATEGORIES,
  VALID_SPLITS,
  QUALITY_GATES,
  type BenchmarkCorpus,
  type BenchmarkExample,
  type RomanUrduEngine,
  type EngineResult,
} from "../app/tools/roman-urdu-writer/utils/benchmarkScorer";

// ── Load corpus ───────────────────────────────────────────────────────────────

const CORPUS_PATH = join(__dirname, "fixtures", "romanUrduBenchmark.json");

function loadCorpus(): BenchmarkCorpus {
  return JSON.parse(readFileSync(CORPUS_PATH, "utf-8")) as BenchmarkCorpus;
}

// ── Corpus schema and integrity ───────────────────────────────────────────────

describe("Corpus — schema and integrity", () => {
  let corpus: BenchmarkCorpus;
  beforeAll(() => { corpus = loadCorpus(); });

  test("loads without throwing", () => {
    expect(corpus).toBeDefined();
    expect(corpus.meta).toBeDefined();
    expect(Array.isArray(corpus.examples)).toBe(true);
  });

  test("has exactly 300 examples", () => {
    expect(corpus.examples).toHaveLength(300);
    expect(corpus.meta.totalExamples).toBe(300);
  });

  test("has exactly 200 development examples", () => {
    const dev = corpus.examples.filter(e => e.split === "development");
    expect(dev).toHaveLength(200);
    expect(corpus.meta.developmentCount).toBe(200);
  });

  test("has exactly 100 holdout examples", () => {
    const hold = corpus.examples.filter(e => e.split === "holdout");
    expect(hold).toHaveLength(100);
    expect(corpus.meta.holdoutCount).toBe(100);
  });

  test("all IDs are unique", () => {
    const ids = corpus.examples.map(e => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test("all IDs follow ru-NNN pattern", () => {
    for (const ex of corpus.examples) {
      expect(ex.id).toMatch(/^ru-\d{3}$/);
    }
  });

  test("all splits are valid", () => {
    for (const ex of corpus.examples) {
      expect(VALID_SPLITS).toContain(ex.split);
    }
  });

  test("all categories are valid", () => {
    for (const ex of corpus.examples) {
      expect(VALID_CATEGORIES).toContain(ex.category);
    }
  });

  test("all examples have non-empty input", () => {
    for (const ex of corpus.examples) {
      expect(ex.input.trim().length).toBeGreaterThan(0);
    }
  });

  test("all examples have non-empty expected", () => {
    for (const ex of corpus.examples) {
      expect(ex.expected.trim().length).toBeGreaterThan(0);
    }
  });

  test("protected tokens are present in expected output", () => {
    const failures: string[] = [];
    for (const ex of corpus.examples) {
      if (!ex.protectedTokens) continue;
      for (const token of ex.protectedTokens) {
        if (!ex.expected.includes(token)) {
          failures.push(`${ex.id}: "${token}" not in expected`);
        }
      }
    }
    expect(failures).toHaveLength(0);
  });

  test("protectedTokens that appear in expected also appear in input", () => {
    const failures: string[] = [];
    for (const ex of corpus.examples) {
      if (!ex.protectedTokens) continue;
      for (const token of ex.protectedTokens) {
        if (!ex.input.includes(token)) {
          failures.push(`${ex.id}: protected token "${token}" not in input`);
        }
      }
    }
    expect(failures).toHaveLength(0);
  });

  test("corpus covers all 7 categories", () => {
    const found = new Set(corpus.examples.map(e => e.category));
    for (const cat of VALID_CATEGORIES) {
      expect(found.has(cat)).toBe(true);
    }
  });

  test("validateCorpus returns valid=true for the real corpus", () => {
    const result = validateCorpus(corpus);
    if (!result.valid) {
      console.error("Corpus errors:", result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("development examples span all categories", () => {
    const devCats = new Set(
      corpus.examples.filter(e => e.split === "development").map(e => e.category)
    );
    expect(devCats.size).toBe(VALID_CATEGORIES.length);
  });

  test("holdout examples span all categories", () => {
    const holdCats = new Set(
      corpus.examples.filter(e => e.split === "holdout").map(e => e.category)
    );
    expect(holdCats.size).toBe(VALID_CATEGORIES.length);
  });
});

// ── validateCorpus edge cases ─────────────────────────────────────────────────

describe("validateCorpus — error detection", () => {
  function makeMinimalCorpus(overrides: Partial<BenchmarkCorpus>): BenchmarkCorpus {
    const base: BenchmarkCorpus = {
      meta: {
        version: "1.0.0",
        description: "test",
        totalExamples: 1,
        developmentCount: 1,
        holdoutCount: 0,
        categories: ["everyday"],
        qualityGates: {
          top1AccuracyTarget: 0.9,
          top3AccuracyTarget: 0.97,
          protectedTokenIntegrity: 1.0,
          destructiveUnknownRate: 0.01,
        },
      },
      examples: [
        { id: "ru-001", split: "development", category: "everyday", input: "test", expected: "test" },
      ],
      ...overrides,
    };
    return base;
  }

  test("detects duplicate IDs", () => {
    const corpus = makeMinimalCorpus({
      meta: { version: "1.0.0", description: "test", totalExamples: 2, developmentCount: 2, holdoutCount: 0, categories: ["everyday"], qualityGates: { top1AccuracyTarget: 0.9, top3AccuracyTarget: 0.97, protectedTokenIntegrity: 1.0, destructiveUnknownRate: 0.01 } },
      examples: [
        { id: "ru-001", split: "development", category: "everyday", input: "a", expected: "a" },
        { id: "ru-001", split: "development", category: "everyday", input: "b", expected: "b" },
      ],
    });
    const result = validateCorpus(corpus);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Duplicate ID"))).toBe(true);
  });

  test("detects invalid category", () => {
    const corpus = makeMinimalCorpus({
      examples: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: "ru-001", split: "development", category: "INVALID" as any, input: "a", expected: "a" },
      ],
    });
    const result = validateCorpus(corpus);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("invalid category"))).toBe(true);
  });

  test("detects protected token missing from expected", () => {
    const corpus = makeMinimalCorpus({
      examples: [
        {
          id: "ru-001",
          split: "development",
          category: "everyday",
          input: "hello world",
          expected: "world",
          protectedTokens: ["hello"],
        },
      ],
    });
    const result = validateCorpus(corpus);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("hello"))).toBe(true);
  });

  test("detects dev count mismatch", () => {
    const corpus = makeMinimalCorpus({
      meta: { version: "1.0.0", description: "test", totalExamples: 1, developmentCount: 99, holdoutCount: 0, categories: ["everyday"], qualityGates: { top1AccuracyTarget: 0.9, top3AccuracyTarget: 0.97, protectedTokenIntegrity: 1.0, destructiveUnknownRate: 0.01 } },
    });
    const result = validateCorpus(corpus);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Development count mismatch"))).toBe(true);
  });

  test("detects empty input", () => {
    const corpus = makeMinimalCorpus({
      examples: [{ id: "ru-001", split: "development", category: "everyday", input: "  ", expected: "a" }],
    });
    const result = validateCorpus(corpus);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("empty input"))).toBe(true);
  });
});

// ── acceptableOutputs ─────────────────────────────────────────────────────────

describe("acceptableOutputs", () => {
  function ex(expected: string, alternatives?: string[]): BenchmarkExample {
    return { id: "t", split: "development", category: "everyday", input: "x", expected, acceptableAlternatives: alternatives };
  }

  test("returns just expected when no alternatives", () => {
    expect(acceptableOutputs(ex("A"))).toEqual(["A"]);
  });

  test("includes alternatives when present", () => {
    expect(acceptableOutputs(ex("A", ["B", "C"]))).toEqual(["A", "B", "C"]);
  });

  test("alternatives are not deduplicated (caller responsibility)", () => {
    expect(acceptableOutputs(ex("A", ["A"]))).toEqual(["A", "A"]);
  });
});

// ── tokenPreservedIn ──────────────────────────────────────────────────────────

describe("tokenPreservedIn", () => {
  test("finds exact token in string", () => {
    expect(tokenPreservedIn("Zoom", "کل Zoom meeting ہے")).toBe(true);
  });
  test("returns false when token absent", () => {
    expect(tokenPreservedIn("Zoom", "کل meeting ہے")).toBe(false);
  });
  test("is case-sensitive", () => {
    expect(tokenPreservedIn("Zoom", "zoom meeting")).toBe(false);
  });
  test("works for numeric tokens", () => {
    expect(tokenPreservedIn("500", "مجھے 500 روپے چاہیے")).toBe(true);
  });
  test("works for URL tokens", () => {
    expect(tokenPreservedIn("www.qalam.works", "www.qalam.works پر جاؤ")).toBe(true);
  });
  test("works for hashtag tokens", () => {
    expect(tokenPreservedIn("#PakistanZindabad", "#PakistanZindabad trend کر رہا ہے")).toBe(true);
  });
});

// ── scoreExample ──────────────────────────────────────────────────────────────

describe("scoreExample", () => {
  const baseEx: BenchmarkExample = {
    id: "ru-001",
    split: "development",
    category: "everyday",
    input: "kal Zoom meeting 8 baje hai",
    expected: "کل Zoom meeting 8 بجے ہے",
    protectedTokens: ["Zoom", "meeting", "8"],
  };

  test("exact match → top1Pass=true, top3Pass=true, protectedTokensPass=true", () => {
    const score = scoreExample(baseEx, { output: "کل Zoom meeting 8 بجے ہے" });
    expect(score.top1Pass).toBe(true);
    expect(score.top3Pass).toBe(true);
    expect(score.protectedTokensPass).toBe(true);
    expect(score.protectedTokenFailures).toHaveLength(0);
  });

  test("wrong output → top1Pass=false", () => {
    const score = scoreExample(baseEx, { output: "something wrong" });
    expect(score.top1Pass).toBe(false);
  });

  test("acceptable alternative in top1 → top1Pass=true", () => {
    const exAlt: BenchmarkExample = { ...baseEx, acceptableAlternatives: ["alt output"] };
    const score = scoreExample(exAlt, { output: "alt output" });
    expect(score.top1Pass).toBe(true);
  });

  test("correct in candidates but not top1 → top1Pass=false, top3Pass=true", () => {
    const score = scoreExample(baseEx, {
      output: "wrong first",
      candidates: [
        { output: "wrong first" },
        { output: "کل Zoom meeting 8 بجے ہے" },
      ],
    });
    expect(score.top1Pass).toBe(false);
    expect(score.top3Pass).toBe(true);
  });

  test("correct candidate beyond index 2 does NOT count for top3", () => {
    const score = scoreExample(baseEx, {
      output: "wrong",
      candidates: [
        { output: "wrong" },
        { output: "wrong2" },
        { output: "wrong3" },
        { output: "کل Zoom meeting 8 بجے ہے" },
      ],
    });
    expect(score.top3Pass).toBe(false);
  });

  test("protected token missing → protectedTokensPass=false, failure listed", () => {
    const score = scoreExample(baseEx, { output: "کل Zoom 8 بجے ہے" }); // "meeting" missing
    expect(score.protectedTokensPass).toBe(false);
    expect(score.protectedTokenFailures).toContain("meeting");
    expect(score.protectedTokenFailures).not.toContain("Zoom");
  });

  test("all protected tokens missing → all listed in failures", () => {
    const score = scoreExample(baseEx, { output: "یہ بے ترتیب آؤٹ پٹ ہے" });
    expect(score.protectedTokenFailures).toContain("Zoom");
    expect(score.protectedTokenFailures).toContain("meeting");
    expect(score.protectedTokenFailures).toContain("8");
  });

  test("example with no protectedTokens → protectedTokensPass always true", () => {
    const ex: BenchmarkExample = { id: "t", split: "development", category: "everyday", input: "aaj", expected: "آج" };
    const score = scoreExample(ex, { output: "wrong" });
    expect(score.protectedTokensPass).toBe(true);
    expect(score.protectedTokenFailures).toHaveLength(0);
  });

  test("multiple acceptable alternatives — all accepted at top1", () => {
    const ex: BenchmarkExample = {
      id: "t", split: "development", category: "spelling_variants",
      input: "bohot acha", expected: "بہت اچھا", acceptableAlternatives: ["بوہت اچھا"],
    };
    const s1 = scoreExample(ex, { output: "بہت اچھا" });
    const s2 = scoreExample(ex, { output: "بوہت اچھا" });
    expect(s1.top1Pass).toBe(true);
    expect(s2.top1Pass).toBe(true);
  });

  test("score preserves input/expected/actual on result object", () => {
    const score = scoreExample(baseEx, { output: "my output" });
    expect(score.input).toBe(baseEx.input);
    expect(score.expected).toBe(baseEx.expected);
    expect(score.actual).toBe("my output");
  });
});

// ── Unknown-word safety ───────────────────────────────────────────────────────

describe("scoreExample — unknown-word safety", () => {
  test("noisy example with known token preserved → unknownWordSafe=true", () => {
    const ex: BenchmarkExample = {
      id: "t", split: "development", category: "noisy",
      input: "xyzblarg nahi mila", expected: "xyzblarg نہیں ملا",
      protectedTokens: ["xyzblarg"],
    };
    const score = scoreExample(ex, { output: "xyzblarg نہیں ملا" });
    expect(score.unknownWordSafe).toBe(true);
  });

  test("noisy example with unknown token destructively converted → unknownWordSafe=false", () => {
    const ex: BenchmarkExample = {
      id: "t", split: "development", category: "noisy",
      input: "xyzblarg nahi mila", expected: "xyzblarg نہیں ملا",
      protectedTokens: ["xyzblarg"],
    };
    const score = scoreExample(ex, { output: "ایکس وائی زیڈ نہیں ملا" }); // token destroyed
    expect(score.unknownWordSafe).toBe(false);
  });

  test("non-noisy category → unknownWordSafe=true regardless", () => {
    const ex: BenchmarkExample = {
      id: "t", split: "development", category: "everyday",
      input: "aaj jana hai", expected: "آج جانا ہے",
    };
    const score = scoreExample(ex, { output: "something completely different" });
    expect(score.unknownWordSafe).toBe(true);
  });
});

// ── runBenchmark aggregate ────────────────────────────────────────────────────

describe("runBenchmark", () => {
  let corpus: BenchmarkCorpus;
  beforeAll(() => { corpus = loadCorpus(); });

  /** Perfect engine — always returns the expected output with no candidates. */
  const perfectEngine: RomanUrduEngine = {
    name: "perfect-mock",
    convert(input: string): EngineResult {
      const ex = corpus.examples.find(e => e.input === input);
      return { output: ex?.expected ?? input };
    },
  };

  /** Terrible engine — always returns empty string. */
  const brokenEngine: RomanUrduEngine = {
    name: "broken-mock",
    convert(): EngineResult { return { output: "" }; },
  };

  test("perfect engine scores Top-1 = 100% on development", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    expect(result.top1Accuracy).toBe(1.0);
    expect(result.top1Correct).toBe(200);
    expect(result.totalExamples).toBe(200);
  });

  test("perfect engine scores Top-3 = 100% on development", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    expect(result.top3Accuracy).toBe(1.0);
  });

  test("perfect engine has protectedTokenIntegrity = 1.0", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    expect(result.protectedTokenIntegrity).toBe(1.0);
  });

  test("perfect engine passes all quality gates", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    expect(result.meetsTop1Target).toBe(true);
    expect(result.meetsTop3Target).toBe(true);
    expect(result.meetsProtectedTokenTarget).toBe(true);
  });

  test("broken engine scores Top-1 = 0%", () => {
    const result = runBenchmark(corpus, brokenEngine, "development");
    expect(result.top1Accuracy).toBe(0);
    expect(result.meetsTop1Target).toBe(false);
  });

  test("broken engine fails protected-token target", () => {
    const result = runBenchmark(corpus, brokenEngine, "development");
    expect(result.meetsProtectedTokenTarget).toBe(false);
  });

  test("holdout split uses 100 examples", () => {
    const result = runBenchmark(corpus, perfectEngine, "holdout");
    expect(result.totalExamples).toBe(100);
    expect(result.top1Correct).toBe(100);
  });

  test("engineName is preserved in result", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    expect(result.engineName).toBe("perfect-mock");
  });

  test("failedExamples is empty for perfect engine", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    expect(result.failedExamples).toHaveLength(0);
  });

  test("failedExamples lists all 200 for broken engine on dev", () => {
    const result = runBenchmark(corpus, brokenEngine, "development");
    expect(result.failedExamples).toHaveLength(200);
  });

  test("result is deterministic across two identical runs", () => {
    const r1 = runBenchmark(corpus, perfectEngine, "development");
    const r2 = runBenchmark(corpus, perfectEngine, "development");
    expect(r1.top1Accuracy).toBe(r2.top1Accuracy);
    expect(r1.top1Correct).toBe(r2.top1Correct);
  });
});

// ── aggregateByCategory ───────────────────────────────────────────────────────

describe("aggregateByCategory", () => {
  let corpus: BenchmarkCorpus;
  let perfectEngine: RomanUrduEngine;
  beforeAll(() => {
    corpus = loadCorpus();
    perfectEngine = {
      name: "perfect",
      convert(input: string): EngineResult {
        const ex = corpus.examples.find(e => e.input === input);
        return { output: ex?.expected ?? input };
      },
    };
  });

  test("returns one entry per category present in scored examples", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    const cats = result.perCategory.map(c => c.category);
    for (const cat of VALID_CATEGORIES) {
      expect(cats).toContain(cat);
    }
  });

  test("per-category totals sum to overall total", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    const catTotal = result.perCategory.reduce((s, c) => s + c.total, 0);
    expect(catTotal).toBe(result.totalExamples);
  });

  test("perfect engine: all categories have top1Accuracy = 1.0", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    for (const cat of result.perCategory) {
      expect(cat.top1Accuracy).toBe(1.0);
    }
  });

  test("per-category top1Correct matches total for perfect engine", () => {
    const result = runBenchmark(corpus, perfectEngine, "development");
    for (const cat of result.perCategory) {
      expect(cat.top1Correct).toBe(cat.total);
    }
  });
});

// ── Quality gate constants ────────────────────────────────────────────────────

describe("QUALITY_GATES constants", () => {
  test("top1Accuracy target is 0.90", () => {
    expect(QUALITY_GATES.top1Accuracy).toBe(0.90);
  });
  test("top3Accuracy target is 0.97", () => {
    expect(QUALITY_GATES.top3Accuracy).toBe(0.97);
  });
  test("protectedTokenIntegrity target is 1.0", () => {
    expect(QUALITY_GATES.protectedTokenIntegrity).toBe(1.0);
  });
  test("destructiveUnknownRate target is 0.01", () => {
    expect(QUALITY_GATES.destructiveUnknownRate).toBe(0.01);
  });
});
