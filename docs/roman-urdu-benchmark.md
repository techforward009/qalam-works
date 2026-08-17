# Qalam Roman Urdu Benchmark — Design Document

## Overview

The Roman Urdu Benchmark (Phase 19A.0a) provides a **language-neutral evaluation harness** for Qalam Urdu Writer. It defines a realistic corpus of Roman Urdu inputs with expected Urdu-script outputs, and a scoring system that any candidate engine can run against.

The benchmark tests quality; it does not implement any conversion logic.

---

## Corpus Design

### File

`tests/fixtures/romanUrduBenchmark.json`

### Size and Split

| Split       | Count | Purpose                                      |
|-------------|-------|----------------------------------------------|
| development | 200   | Engine development, hyperparameter tuning     |
| holdout     | 100   | Final acceptance evaluation only             |

**The holdout split must not be exposed to engine training pipelines.**

### Category Distribution

Counts are programmatically verified by `tests/romanUrduBenchmark.test.ts`.

| Category          | Dev | Holdout | Total |
|-------------------|-----|---------|-------|
| everyday          |  39 |      20 |    59 |
| spelling_variants |  32 |      15 |    47 |
| mixed             |  31 |      14 |    45 |
| ambiguous         |  28 |      12 |    40 |
| names_places      |  23 |      13 |    36 |
| numbers_urls      |  23 |      12 |    35 |
| noisy             |  24 |      14 |    38 |
| **Total**         | **200** | **100** | **300** |

### Categories

| Category          | What it covers                                                       |
|-------------------|----------------------------------------------------------------------|
| `everyday`        | Casual WhatsApp / conversational messages                           |
| `spelling_variants` | Non-standard spellings common in Pakistani Roman Urdu              |
| `mixed`           | Urdu sentences with embedded English words/phrases                  |
| `ambiguous`       | Tokens that could be Urdu or English (main, to, is, par, bus, na)   |
| `names_places`    | Proper names, cities, religious terms, cultural references          |
| `numbers_urls`    | Digits, dates, URLs, email addresses, hashtags, mentions            |
| `noisy`           | Internet slang, repeated characters, unknown words, emoji runs      |

### Example Schema

```jsonc
{
  "id": "ru-001",               // unique, ru-NNN format
  "split": "development",       // "development" | "holdout"
  "category": "mixed",
  "input": "kal Zoom meeting 8 baje hai",
  "expected": "کل Zoom meeting 8 بجے ہے",
  "acceptableAlternatives": [], // optional — other equally-correct outputs
  "protectedTokens": ["Zoom", "meeting", "8"], // must survive verbatim
  "ambiguousTokens": [],        // tokens the engine must resolve correctly
  "note": ""                    // optional — explains design choice
}
```

### Authoring Principles

- Examples are realistic Pakistani Roman Urdu, not textbook-clean input.
- English words that belong in the output (proper nouns, technical terms, internet slang) appear in `protectedTokens`.
- Genuinely ambiguous inputs (multiple correct Urdu outputs) use `acceptableAlternatives` rather than picking one arbitrarily.
- `ambiguousTokens` documents which tokens must **not** be blindly protected (e.g. `main` = میں, `to` = تو).
- Unknown low-confidence words are listed in `protectedTokens` so that destructive conversion is penalised.

---

## Scoring Metrics

### Top-1 Accuracy

Fraction of examples where the engine's best output exactly matches `expected` or one of `acceptableAlternatives`.

**Target ≥ 90 %**

### Top-3 Coverage

Fraction of examples where any of the engine's up to 3 candidates matches an acceptable output.

**Target ≥ 97 %**

### Protected-Token Integrity

Fraction of protected tokens that survive verbatim in the engine's best output. Any single destroyed token counts as a failure for that example.

**Target = 100 %** — hard requirement. URLs, numbers, hashtags, and English proper nouns must never be rewritten.

### Unknown-Word Safety

For `noisy`-category examples with `protectedTokens`, the fraction of cases where the engine does **not** destructively convert an unknown token into something wrong. Unknown words should be passed through unchanged.

**Target: destructive rate ≤ 1 %**

### Per-Category Results

Every metric above is also reported per category, enabling targeted debugging.

---

## Quality Gates

These are **product acceptance targets**, not claims about the performance of any current engine.

| Gate                     | Target   |
|--------------------------|----------|
| Top-1 accuracy (dev)     | ≥ 90 %   |
| Top-3 coverage (dev)     | ≥ 97 %   |
| Protected-token integrity | 100 %   |
| Destructive unknown rate | ≤ 1 %    |

---

## Engine Interface (19A.0b)

To plug a new engine into the benchmark, implement `RomanUrduEngine`:

```ts
import type { RomanUrduEngine, EngineResult } from
  "app/tools/roman-urdu-writer/utils/benchmarkScorer";

const myEngine: RomanUrduEngine = {
  name: "my-engine-v1",
  convert(input: string): EngineResult {
    // Your logic here
    return {
      output: "...",           // best single output (for Top-1)
      candidates: [            // optional, up to 3 (for Top-3)
        { output: "...", score: 0.9 },
        { output: "...", score: 0.7 },
      ],
    };
  },
};
```

Then run:

```ts
import { runBenchmark } from "app/tools/roman-urdu-writer/utils/benchmarkScorer";
import corpus from "tests/fixtures/romanUrduBenchmark.json";

const result = runBenchmark(corpus, myEngine, "development");
console.log(`Top-1: ${(result.top1Accuracy * 100).toFixed(1)}%`);
console.log(`Top-3: ${(result.top3Accuracy * 100).toFixed(1)}%`);
```

### Rules for engine authors

1. Only evaluate on `development` during development.
2. Run `holdout` only for a formal acceptance check — never train or tune on holdout data.
3. Do not modify `romanUrduBenchmark.json` to improve scores.
4. Protected tokens must be passed through unchanged; do not hard-code exceptions for benchmark tokens.
5. Multiple candidates must be genuinely ranked, not shuffled.

---

## File Locations

| File | Purpose |
|------|---------|
| `tests/fixtures/romanUrduBenchmark.json` | Corpus (300 examples) |
| `app/tools/roman-urdu-writer/utils/benchmarkScorer.ts` | Scoring utilities |
| `tests/romanUrduBenchmark.test.ts` | Infrastructure tests |
| `docs/roman-urdu-benchmark.md` | This document |
