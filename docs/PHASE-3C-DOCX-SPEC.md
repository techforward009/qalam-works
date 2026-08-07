# Phase 3C — DOCX Export: Technical Spec

**Status:** Draft — for review before `docx` package install or coding
**Date:** 2026-08-07
**Depends on:** `DOCUMENT-STUDIO-SPEC.md` §4 (Decision: DOCX Export),
`docs/DECISIONS.md` "Phase 3B Frozen, Word-Bidi Deferred to Phase 3C"

## 1. Goal

Given the same TipTap JSON document Document Studio already works with
(the `DocNode` shape in `extractPlainText.ts`), produce a real `.docx`
file where paragraph direction, alignment, and basic formatting are
encoded as actual DOCX properties — not inferred by a renderer's bidi
guessing, which is exactly the class of problem `KNOWN-LIMITATIONS.md`
documents for plain-text export.

## 2. v1 Scope (locked, per Sajjad's 2026-08-07 direction)

**In scope:**
- Paragraphs and headings (H1, H2)
- Bold, italic
- Bullet lists, numbered lists (single level — no nested lists in v1)
- Text alignment (left, center, right, justify)
- RTL/LTR paragraph direction
- Basic font mapping (one font for RTL content, one for LTR — see §5)
- A single "Download .docx" action, alongside (not replacing) the
  existing "Download .txt"

**Explicitly out of scope for v1** (per `DOCUMENT-STUDIO-SPEC.md` §5 and
Sajjad's direction):
- Tables, images, footnotes, headers/footers
- Links (hyperlinks) — Document Studio's editor has a Link button, but
  wiring `docx`'s hyperlink API is deferred; v1 exports link text as
  plain formatted text, dropping the href, unless this is  explicitly
  approved to add before implementation
- Nested lists
- Blockquote-specific DOCX styling (v1 renders blockquote content as a
  plain, indented paragraph — no border/background, which DOCX doesn't
  render the same way CSS does anyway)
- Any print/PDF output (that's a separate, later item per
  `DOCUMENT-STUDIO-SPEC.md` §2's Phase 3C bullet list, not part of this
  spec)

**Open question for Sajjad/ChatGPT before implementation starts:**
Should exported links keep their href (via `docx`'s hyperlink support)
in v1, or is dropping the href (keeping just the visible text) acceptable
for a first version? This spec currently assumes the latter (drop href)
to keep v1 scope tight, but this is worth an explicit yes/no rather than
a silent default.

## 3. Architecture

New adapter file, following the same pattern as the existing plain-text
adapter (`extractPlainText.ts`) — a pure function, no React/DOM, taking a
`DocNode` in:

```
app/tools/document-studio/utils/buildDocxDocument.ts
```

```ts
import type { DocNode, Direction } from "./extractPlainText";

export function buildDocxDocument(doc: DocNode, dir: Direction): Blob;
```

`DocumentStudioEditor.tsx` gets one new button, "Download .docx", calling
this function and triggering a download — the same `URL.createObjectURL`
pattern already used for `.txt`, just with the DOCX MIME type
(`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
and a `.docx` extension.

**Why a separate file, not folded into `extractPlainText.ts`:**
DOCX generation depends on the `docx` npm package; the plain-text adapter
deliberately has zero package dependencies (see its own file comment).
Keeping DOCX generation in its own file preserves that property for the
plain-text path and keeps the two export formats independently testable.

## 4. TipTap Node/Mark → DOCX Mapping

This table is the actual thing to lock before coding. Cells marked
**[VERIFY]** are conceptually correct per `docx`'s documented API shape
but haven't been confirmed against the actual installed package version
yet — that's an explicit first implementation step (§7), not something
to assume as fact before the package is even installed.

| TipTap construct | DOCX equivalent |
|---|---|
| `paragraph` | `docx.Paragraph` |
| `heading` (level 1) | `docx.Paragraph` with `heading: HeadingLevel.HEADING_1` |
| `heading` (level 2) | `docx.Paragraph` with `heading: HeadingLevel.HEADING_2` |
| `bulletList` → `listItem` | `docx.Paragraph` with `bullet: { level: 0 }` **[VERIFY exact API]** |
| `orderedList` → `listItem` | `docx.Paragraph` with a numbering reference **[VERIFY: docx's numbering API is more involved than bullets — needs a `Numbering` config object registered on the `Document`, not just a per-paragraph flag]** |
| `blockquote` | `docx.Paragraph` with an indent (`indent: { start: <value> }`) — no border/shading in v1 |
| text with `bold` mark | `docx.TextRun` with `bold: true` |
| text with `italic` mark | `docx.TextRun` with `italics: true` |
| text with `link` mark | v1: plain `docx.TextRun` (href dropped — see open question in §2) |
| `hardBreak` | `docx.TextRun` with `break: 1` **[VERIFY]** |
| `textAlign: "left"` attr | `alignment: AlignmentType.LEFT` |
| `textAlign: "center"` attr | `alignment: AlignmentType.CENTER` |
| `textAlign: "right"` attr | `alignment: AlignmentType.RIGHT` |
| `textAlign: "justify"` attr | `alignment: AlignmentType.JUSTIFIED` |
| Document Studio's RTL toggle | `docx.Paragraph`'s `bidirectional: true` **[VERIFY this exact property name against the installed version]** — this is the actual fix for `KNOWN-LIMITATIONS.md`'s bracket-mirroring problem: DOCX's `bidirectional` maps to the real `w:bidi` XML property Word itself reads, instead of a plain-text renderer's guess |

## 5. Font Mapping

v1 uses exactly two fonts, chosen by direction, matching how the editor
itself already switches font family on RTL/LTR toggle:

- RTL (`dir === "rtl"`): the same Nastaliq-style font family already
  used in the editor's CSS (`font-nastaliq` class in
  `DocumentStudioEditor.tsx`) — **[VERIFY exact font name/file is
  available to embed or reference; `docx`'s `font` option references a
  font by name, which only renders correctly in Word if that font is
  actually installed on the reader's machine — this is a real risk to
  flag, not silently assume works]**
- LTR (`dir === "ltr"`): a standard system font (e.g. Calibri or Arial)

**Open risk:** Nastaliq fonts are often not installed on a typical
reader's Windows/Mac machine, unlike on the web (where we serve the font
file directly). If the exported .docx opens with a fallback font instead
of Nastaliq, that's expected Word behavior, not a bug — worth setting
this expectation with Sajjad before it's reported as one.

## 6. Direction Handling Detail

Document Studio's `dir` state (`"rtl" | "ltr"`) is currently a single
per-document toggle (matching the whole editor), not per-paragraph. v1
of DOCX export applies that same single direction to every paragraph in
the document — it does NOT attempt per-paragraph direction detection
(e.g. an English sentence inside an otherwise-RTL document staying
LTR-directional at the paragraph level; inline mixed text within one
paragraph is unaffected either way, since direction here is a
paragraph-level DOCX property).

## 7. Implementation Order

1. Install `docx` (npm package), confirm it resolves and builds cleanly
   with `npx tsc --noEmit` before writing any conversion logic
2. Write a minimal spike: hardcode a tiny `DocNode` (one paragraph, bold
   text) → verify a real, valid `.docx` file is produced and opens
   correctly in Word — this is where the **[VERIFY]** items in §4/§5 get
   resolved against the real API, replacing this spec's assumptions with
   confirmed facts
3. Build out the full mapping table (§4) with tests — same pattern as
   `extractPlainText.ts`'s test suite: a sample `DocNode` covering
   headings/bold/italic/lists/alignment/blockquote, asserting on the
   generated `docx.Document`'s structure (not by opening it in Word for
   every test — that stays a manual final check per §8)
4. Add the "Download .docx" button to `DocumentStudioEditor.tsx`

## 8. Verification Plan

- `npm test` — automated tests for the mapping logic (§7.3)
- `npx tsc --noEmit`
- Production build
- Manual: download a real .docx from the live site and open it in actual
  Microsoft Word, checking specifically: RTL paragraphs display correctly
  without bracket mirroring (the point of this whole phase), bold/italic
  render, bullet/numbered lists render, alignment is respected

Per `AI-COLLABORATION.md`'s Evidence Rule: until step 8's manual Word
check is actually done, "RTL direction exports correctly" is an
**inferred** claim (reasoned from `bidirectional` being the real `w:bidi`
property), not a **verified** one — same distinction this whole detour
started from.
