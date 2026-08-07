# Phase 3B — Closure Note

**Status:** Frozen at MVP-complete state
**Date:** 2026-08-07

Document Studio Phase 3B (Publishing Intelligence — Unicode Standardizer +
Quality Audit integration) is functionally complete for its MVP scope and
is now frozen. Further publishing-intelligence work (a repeatedWords-style
new category, scoring model, inline highlighting, etc.) is deferred to a
future iteration rather than continuing to expand 3B indefinitely.

## What's actually verified, and how

Being specific about *how* each part was checked — not just "tested" —
per the Evidence Rule in `AI-COLLABORATION.md`.

**Pure-function coverage: automated and green.**
The actual detection/correction logic lives in plain TypeScript functions
with no React/DOM dependency, and all of it has automated test coverage,
currently 42/42 passing (`npm test`) with a clean `npx tsc --noEmit`:

- `checkTextQuality.ts` — multipleSpaces, emptyLines, longParagraphs,
  missingSpaceAfterPunctuation, wrongQuotes (straight + unmatched curly),
  duplicatedPunctuation, mixedPunctuation, repeatedWords, mixedScript
- `standardizeUrduText.ts` — all correction rules, including the newer
  duplicated-punctuation collapse and missing-space-after insertion
- `buildDocumentAuditReport.ts` — the 5-category mapping, the
  per-block long-paragraph fix, internal count consistency
- `extractPlainText.ts` / `buildQualityInput.ts` — block extraction,
  numbering/bullet reconstruction, paragraph-boundary preservation

**UI-flow coverage: manually/live-tested only, not automated.**
No component-level test harness (jsdom + React Testing Library) exists in
this repo yet, so the following have only been verified by Sajjad clicking
through the live Vercel deployment, not by an automated test that would
catch a future regression:

- Standardize → preview summary → Confirm → applied as one transaction →
  Undo reverts it
- "Already standardized" message logic and its manual-review note when
  the Quality Audit still shows outstanding issues
- Quality Audit stale-state warning after further edits
- Copy Text / Download .txt buttons producing the expected file
- Toolbar formatting buttons (bold/italic/headings/lists/quote/link/
  alignment/RTL-LTR/undo-redo)

This gap is a known, accepted limitation of 3B's closure, not an oversight
— adding jsdom + RTL is a real setup cost that wasn't justified for this
phase. If a future regression shows up in one of the manually-verified
behaviors, that's the first place to add automated coverage.

## Known remaining limitation carried forward (not a 3B blocker)

Plain `.txt` export of a document containing brackets/parens next to
RTL Urdu/Arabic text can render with bracket characters mirrored
(visually reversed) when the file is opened directly in Microsoft Word,
specifically when the paragraph is RTL. Two attempted fixes (RLM, then
LRM invisible marks) each failed to fix Word and the second one broke
direct-copy-paste, which had been working correctly — both were rolled
back. See `KNOWN-LIMITATIONS.md` for the full writeup: this is treated as
a structural limitation of the plain-text export format, not a Quality
Audit bug, and is NOT blocking 3B's closure. It's expected to become moot
once Phase 3C's DOCX export exists, since DOCX can encode paragraph
direction explicitly instead of relying on a renderer's bidi guessing.

## What Phase 3B ships with

- "معیاری بنائیں / Standardize Document" — preview, confirm, single
  undoable transaction, "already standardized" state
- "معیار جانچیں / Run Quality Audit" — 5-category breakdown (script,
  punctuation, spacing, long paragraphs, repeated words), recommendations,
  stale-state warning
- Undo/Redo toolbar buttons
- Copy Text / Download .txt (plain text only — see Known Limitations)
