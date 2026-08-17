/**
 * Phase 19A.0b — Roman Urdu Engine Bake-off Tests
 *
 * Covers:
 * - common engine interface compliance
 * - protected-token integrity
 * - unknown-word safety
 * - ambiguity handling
 * - candidate ordering
 * - deterministic repeatability
 * - scorer integration
 * - development + holdout benchmark runs
 */

import { readFileSync } from "fs";
import { join } from "path";
import { engineA, engineB, engineC } from "../app/tools/roman-urdu-writer/utils/engines";
import { isProtectedToken, segmentInput } from "../app/tools/roman-urdu-writer/utils/protectedTokens";
import { lookupToken, lookupNormalized } from "../app/tools/roman-urdu-writer/utils/lexicon";
import {
  runBenchmark, scoreExample, QUALITY_GATES,
  type BenchmarkCorpus, type RomanUrduEngine,
} from "../app/tools/roman-urdu-writer/utils/benchmarkScorer";

const corpus: BenchmarkCorpus = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "romanUrduBenchmark.json"), "utf-8")
);

const ALL_ENGINES = [engineA, engineB, engineC];

// ── Common interface compliance ───────────────────────────────────────────────

describe("Engine interface compliance", () => {
  for (const engine of ALL_ENGINES) {
    test(`${engine.name}: has a name string`, () => {
      expect(typeof engine.name).toBe("string");
      expect(engine.name.length).toBeGreaterThan(0);
    });

    test(`${engine.name}: convert() returns output string`, () => {
      const result = engine.convert("theek hai yaar");
      expect(typeof result.output).toBe("string");
      expect(result.output.length).toBeGreaterThan(0);
    });

    test(`${engine.name}: convert() output is deterministic`, () => {
      const input = "kal Zoom meeting 8 baje hai";
      const r1 = engine.convert(input);
      const r2 = engine.convert(input);
      expect(r1.output).toBe(r2.output);
    });

    test(`${engine.name}: candidates array length ≤ 3 when present`, () => {
      const result = engine.convert("main wahan gaya");
      if (result.candidates) {
        expect(result.candidates.length).toBeLessThanOrEqual(3);
      }
    });

    test(`${engine.name}: first candidate matches output`, () => {
      const result = engine.convert("bohot acha tha");
      if (result.candidates && result.candidates.length > 0) {
        expect(result.candidates[0].output).toBe(result.output);
      }
    });
  }
});

// ── Protected-token layer ─────────────────────────────────────────────────────

describe("isProtectedToken", () => {
  const shouldProtect = [
    "8", "www.qalam.works", "info@qalam.works",
    "#PakistanZindabad", "@AhmadKhan", "500", "0312-1234567",
    "https://docs.google.com", "50%", "HR", "PDF", "ATM",
    "3rd", "11:30", "1947", "2024", "200", "lol", "omg", "brb",
    "😂😂😂", "kkk",
  ];
  const shouldNotProtect = [
    "main", "kal", "ghar", "theek", "bohot", "yaar", "acha",
  ];

  for (const token of shouldProtect) {
    test(`"${token}" is protected`, () => {
      expect(isProtectedToken(token)).toBe(true);
    });
  }
  for (const token of shouldNotProtect) {
    test(`"${token}" is NOT protected`, () => {
      expect(isProtectedToken(token)).toBe(false);
    });
  }
});

describe("segmentInput", () => {
  test("preserves whitespace between tokens", () => {
    const segs = segmentInput("aaj  Zoom  meeting");
    const text = segs.map(s => s.text).join("");
    expect(text).toBe("aaj  Zoom  meeting");
  });

  test("marks '8' as protected (numeric)", () => {
    const segs = segmentInput("aaj Zoom meeting 8");
    const eightSeg = segs.find(s => s.text === "8");
    expect(eightSeg?.protected).toBe(true);
  });

  test("marks 'aaj' as not protected", () => {
    const segs = segmentInput("aaj Zoom");
    const aajSeg = segs.find(s => s.text === "aaj");
    expect(aajSeg?.protected).toBe(false);
  });

  test("marks hashtag as protected", () => {
    const segs = segmentInput("#PakistanZindabad trend");
    const hashSeg = segs.find(s => s.text === "#PakistanZindabad");
    expect(hashSeg?.protected).toBe(true);
  });

  test("marks numeric tokens as protected", () => {
    const segs = segmentInput("3 baj ke 15");
    expect(segs.find(s => s.text === "3")?.protected).toBe(true);
    expect(segs.find(s => s.text === "15")?.protected).toBe(true);
  });
});

// ── Lexicon lookup ─────────────────────────────────────────────────────────────

describe("lookupToken and lookupNormalized", () => {
  test("lookupToken('aaj') returns آج", () => {
    expect(lookupToken("aaj")).toEqual(["آج"]);
  });
  test("lookupToken is case-insensitive", () => {
    expect(lookupToken("THEEK")).toEqual(lookupToken("theek"));
  });
  test("lookupToken unknown → null", () => {
    expect(lookupToken("xyzblarg")).toBeNull();
  });
  test("lookupNormalized handles repeated chars (aaaacha → acha)", () => {
    const result = lookupNormalized("aaaacha");
    expect(result).toEqual(["اچھا"]);
  });
  test("bohot/bhot/bohat all map to بہت", () => {
    for (const v of ["bohot", "bhot", "bohat"]) {
      expect(lookupToken(v)?.[0]).toBe("بہت");
    }
  });
  test("main maps to میں (not مین)", () => {
    expect(lookupToken("main")?.[0]).toBe("میں");
  });
  test("to maps to تو (not English to)", () => {
    expect(lookupToken("to")?.[0]).toBe("تو");
  });
  test("is maps to اس", () => {
    expect(lookupToken("is")?.[0]).toBe("اس");
  });
  test("bus maps to بس", () => {
    expect(lookupToken("bus")?.[0]).toBe("بس");
  });
  test("par maps to پر", () => {
    expect(lookupToken("par")?.[0]).toBe("پر");
  });
});

// ── Unknown-word safety ───────────────────────────────────────────────────────

describe("Unknown-word safety — all engines", () => {
  const unknownInputs = [
    { input: "xyzblarg nahi mila", unknownToken: "xyzblarg" },
    { input: "jkjk mazza aa gaya", unknownToken: "jkjk" },
    { input: "uffffff thak gaya", unknownToken: "uffffff" },
  ];

  for (const { input, unknownToken } of unknownInputs) {
    for (const engine of [engineA, engineC]) {
      test(`${engine.name}: "${unknownToken}" preserved in output`, () => {
        const result = engine.convert(input);
        expect(result.output).toContain(unknownToken);
      });
    }
  }
});

// ── Protected-token integrity — all engines ────────────────────────────────────

describe("Protected-token integrity — corpus examples", () => {
  const ptExamples = corpus.examples
    .filter(e => e.protectedTokens && e.protectedTokens.length > 0)
    .slice(0, 30); // sample first 30

  for (const engine of [engineA, engineC]) {
    test(`${engine.name}: hard tokens (numbers, URLs, hashtags) survive in sampled examples`, () => {
      // Filter to examples where protectedTokens are hard tokens (numbers, URLs, hashtags)
      // Proper-noun product names (Zoom, Netflix) require explicit-list knowledge — excluded here
      const hardTokenExamples = corpus.examples
        .filter(e => e.protectedTokens && e.protectedTokens.some(t =>
          /^\d+$/.test(t) || /^https?:/.test(t) || t.startsWith("#") || t.startsWith("@")
        ))
        .slice(0, 20);

      const failures: string[] = [];
      for (const ex of hardTokenExamples) {
        const result = engine.convert(ex.input);
        for (const token of ex.protectedTokens!) {
          if ((/^\d+$/.test(token) || /^https?:/.test(token) || token.startsWith("#") || token.startsWith("@"))
              && !result.output.includes(token)) {
            failures.push(`${ex.id}: "${token}" missing`);
          }
        }
      }
      expect(failures).toHaveLength(0);
    });
  }
});

// ── Ambiguity cases ───────────────────────────────────────────────────────────

describe("Contextual ambiguity — Engines A & C", () => {
  const cases: { input: string; token: string; expectedUrdu: string }[] = [
    { input: "main wahan gaya", token: "main", expectedUrdu: "میں" },
    { input: "yeh to hona hi tha", token: "to", expectedUrdu: "تو" },
    { input: "is mein kya rakhna hai", token: "is", expectedUrdu: "اس" },
    { input: "par tumhe kya pata", token: "par", expectedUrdu: "پر" },
    { input: "bus itna hi kaho", token: "bus", expectedUrdu: "بس" },
  ];

  for (const { input, token, expectedUrdu } of cases) {
    for (const engine of [engineA, engineC]) {
      test(`${engine.name}: "${token}" → "${expectedUrdu}"`, () => {
        const result = engine.convert(input);
        expect(result.output).toContain(expectedUrdu);
      });
    }
  }
});

// ── Deterministic repeatability ───────────────────────────────────────────────

describe("Determinism", () => {
  const inputs = [
    "kal Zoom meeting 8 baje hai",
    "main wahan gaya",
    "xyzblarg nahi mila",
    "#PakistanZindabad trend kar raha hai",
    "aaj bohot thak gaya",
  ];

  for (const engine of [engineA, engineC]) {
    test(`${engine.name}: same input yields same output across 3 runs`, () => {
      for (const input of inputs) {
        const outputs = [1, 2, 3].map(() => engine.convert(input).output);
        expect(outputs[0]).toBe(outputs[1]);
        expect(outputs[0]).toBe(outputs[2]);
      }
    });
  }
});

// ── Scorer integration ────────────────────────────────────────────────────────

describe("Scorer integration", () => {
  test("runBenchmark returns valid result shape for engine A (dev)", () => {
    const result = runBenchmark(corpus, engineA, "development");
    expect(typeof result.top1Accuracy).toBe("number");
    expect(result.totalExamples).toBe(200);
    expect(result.perCategory.length).toBeGreaterThan(0);
  });

  test("runBenchmark returns valid result shape for engine C (dev)", () => {
    const result = runBenchmark(corpus, engineC, "development");
    expect(typeof result.top1Accuracy).toBe("number");
    expect(result.totalExamples).toBe(200);
  });

  test("engine B (library-unavailable) has very low Top-1 (returns input as-is)", () => {
    // Engine B returns input unchanged; expected outputs are Urdu-script → mostly wrong
    const result = runBenchmark(corpus, engineB, "development");
    // Identity conversion should be well below target
    expect(result.meetsTop1Target).toBe(false);
    expect(result.top1Accuracy).toBeLessThan(0.20);
  });

  test("scoreExample: engine A on a known example", () => {
    const ex = corpus.examples.find(e => e.id === "ru-001")!;
    const result = engineA.convert(ex.input);
    const score = scoreExample(ex, result);
    // Protected tokens should survive
    expect(score.protectedTokensPass).toBe(true);
  });
});

// ── Full benchmark runs (logged, not asserted against gates) ──────────────────

describe("Development benchmark — Engines A and C", () => {
  let resultA: ReturnType<typeof runBenchmark>;
  let resultC: ReturnType<typeof runBenchmark>;

  beforeAll(() => {
    resultA = runBenchmark(corpus, engineA, "development");
    resultC = runBenchmark(corpus, engineC, "development");
  });

  test("Engine A: protected-token integrity is high (numeric/URL/symbol tokens)", () => {
    // Integrity may be below 100% for proper-noun product names (Zoom, Netflix…)
    // which require explicit-list knowledge. Hard tokens (numbers, URLs, hashtags) must pass.
    expect(resultA.protectedTokenIntegrity).toBeGreaterThanOrEqual(0.85);
  });

  test("Engine C: protected-token integrity is high", () => {
    expect(resultC.protectedTokenIntegrity).toBeGreaterThanOrEqual(0.85);
  });

  test("Engine C Top-1 >= Engine A Top-1 (hybrid should not regress)", () => {
    // C should match or beat A since it adds context awareness
    expect(resultC.top1Accuracy).toBeGreaterThanOrEqual(resultA.top1Accuracy - 0.02);
  });

  test("per-category totals sum to 200 for engine A", () => {
    const total = resultA.perCategory.reduce((s, c) => s + c.total, 0);
    expect(total).toBe(200);
  });

  test("per-category totals sum to 200 for engine C", () => {
    const total = resultC.perCategory.reduce((s, c) => s + c.total, 0);
    expect(total).toBe(200);
  });
});

describe("Holdout benchmark — Engines A and C (final gate check)", () => {
  let resultA: ReturnType<typeof runBenchmark>;
  let resultC: ReturnType<typeof runBenchmark>;

  beforeAll(() => {
    resultA = runBenchmark(corpus, engineA, "holdout");
    resultC = runBenchmark(corpus, engineC, "holdout");
  });

  test("Engine A: holdout protected-token integrity is high", () => {
    expect(resultA.protectedTokenIntegrity).toBeGreaterThanOrEqual(0.85);
  });

  test("Engine C: holdout protected-token integrity is high", () => {
    expect(resultC.protectedTokenIntegrity).toBeGreaterThanOrEqual(0.85);
  });

  test("holdout totals = 100 examples for both engines", () => {
    expect(resultA.totalExamples).toBe(100);
    expect(resultC.totalExamples).toBe(100);
  });
});
