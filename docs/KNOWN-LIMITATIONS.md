# Known Limitations

Structural limitations of a current format/approach — not bugs to be
"fixed" with more effort, but constraints to design around or resolve by
changing approach entirely. Distinct from `DECISIONS.md` (one-time
decisions with reasoning) and `AI-COLLABORATION.md` (day-to-day process
rules): this file is where "we know this is imperfect, and here's why
that's expected" lives, so nobody re-discovers the same dead end twice.

---

## Bracket mirroring in RTL text (Word, both plain TXT and DOCX)

**Status:** Accepted limitation, not fixed — genuine edge case, not launch-blocking
**Affects:** Document Studio's Copy Text / Download .txt AND Download
.docx, specifically for bracket/paren characters `( ) [ ]` sitting next
to RTL Urdu/Arabic text, when opened in Microsoft Word with RTL text
direction

**What happens:**
A citation like `[Reference]` sitting inside RTL Urdu/Arabic text can
render with the bracket glyphs visually swapped (`]Reference[`-looking),
confusing which side opens and which closes. Confirmed via real Word
screenshots on 2026-08-07/08 in both export formats.

**Three distinct paths, three distinct results (found 2026-08-08, via
ChatGPT's analysis of Sajjad's screenshots):** the same exported text
behaves differently depending on how it reaches Word — this matters for
deciding where to invest further effort.

| Path | Result |
|---|---|
| Copy Text → paste into Word | ✅ Brackets and numbering both correct — Word inherits the paste target's existing RTL paragraph context |
| Download .txt → opened directly in Word | ❌ Brackets mirror, AND numbering ("1.") can reorder — Word has no metadata and must guess direction/mirroring itself |
| Download .docx → opened in Word | ✅ Numbering/RTL/headings/lists/font all correct, ⚠️ brackets still mirror (see above) |

This is why a numbering fix that once worked can reappear broken later
even with no logic change: paste and file-open are genuinely different
Word import contexts, not the same rendering path with the same inputs.
It also means any invisible-mark fix applied to the exported string
affects BOTH the paste and file-open paths at once — there's no way to
target one without the other, since they share the exact same text.

**Resulting product decision (2026-08-08):** stop trying to make `.txt`
Word-quality. It's positioned as a plain-text-only export (labeled
"Plain Text" in the UI); DOCX is the actual Word/publishing-quality path
(labeled "For Word / Publishing"). A brief attempt to restore RLM marks
for numbering specifically (to fix the file-open path) was reverted the
same day it was made — direct paste already works correctly with zero
marks, so adding marks back to fix file-open would risk reintroducing a
paste regression for a fix that's no longer worth the risk under this
positioning. `extractPlainText.ts` now contains no invisible bidi marks
anywhere, for any case.

**Corrected understanding (2026-08-08):** an earlier version of this
entry concluded this was a plain-text-only limitation, expected to be
fixed by Phase 3C's DOCX export (since DOCX can set paragraph direction
explicitly via `<w:bidi/>`, instead of a plain-text renderer guessing).
That conclusion was wrong. Sajjad tested a real exported .docx —
independently verified via direct OOXML inspection to have correct
`<w:bidi/>`, headings, both list types, blockquote indent, and font on
every paragraph — and brackets still mirrored in real Word, identically
to the plain-text case. The root cause is broader than "plain text has
no metadata slot for this": Unicode bracket mirroring applies to any
RTL-*resolved* run regardless of whether that resolution came from
inference (plain text) or explicit metadata (DOCX's `w:bidi`). It's a
Word/Unicode rendering rule operating at a layer neither format's
metadata reaches, not a plain-text-specific gap.

**What was tried and rolled back:**
1. (2026-08-07, plain-text export) RLM (U+200F, "treat as RTL") marks
   around brackets/digits — no effect, since the surrounding text was
   already RTL.
2. (2026-08-07, plain-text export) LRM (U+200E, "treat as LTR") marks
   instead — still didn't fix Word, AND broke direct-copy-paste, which
   had been working correctly before either attempt. Both fully
   reverted; plain-text export now contains no invisible bidi marks.
3. (2026-08-08, DOCX export, tested only — never merged into
   `buildDocxDocument.ts`) `docx`'s run-level `rightToLeft: false`
   property (maps to real OOXML `<w:rtl w:val="false"/>` on just the
   bracket-containing run, confirmed via direct XML inspection) — a
   controlled A/B test document (one paragraph with the override, one
   plain control) showed both paragraphs mirroring identically in real
   Word. No effect.
4. Also considered, evaluated, and explicitly rejected: silently
   substituting `[ ]`/`( )` with non-mirrored alternatives when
   exporting — Arabic ornate parentheses `﴾ ﴿` (U+FD3E/FD3F, confirmed
   via Python's `unicodedata.mirrored()` to NOT be in the Bidi_Mirrored
   set — also traditionally used for Qur'anic quotation in Arabic/Urdu
   typesetting) and an em-dash pair both tested in real Word and
   rendered correctly (not mirrored). Rejected as an *automatic*
   substitution because it would silently change the user's authored
   text — against Qalam Works' content-fidelity principle. Sajjad may
   choose to author citations with `﴾ ﴿` himself where visually
   appropriate; Document Studio does not do this substitution for him.

**Not yet tried:** Unicode's *directional isolates* — LRI (U+2066), RLI
(U+2067), FSI (U+2068), PDI (U+2069) — a distinct, more modern bidi
control mechanism from the marks (RLM/LRM) already tried. These
establish a fully isolated embedding rather than just biasing
resolution, and may behave differently for mirrored characters
specifically. This has NOT been evaluated at all yet, in either format.

**Resolution path:**
Not a Phase 3C blocker. The rest of DOCX export (paragraphs, headings,
both list types, alignment, RTL text order, bold/italic, hyperlinks,
font) is independently verified working correctly in real Word — this
is a narrow, specific edge case (paired bracket/paren glyphs only), not
a failure of the RTL export architecture generally. If pursued further,
it should happen as an isolated, non-production research spike — a
short test document comparing isolate-based strategies one variable at
a time — separate from the production editor/exporter, per the pattern
that produced clean results before (the original OOXML spike) versus
the pattern that wasted effort here (three sequential blind-ish attempts
directly against production code based on Unicode bidi theory each
time). Until/unless that spike finds something real, this stays a
documented, accepted limitation — not something to re-attempt casually.

## PDF Export

**Status (2026-08-08):** v1 approved and scoped — visual/print quality
only. Scholarly searchable text remains unsolved research.

**v1 decision:** Ship "Download PDF (Visual/Print)" using the validated
Chromium (puppeteer-core + @sparticuz/chromium) HTML-to-PDF approach.
Visual quality for Urdu/Arabic/Persian/mixed RTL-LTR — including Nastaliq
— is independently verified excellent (see the PDF spike investigation).
No attempt is made at a searchable/copyable text layer in v1; the PDF is
visual/print-only, same category as a printed page or a screenshot.

**Why not searchable in v1 — full investigation summary:**
An extensive investigation (2026-08-08) tested seven PDF-generation
approaches for extractable Urdu/Arabic/Nastaliq text: Chromium,
WeasyPrint, LibreOffice headless, Typst, and XeLaTeX+Polyglossia (all
tested for real), plus PrinceXML and Paged.js (evaluated from documented
behavior, not tested — Prince is commercial/unavailable in-sandbox,
Paged.js is a Chromium-based pagination layer, not an independent PDF
engine). **All five tested engines failed** at producing Urdu/Arabic
text that searches or copies correctly — each in a different way
(character fragmentation, word/character reordering, or outright NULL/
missing Unicode mappings), confirming this is a shared, ecosystem-wide
challenge for complex Arabic-script shaping in PDF text layers, not a
single engine's fixable bug.

A follow-up "hybrid PDF" investigation (visual Chromium layer + a
separately-authored invisible Unicode text layer, PDF text-rendering
mode 3 — the same technique OCR tools like Tesseract/ocrmypdf use) found
a working character-reversal encoding for the invisible layer — but only
for ONE of five real-world extraction paths tested (poppler/pdftotext).
The same PDF FAILED in PDFium (the actual engine behind both Chrome's
and Microsoft Edge's built-in PDF viewers), pdfminer.six/pdfplumber,
pypdf, and LibreOffice's own PDF-import filter — each disagreeing with
poppler's bidi-reprocessing behavior differently. The invisible-text
mechanism itself is sound (proven pixel-identical visual output); no
single text encoding was found that satisfies multiple real extraction
engines simultaneously. This remains open, unsolved research, not a
regression — it was never working broadly to begin with.

**v1 scope boundary:** the "Download PDF (Visual/Print)" button ships
without any invisible/searchable text layer. UI copy explicitly labels
it "(Visual/Print)" so users understand it's for viewing/printing/
sharing, not for text search — same pattern as the "(Plain Text)" and
"(For Word / Publishing)" labels already on the .txt/.docx buttons.

**Future research (not blocking v1, no timeline):**
1. A properly-configured XeLaTeX+Polyglossia pipeline is historically the
   most credible path for genuinely scholarly Arabic/Urdu PDF output —
   this session's XeLaTeX attempt had font-fallback rendering problems
   from a rushed setup, not a confirmed capability failure; a dedicated,
   careful attempt is worth a future spike.
2. A PrinceXML commercial trial — strong reputation specifically for
   correct ToUnicode/CMap generation in complex scripts; never tested,
   requires a license.
3. Finding a single invisible-text encoding that satisfies poppler,
   PDFium, and LibreOffice simultaneously (if one exists at all) — not
   attempted yet; would need per-engine empirical iteration the way the
   poppler-only encoding was found.
Any of these should be pursued as an isolated spike per the established
pattern here — real generation, real multi-tool extraction testing,
Verified/Failed/Inferred reported separately — never assumed from theory
or from a single tool's success.
