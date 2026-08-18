# Qalam Urdu Writer — Production Transliteration Core

## Why V2 Was Chosen

Engine V2 achieves the best observed-challenge accuracy (54.2% Top-1 sentence, 88.4% token accuracy, 100% unknown safety) across all engines evaluated in Phases 19A.0a–0k. V3 and Direction C prototypes demonstrated useful architectural advances (lower CER, genuine Top-3, lower Roman leakage) but did not exceed V2 on primary accuracy.

The V3/Direction C trained-model path is blocked because no sufficiently large permissively licensed Roman Urdu ↔ Urdu parallel corpus is currently available. The minimum threshold (20,000 pairs) was not met.

V2 is frozen as the authoritative production engine.

## Bounded-Production Philosophy

Roman Urdu Writer **prioritizes safe, reviewable conversion over aggressive silent guessing**.

The production core is designed around three outcomes:

| Confidence | Behavior | User experience |
|---|---|---|
| High | Convert automatically | Urdu output appears; no review needed |
| Ambiguous | Choose safest primary; expose alternatives | Suggestion chip available |
| Unknown/low | Preserve original Roman | Token stays Roman; no wrong guess |

This means some tokens will stay Roman in the output — intentionally. A Roman word the user can read is better than a wrong Urdu word the user cannot verify.

## Confidence Bands

Confidence is semantic, not a fake numerical probability.

**High confidence:**
- Hard-protected syntax (URLs, numbers, hashtags, email addresses, phone numbers)
- Trusted exact lexicon match
- Strong phrase/context mapping
- English words deliberately preserved in mixed-language text

**Medium confidence:**
- Genuine ambiguity with a defensible primary candidate
- Morphological variant with partial match

**Low confidence:**
- Unknown/OOV token — stays Roman
- Speculative productive suggestion — never becomes primary automatically

## Unknown Passthrough

Unknown or low-confidence tokens are preserved byte-for-byte in the primary output.

This applies to:
- Tokens not in the lexicon and not matching phrase/context rules
- Chat abbreviations and internet slang not in `KEEP_ENGLISH`
- Proper names that don't match known brands
- Random/noise strings

The engine never silently rewrites an unknown token into Urdu merely because a Urdu-looking candidate was generated.

## Candidate Suggestions

The candidate system follows strict rules:

1. `candidates[0].output` always equals the primary output
2. Maximum 3 unique complete-sentence candidates
3. Candidates are deterministically ordered
4. Protected/English tokens are identical across all candidates
5. Unknown Roman passthrough is always the primary; alternatives can be offered but cannot be automatically substituted
6. Speculative V3/Direction C candidates are never surfaced as primaries

## User-Choice Precedence

Explicit user token choices always override engine ranking. `applyTokenChoices(result, choices)` returns a new rebuilt output; the original result and source text are never mutated. Selecting index 0 (the primary) is idempotent.

## Experimental V3/ML Status

Engine V3 and Direction C experiments (`engineV3.ts`, `engineDirC.ts`, `urduNgramModel.json`, `graphemeGenerator.ts`, `candidateRanker.ts`) are retained in the repository as documented research. They are **not** imported by the production `writerEngine.ts` path.

The V3 structural improvements (lower CER: 0.075 vs V2: 0.121; lower Roman leakage: 4.1% vs 8.6%; genuine Top-3; 100% unknown safety) represent valid architectural advances. They will be revisited when a licensed parallel corpus becomes available.

## No Benchmark-Derived Production Tuning

The production engine was not tuned using:
- Development benchmark failures
- Historical holdout failures
- Observed challenge failures

The bounded production strategy prohibits vocabulary, phrase-rule, or context-rule additions motivated by specific corpus failures.

## Future Path

When a legitimate Roman Urdu ↔ Urdu parallel corpus (≥20,000 MIT/Apache-2.0-licensed pairs) becomes available, the recommended path is:
1. Train a character-level generation model on the licensed corpus
2. Evaluate on a new blind challenge corpus
3. If learned-generator Top-3 recall materially exceeds V3's 54.7%, promote to production
4. Retain V2 as authoritative fallback until the trained model is proven safe

Local opt-in user corrections (on-device, privacy-preserving) may be used to build a first-party parallel corpus over time.

## Files

| File | Purpose |
|---|---|
| `writerEngine.ts` | Production entry point (`convertRomanUrdu`, `applyTokenChoices`) |
| `writerTypes.ts` | Public TypeScript types (UI-decoupled) |
| `engineV2.ts` | Frozen production engine (do not modify) |
| `engineV3.ts` | Experimental V3 (research, not production) |
| `engineDirC.ts` | Experimental Direction C (research, not production) |
| `urduNgramModel.json` | Character n-gram model (MIT, research only) |
