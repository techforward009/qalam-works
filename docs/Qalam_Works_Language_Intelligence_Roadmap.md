# Qalam Works — Language Intelligence Roadmap

## Purpose

Build a rules-first, explainable, multilingual language-intelligence layer for Document Studio so Urdu, English, Arabic, Persian, Roman Urdu, and mixed-language documents can be analyzed with high precision and low false-positive rates.

This roadmap runs in parallel with the locked Document Studio roadmap:

`0 → 1 → 2 → 6 → 3 → 4 → 5 → 7 → 8 → 9 → 10 → 12`

Phase 11 remains conditional only.

## Recommended Start Point

**Begin formal Language Intelligence work after Phase 6 and before Phase 3.**

Why:
- Phase 6 establishes the durable local document foundation and IndexedDB-backed document model.
- Starting before Phase 6 risks rework while persistence/document-record architecture is still changing.
- Phase 3 professional formatting is the right point to benefit from run-level language awareness.
- The current paragraph-level deterministic detector remains the temporary foundation until then.

Recommended order:

`Finish current Quality alignment → Phase 6 → LI-1 + LI-2 + LI-3 → Phase 3`

---

## LI-0 — Current Deterministic Foundation

Status: active / partially implemented.

Includes:
- paragraph-level Arabic/Latin script context
- dominant-script threshold
- mixed-script advisory logic
- protected token handling already present
- audit/suggestions counter alignment
- deterministic processing-language resolution
- false-positive reduction

LI-0 is the foundation, not the final detector.

## LI-1 — Run-Level Script & Language Intelligence

Goal: understand multiple language/script runs inside one paragraph.

Capabilities:
- split paragraphs into meaningful Arabic-script, Latin, numeric, punctuation, and protected runs
- distinguish intentional English spans from isolated suspicious Latin intrusion
- support Urdu + English, English + Urdu quotations, Urdu + Arabic quotations, Persian + English product names
- expose one shared run-analysis result to Audit, Suggestions, and later normalization logic

Architecture target:

`Document → Paragraphs → Runs → Context`

No AI or heavy NLP required.

## LI-2 — Protected Token Engine

Goal: prevent intentional technical tokens from becoming false positives.

Protect:
- URLs
- emails
- filenames/extensions
- decimals
- thousands separators
- dates/times
- @mentions
- hashtags
- acronyms
- technical abbreviations
- product names where confidently recognized
- code-like fragments
- citations/references
- placeholders/templates

Examples:
`PDF`, `DOCX`, `TXT`, `HTML`, `CSS`, `API`, `URL`, `qalamworks.com`, `report.docx`, `12.5`, `1,000`

Preserve all existing hard-protected token behavior.

## LI-3 — Context-Aware Punctuation

Goal: judge punctuation according to the language/script run it belongs to.

Examples:
- Urdu comma `،` vs English comma `,`
- Urdu question mark `؟` vs English `?`
- Urdu semicolon `؛` vs English `;`
- Urdu sentence ending `۔` vs English `.`

Rules:
- never globally convert punctuation merely because Urdu exists elsewhere
- protected tokens remain untouched
- mixed-language paragraphs keep punctuation appropriate to each run
- recommendations explain why a punctuation style was flagged

## LI-4 — Sentence-Level Context

Goal: understand sentence-level language switching and intent.

Capabilities:
- dominant language per sentence
- quotations and parenthetical spans
- English technical phrases inside Urdu
- Urdu examples inside English prose
- acronym-heavy technical writing
- context-aware punctuation recommendations
- fewer false positives for legitimate code-switching

## LI-5 — Urdu Writing Intelligence

Goal: move from script detection into real Urdu writing quality.

Potential capabilities:
- orthographic consistency
- common Urdu spelling-pattern checks
- Urdu/Arabic character-form consistency
- Yeh/Kaf/Heh variants
- Hamza handling
- spacing around punctuation
- repeated-word detection
- tatweel/kashida handling
- numeral-style consistency
- typography consistency
- safe normalization recommendations

Suggestions remain non-destructive by default.

## LI-6 — Confidence-Aware Suggestions

Goal: every suggestion communicates reliability.

Possible confidence levels:
- High
- Medium
- Low

Each suggestion may include:
- issue type
- affected span
- explanation
- proposed correction
- confidence
- why the rule triggered

Low-confidence suggestions must never auto-apply.

## LI-7 — Document-Level Language Intelligence

Goal: analyze consistency across the whole document.

Capabilities:
- punctuation style consistency
- numeral style consistency
- terminology consistency
- heading language consistency
- glossary consistency
- repeated terminology variants
- Urdu/English balance
- mixed-language style anomalies
- publication readiness

This should feed Quality Audit without duplicating analysis.

## LI-8 — Advanced Local Intelligence

Goal: add richer contextual understanding only where deterministic rules become insufficient.

Constraints:
- zero-cost preferred
- local/open-source only unless policy changes later
- rules-first engine remains the authoritative fallback
- no paid API dependency
- advanced layer must never silently override deterministic protections

Potential uses:
- difficult language disambiguation
- ambiguous technical terms
- nuanced mixed-language spans
- context-sensitive suggestion ranking

## LI-9 — Benchmark & Moonshot Quality

Goal: make language quality measurable.

Create a **Qalam Language Benchmark Corpus** covering:
- pure Urdu
- pure English
- Urdu + English technical writing
- Urdu + Arabic quotations
- Persian
- Roman Urdu
- URLs/emails/numbers
- filenames/code
- punctuation edge cases
- intentional mixed-language terminology
- genuine script mistakes
- headings/lists/tables
- long-form publishing samples

Metrics:
- false-positive rate
- false-negative rate
- precision
- recall
- suggestion acceptance quality
- punctuation accuracy
- protected-token preservation
- mixed-language accuracy

Every future Language Intelligence change should run against this benchmark.

---

## Shared Architecture Target

All quality features should converge on one shared analysis pipeline:

`Text → Protected Tokens → Paragraphs → Script/Language Runs → Sentence Context → Language Rules → Quality Issues → Confidence → Suggestions`

Consumers:
- Quality Audit
- Suggestions
- Standardize / Cleaner intelligence
- Document Health
- future Writing Intelligence
- future proofreading features

Avoid independent re-analysis pipelines that can produce contradictory counts.

---

## Integration With Main Document Studio Roadmap

### After Phase 6
Start:
- LI-1 Run-Level Intelligence
- LI-2 Protected Token Engine
- LI-3 Context-Aware Punctuation

These should be substantially stabilized before deep Phase 3 formatting work.

### Around Phases 3–5
Continue:
- LI-4 Sentence Context
- LI-5 Urdu Writing Intelligence

### Around Phases 7–8
Add:
- LI-6 Confidence-Aware Suggestions
- stronger suggestion-review semantics
- integration with version history/comments/suggesting where appropriate

### Before / during Phase 12
Complete:
- LI-7 Document-Level Intelligence
- LI-8 Advanced Local Intelligence where justified
- LI-9 Benchmark and final quality audit

---

## Locked Principles

1. Rules-first deterministic core.
2. Zero-cost architecture until revenue justifies otherwise.
3. Urdu/RTL and English/LTR are first-class.
4. Mixed-language documents are a core use case, not an edge case.
5. Protected tokens must never be corrupted.
6. No global punctuation conversion based only on document-level language.
7. Quality Audit and Suggestions should share one source of truth.
8. Explainable suggestions are preferred over opaque fixes.
9. Low-confidence changes remain review-only.
10. False-positive reduction is more important than adding noisy rules.
11. Existing accepted phases remain frozen unless a real regression requires a focused patch.
12. The final objective is not merely Google Docs parity; Qalam Works should exceed it in Urdu and multilingual writing intelligence.

## Decision

**Formal Language Intelligence development begins after Phase 6.**

LI-0 remains the active foundation until then.

Recommended immediate order:

`Finish current Quality alignment → Phase 6 → LI-1 + LI-2 + LI-3 → Phase 3`
