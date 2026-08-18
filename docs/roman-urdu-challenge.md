# Qalam Roman Urdu — Challenge Set Design

## Why the Old Holdout Is No Longer Considered Blind

The original 100-example holdout split from `romanUrduBenchmark.json` was observed during Phase 19A.0b analysis (development/holdout benchmark runs were reported as part of the bake-off). Even without inspecting individual holdout failures, the aggregate holdout metrics were visible to engine authors, and the holdout examples existed in the repository alongside engine development. It cannot be treated as a fully blind evaluation set.

## Challenge Set Purpose

`tests/fixtures/romanUrduChallenge.json` is a **120-example evaluation corpus** created:

- After Engine V2 was frozen at commit `c51776bb`
- Without inspecting `engineV2.ts`, `lexicon.ts`, `phraseTable.ts`, or engine test cases
- To test the **product requirement** (Roman Urdu → Urdu-script transliteration), not the current implementation

## Exact Category Distribution

| Category | Count |
|---|---|
| everyday | 25 |
| spelling_noisy | 20 |
| mixed_english | 20 |
| context_ambiguity | 20 |
| names_cultural | 15 |
| numbers_protected | 10 |
| morphology_phrases | 10 |
| **Total** | **120** |

All counts are programmatically verified by `tests/romanUrduChallenge.test.ts`.

## Independence Policy

The challenge corpus was created without opening or inspecting any engine implementation files. It uses only:
- The benchmark specification and documentation
- General knowledge of Roman Urdu as used in Pakistani digital communication
- The category requirements from Phase 19A.0e

The corpus tests **what the product must do**, not what the current engine happens to do.

## Gold-Output Policy

Each `expected` field represents natural Urdu script while preserving intentionally English/mixed content. Rules:

- Do not stylistically rewrite the source sentence
- Do not improve grammar beyond what transliteration itself requires
- Preserve meaning and wording exactly
- Mixed English words that are naturally kept in Roman are preserved in `expected`
- `acceptableAlternatives` are used only for genuine orthographic/contextual ambiguity — not to make evaluation easier

## Protected Token Policy

`protectedTokens` marks text that must survive **byte-for-byte unchanged**, including:
- URLs, email addresses, `@mentions`, `#hashtags`
- Phone numbers and numeric strings
- English product/app names (WhatsApp, Instagram, Discord…)
- Domain names, filenames, acronyms
- Intentionally preserved English words in mixed-language context

Ordinary Roman Urdu words are **not** marked protected merely because they are difficult to transliterate.

## Unknown Token Policy

`unknownTokens` marks intentionally invented, misspelled, or extremely low-frequency tokens where the correct engine behavior is to **pass them through unchanged** rather than produce a wrong Urdu guess. This makes destructive-unknown scoring objectively measurable.

## Ambiguity Metadata

`ambiguousTokens` identifies Roman tokens in `context_ambiguity` examples that have multiple plausible Urdu interpretations. The `expected` field records the contextually correct interpretation. Examples include:

- `main` (میں pronoun vs. English "main")
- `to` (تو emphatic vs. English "to")  
- `is` (اس demonstrative vs. English "is")
- `par` (پر postposition vs. English "par")
- `bus` (بس enough/just vs. vehicle)
- `na` (نہ negation vs. tag question)
- Verb-form ambiguities and compound constructions

## One-Time Evaluation Rule

> **After this corpus is frozen, Engine V2 (commit `c51776bb`) will be evaluated exactly once before any further engine modification.**

The evaluation procedure:
1. Run `runBenchmark(challengeCorpus, engineV2, "challenge")` once
2. Record all metrics (Top-1, Top-3, PT integrity, unknown safety, per-category)
3. Do not modify Engine V2 between corpus freeze and evaluation
4. Do not inspect individual challenge failures before the evaluation run
5. After the evaluation is complete and recorded, engine development for 19A.1 may begin

## File Locations

| File | Purpose |
|---|---|
| `tests/fixtures/romanUrduChallenge.json` | Challenge corpus (120 examples, split="challenge") |
| `tests/romanUrduChallenge.test.ts` | Infrastructure validation (no engine calls) |
| `docs/roman-urdu-challenge.md` | This document |
