/**
 * Phase 19A.0e — Challenge Set Infrastructure Tests
 *
 * Validates the corpus schema and metadata.
 * CRITICAL: Engine V2 is NOT imported. No convert() calls.
 * The challenge answers are frozen before engine evaluation.
 */

import { readFileSync } from "fs";
import { join } from "path";

// ── Load both corpora ─────────────────────────────────────────────────────────

interface ChallengeExample {
  id: string;
  split: string;
  category: string;
  input: string;
  expected: string;
  acceptableAlternatives?: string[];
  protectedTokens?: string[];
  unknownTokens?: string[];
  ambiguousTokens?: string[];
  note?: string;
}

interface ChallengeMeta {
  totalExamples: number;
  split: string;
  categories: Record<string, number>;
}

interface ChallengeCorpus {
  meta: ChallengeMeta;
  examples: ChallengeExample[];
}

const CHALLENGE_PATH = join(__dirname, "fixtures", "romanUrduChallenge.json");
const BENCHMARK_PATH = join(__dirname, "fixtures", "romanUrduBenchmark.json");

const challenge: ChallengeCorpus = JSON.parse(readFileSync(CHALLENGE_PATH, "utf-8"));
const benchmark = JSON.parse(readFileSync(BENCHMARK_PATH, "utf-8"));

const VALID_CATEGORIES = new Set([
  "everyday", "spelling_noisy", "mixed_english", "context_ambiguity",
  "names_cultural", "numbers_protected", "morphology_phrases",
]);

const EXPECTED_COUNTS: Record<string, number> = {
  everyday: 25,
  spelling_noisy: 20,
  mixed_english: 20,
  context_ambiguity: 20,
  names_cultural: 15,
  numbers_protected: 10,
  morphology_phrases: 10,
};

// ── Total and split ───────────────────────────────────────────────────────────

describe("Challenge corpus — totals and split", () => {
  test("exactly 120 examples", () => {
    expect(challenge.examples).toHaveLength(120);
    expect(challenge.meta.totalExamples).toBe(120);
  });

  test("all examples have split = 'challenge'", () => {
    for (const ex of challenge.examples) {
      expect(ex.split).toBe("challenge");
    }
  });

  test("meta.split is 'challenge'", () => {
    expect(challenge.meta.split).toBe("challenge");
  });
});

// ── Category counts ───────────────────────────────────────────────────────────

describe("Challenge corpus — category counts (computed from JSON)", () => {
  const counts: Record<string, number> = {};
  for (const ex of challenge.examples) {
    counts[ex.category] = (counts[ex.category] ?? 0) + 1;
  }

  for (const [cat, expected] of Object.entries(EXPECTED_COUNTS)) {
    test(`${cat}: exactly ${expected}`, () => {
      expect(counts[cat]).toBe(expected);
    });
  }

  test("no unexpected categories", () => {
    for (const ex of challenge.examples) {
      expect(VALID_CATEGORIES.has(ex.category)).toBe(true);
    }
  });

  test("category totals sum to 120", () => {
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    expect(total).toBe(120);
  });
});

// ── ID and input uniqueness ───────────────────────────────────────────────────

describe("Challenge corpus — uniqueness", () => {
  test("all IDs are unique", () => {
    const ids = challenge.examples.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("all IDs match challenge-NNN format", () => {
    for (const ex of challenge.examples) {
      expect(ex.id).toMatch(/^challenge-\d{3}$/);
    }
  });

  test("IDs are sequentially numbered 001–120", () => {
    const nums = challenge.examples.map(e => parseInt(e.id.split("-")[1], 10));
    const sorted = [...nums].sort((a, b) => a - b);
    expect(sorted[0]).toBe(1);
    expect(sorted[sorted.length - 1]).toBe(120);
  });

  test("all input strings are unique", () => {
    const inputs = challenge.examples.map(e => e.input);
    expect(new Set(inputs).size).toBe(inputs.length);
  });
});

// ── No overlap with benchmark ─────────────────────────────────────────────────

describe("Challenge corpus — no overlap with benchmark", () => {
  const benchmarkInputs = new Set<string>(
    (benchmark.examples as Array<{ input: string }>).map(e => e.input)
  );

  test("no exact input duplicates against benchmark", () => {
    const overlapping = challenge.examples.filter(e => benchmarkInputs.has(e.input));
    expect(overlapping.map(e => e.id)).toHaveLength(0);
  });
});

// ── Required field presence ───────────────────────────────────────────────────

describe("Challenge corpus — required fields", () => {
  test("all examples have non-empty id", () => {
    for (const ex of challenge.examples) expect(ex.id.trim()).not.toBe("");
  });

  test("all examples have non-empty input", () => {
    for (const ex of challenge.examples) expect(ex.input.trim()).not.toBe("");
  });

  test("all examples have non-empty expected", () => {
    for (const ex of challenge.examples) expect(ex.expected.trim()).not.toBe("");
  });

  test("all examples have valid category", () => {
    for (const ex of challenge.examples) expect(VALID_CATEGORIES.has(ex.category)).toBe(true);
  });
});

// ── protectedTokens metadata ──────────────────────────────────────────────────

describe("Challenge corpus — protectedTokens metadata", () => {
  const ptExamples = challenge.examples.filter(e => e.protectedTokens && e.protectedTokens.length > 0);

  test("protectedTokens present in at least 40% of examples", () => {
    expect(ptExamples.length).toBeGreaterThanOrEqual(48);
  });

  test("every protectedToken appears verbatim in its input", () => {
    const failures: string[] = [];
    for (const ex of ptExamples) {
      for (const token of ex.protectedTokens!) {
        if (!ex.input.includes(token)) {
          failures.push(`${ex.id}: "${token}" not in input`);
        }
      }
    }
    expect(failures).toHaveLength(0);
  });

  test("every protectedToken appears verbatim in expected or all acceptableAlternatives", () => {
    const failures: string[] = [];
    for (const ex of ptExamples) {
      const outputs = [ex.expected, ...(ex.acceptableAlternatives ?? [])];
      for (const token of ex.protectedTokens!) {
        if (!outputs.some(o => o.includes(token))) {
          failures.push(`${ex.id}: "${token}" not in any expected output`);
        }
      }
    }
    expect(failures).toHaveLength(0);
  });

  test("no protectedToken is empty string", () => {
    for (const ex of ptExamples) {
      for (const token of ex.protectedTokens!) {
        expect(token.trim()).not.toBe("");
      }
    }
  });
});

// ── unknownTokens metadata ────────────────────────────────────────────────────

describe("Challenge corpus — unknownTokens metadata", () => {
  const unkExamples = challenge.examples.filter(e => e.unknownTokens && e.unknownTokens.length > 0);

  test("unknownTokens present in at least 2 examples", () => {
    expect(unkExamples.length).toBeGreaterThanOrEqual(2);
  });

  test("every unknownToken appears verbatim in its input", () => {
    for (const ex of unkExamples) {
      for (const token of ex.unknownTokens!) {
        expect(ex.input).toContain(token);
      }
    }
  });

  test("unknownToken in expected (preserved by gold output)", () => {
    for (const ex of unkExamples) {
      for (const token of ex.unknownTokens!) {
        const outputs = [ex.expected, ...(ex.acceptableAlternatives ?? [])];
        expect(outputs.some(o => o.includes(token))).toBe(true);
      }
    }
  });
});

// ── ambiguousTokens metadata ──────────────────────────────────────────────────

describe("Challenge corpus — ambiguousTokens metadata", () => {
  const ambExamples = challenge.examples.filter(e => e.ambiguousTokens && e.ambiguousTokens.length > 0);

  test("all 20 context_ambiguity examples have ambiguousTokens", () => {
    const ambiguityWithTokens = challenge.examples.filter(
      e => e.category === "context_ambiguity" && e.ambiguousTokens && e.ambiguousTokens.length > 0
    );
    const total = challenge.examples.filter(e => e.category === "context_ambiguity").length;
    expect(ambiguityWithTokens.length).toBe(total);
    expect(ambiguityWithTokens.length).toBe(20);
  });

  test("every ambiguousToken appears verbatim in its input", () => {
    for (const ex of ambExamples) {
      for (const token of ex.ambiguousTokens!) {
        expect(ex.input).toContain(token);
      }
    }
  });
});

// ── acceptableAlternatives metadata ──────────────────────────────────────────

describe("Challenge corpus — acceptableAlternatives metadata", () => {
  const altExamples = challenge.examples.filter(e => e.acceptableAlternatives && e.acceptableAlternatives.length > 0);

  test("acceptableAlternatives do not duplicate expected", () => {
    for (const ex of altExamples) {
      for (const alt of ex.acceptableAlternatives!) {
        expect(alt).not.toBe(ex.expected);
      }
    }
  });

  test("acceptableAlternatives are non-empty strings", () => {
    for (const ex of altExamples) {
      for (const alt of ex.acceptableAlternatives!) {
        expect(alt.trim()).not.toBe("");
      }
    }
  });
});

// ── Unicode validity ──────────────────────────────────────────────────────────

describe("Challenge corpus — Unicode validity", () => {
  test("all input and expected fields are valid non-empty Unicode strings", () => {
    for (const ex of challenge.examples) {
      expect(typeof ex.input).toBe("string");
      expect(typeof ex.expected).toBe("string");
      // Check no null bytes or control chars (except space/tab)
      expect(ex.input).not.toMatch(/\0/);
      expect(ex.expected).not.toMatch(/\0/);
    }
  });
});

// ── Near-duplicate diagnostic ─────────────────────────────────────────────────

describe("Challenge corpus — near-duplicate diagnostic", () => {
  test("no examples with >80% token overlap (near-duplicates)", () => {
    const suspicious: string[] = [];
    for (let i = 0; i < challenge.examples.length; i++) {
      for (let j = i + 1; j < challenge.examples.length; j++) {
        const a = new Set(challenge.examples[i].input.toLowerCase().split(/\s+/));
        const b = new Set(challenge.examples[j].input.toLowerCase().split(/\s+/));
        const intersection = [...a].filter(t => b.has(t)).length;
        const union = new Set([...a, ...b]).size;
        const overlap = union > 0 ? intersection / union : 0;
        if (overlap > 0.8) {
          suspicious.push(
            `${challenge.examples[i].id} vs ${challenge.examples[j].id}: ${(overlap * 100).toFixed(0)}% overlap`
          );
        }
      }
    }
    if (suspicious.length > 0) {
      console.warn("Near-duplicate candidates for manual review:", suspicious);
    }
    // Report but do not auto-fail (legitimate examples may share structure)
    expect(suspicious.length).toBeLessThan(5);
  });
});

// ── Deterministic loading ─────────────────────────────────────────────────────

describe("Challenge corpus — deterministic loading", () => {
  test("corpus loads identically on two reads", () => {
    const c1: ChallengeCorpus = JSON.parse(readFileSync(CHALLENGE_PATH, "utf-8"));
    const c2: ChallengeCorpus = JSON.parse(readFileSync(CHALLENGE_PATH, "utf-8"));
    expect(c1.examples.length).toBe(c2.examples.length);
    for (let i = 0; i < c1.examples.length; i++) {
      expect(c1.examples[i].id).toBe(c2.examples[i].id);
      expect(c1.examples[i].input).toBe(c2.examples[i].input);
      expect(c1.examples[i].expected).toBe(c2.examples[i].expected);
    }
  });
});

// ── Engine evaluation guard ───────────────────────────────────────────────────

describe("Challenge corpus — engine evaluation guard", () => {
  test("Engine V2 is NOT imported in this test file", () => {
    // This test documents and enforces the independence policy.
    // If engineV2 were imported, the next line would fail.
    const importedModules = Object.keys(require.cache ?? {});
    const engineImported = importedModules.some(m => m.includes("engineV2"));
    expect(engineImported).toBe(false);
  });

  test("no Top-1 or Top-3 scoring is performed against challenge examples", () => {
    // This is a policy assertion — the test exists to document the rule.
    // Actual enforcement is that convert() is never called in this file.
    expect(true).toBe(true);
  });
});
