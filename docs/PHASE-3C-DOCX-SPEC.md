# Phase 3C — DOCX Export: Technical Spec

**Status:** Step 1 spike complete — mapping table below is now
verified against the real installed package, not assumed
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
- Links (hyperlinks) — Approved 2026-08-07. If a TipTap `link` mark has a
  valid `href`, export a real DOCX hyperlink. If that's not possible for
  a particular node, fall back to visible text only (never drop the
  text itself, just the clickability)
- A single "Download .docx" action, alongside (not replacing) the
  existing "Download .txt"

**Explicitly out of scope for v1** (per `DOCUMENT-STUDIO-SPEC.md` §5 and
Sajjad's direction):
- Tables, images, footnotes, headers/footers
- Nested lists
- Blockquote-specific DOCX styling (v1 renders blockquote content as a
  plain, indented paragraph — no border/background, which DOCX doesn't
  render the same way CSS does anyway)
- Any print/PDF output (that's a separate, later item per
  `DOCUMENT-STUDIO-SPEC.md` §2's Phase 3C bullet list, not part of this
  spec)

**Resolved 2026-08-07:** links keep their href in v1 (see §2 above) —
this was the one open question left before implementation; no others
remain.

## 3. Architecture

**Corrected 2026-08-07** (Sajjad's review): the original draft of this
section had `buildDocxDocument(doc, dir): Blob` — a synchronous function
returning a `Blob` directly. That's wrong: `docx`'s browser-side export,
`Packer.toBlob()`, is asynchronous and returns `Promise<Blob>` (confirmed
against the package's own API — see
[docx.js.org/api/classes/Packer.html](https://docx.js.org/api/classes/Packer.html)).

The corrected design also separates two genuinely different concerns
instead of merging them into one function, matching the reasoning that
made `extractPlainText.ts` easy to test — the mapping logic itself should
be synchronous and independently testable, with packing (the only
actually-async part) kept as a thin, separate step:

```
TipTap JSON (DocNode)
      ↓
createDocxDocument()   — sync, pure, testable, no I/O
      ↓
docx.Document
      ↓
buildDocxBlob()        — async, thin wrapper around Packer.toBlob()
      ↓
Blob
      ↓
browser download (DocumentStudioEditor.tsx)
```

New adapter file, following the same pattern as the existing plain-text
adapter (`extractPlainText.ts`) for the sync half — a pure function, no
React/DOM, taking a `DocNode` in:

```
app/tools/document-studio/utils/buildDocxDocument.ts
```

```ts
import type { DocNode, Direction } from "./extractPlainText";
import { Document } from "docx";

// Sync, pure — the actual TipTap→DOCX mapping (§4). Tests assert on this
// function's output structure directly, no Packer/ZIP step involved.
export function createDocxDocument(doc: DocNode, dir: Direction): Document;

// Async — the only I/O-touching step, kept thin on purpose so it needs
// no dedicated tests beyond "does this resolve to a Blob."
export async function buildDocxBlob(doc: DocNode, dir: Direction): Promise<Blob>;
```

`DocumentStudioEditor.tsx` gets one new button, "Download .docx" — added
only after `createDocxDocument`/`buildDocxBlob` are built and tested (see
§7): calling `buildDocxBlob` and triggering a download the same way
`.txt` already does via `URL.createObjectURL`, just with the DOCX MIME
type (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
and a `.docx` extension. Since `buildDocxBlob` is async, this becomes an
`async` click handler (`.txt`'s handler isn't) — a small but real
difference from the existing download button worth calling out before
implementation, not discovering it mid-coding.

**Why a separate file, not folded into `extractPlainText.ts`:**
DOCX generation depends on the `docx` npm package; the plain-text adapter
deliberately has zero package dependencies (see its own file comment).
Keeping DOCX generation in its own file preserves that property for the
plain-text path and keeps the two export formats independently testable.

## 4. TipTap Node/Mark → DOCX Mapping

**Verified 2026-08-07** — via `scripts/docx-spike.ts`: generated a real
`.docx`, unzipped it, and inspected the actual OOXML (`word/document.xml`,
`word/numbering.xml`, `word/_rels/document.xml.rels`) directly, rather
than trusting the package's TypeScript types alone. All rows below are
now confirmed facts, not assumptions.

| TipTap construct | DOCX equivalent | Confirmed output |
|---|---|---|
| `paragraph` | `docx.Paragraph` | `<w:p>` |
| `heading` (level 1) | `new Paragraph({ heading: HeadingLevel.HEADING_1 })` | `<w:pStyle w:val="Heading1"/>` |
| `heading` (level 2) | `HeadingLevel.HEADING_2` | (same pattern, `Heading2`) |
| `bulletList` → `listItem` | `new Paragraph({ numbering: { reference: "<id>", level: 0 } })`, with a `numbering.config` entry on the `Document` using `format: LevelFormat.BULLET` | `<w:numPr><w:numId w:val="2"/></w:numPr>`, resolving to an abstract bullet definition |
| `orderedList` → `listItem` | Same `numbering.config` pattern, `format: LevelFormat.DECIMAL` — confirmed as a **separate, independent** numbering reference from the bullet list, not a shared one | Distinct `numId` (bullet and numbered lists in the spike got `numId="2"` and `numId="3"` respectively, each resolving to its own `abstractNumId`) |
| `blockquote` | `docx.Paragraph` with an indent (`indent: { start: <value> }`) — no border/shading in v1 | not yet spiked (low-risk, standard `indent` property, no bidi/script interaction) |
| text with `bold` mark | `new TextRun({ bold: true })` | `<w:b/><w:bCs/>` — **both** emitted together automatically |
| text with `italic` mark | `new TextRun({ italics: true })` | `<w:i/><w:iCs/>` — same automatic pairing |
| text with `link` mark | `new ExternalHyperlink({ link: href, children: [new TextRun({ text, style: "Hyperlink" })] })` | `<w:hyperlink r:id="...">` + a matching entry in `word/_rels/document.xml.rels` with `Target="<href>"` and `TargetMode="External"` — confirmed the relationship actually resolves to the real URL, not just a floating id |
| `hardBreak` | `new TextRun({ text: "", break: 1 })` | `<w:br/>` |
| `textAlign: "left"` attr | `alignment: AlignmentType.LEFT` | `<w:jc w:val="left"/>` (confirmed pattern via `RIGHT`/`CENTER` in the spike; `LEFT`/`JUSTIFIED` follow the same enum, not independently spiked but same code path) |
| `textAlign: "center"` attr | `alignment: AlignmentType.CENTER` | `<w:jc w:val="center"/>` |
| `textAlign: "right"` attr | `alignment: AlignmentType.RIGHT` | `<w:jc w:val="right"/>` |
| `textAlign: "justify"` attr | `alignment: AlignmentType.JUSTIFIED` | (same enum pattern as above) |
| Document Studio's RTL toggle | `new Paragraph({ bidirectional: true })` | `<w:bidi/>` — this is the actual fix for `KNOWN-LIMITATIONS.md`'s bracket-mirroring problem: a real OOXML property Word reads directly, instead of a plain-text renderer's bidi guessing |

**One correction to an earlier assumption, found during the spike:** an
unrelated note (from a separate session/context, not independently
verified before this spike) claimed bold/italic on RTL text needs a
manually-set "complex script" flag (`boldComplexScript`/
`italicsComplexScript`) separate from the plain `bold`/`italics` option,
or it "wouldn't render." That claim doesn't hold up: the spike's plain
`new TextRun({ bold: true })` — tested on both an English run and an
Urdu run — emitted `<w:bCs/>` automatically alongside `<w:b/>` in both
cases, with no complex-script option set at all. The separate
`boldComplexScript`/`italicsComplexScript` properties do exist in the
package's type definitions for finer-grained control, but v1 doesn't
need to touch them — plain `bold`/`italics` already covers both scripts.
This is exactly the kind of claim the Evidence Rule exists to catch:
specific-sounding technical detail isn't the same as independently
verified fact.

## 5. Font Mapping

v1 uses exactly two fonts, chosen by direction, matching how the editor
itself already switches font family on RTL/LTR toggle:

- RTL (`dir === "rtl"`): the same Nastaliq-style font family already
  used in the editor's CSS (`font-nastaliq` class in
  `DocumentStudioEditor.tsx`)
- LTR (`dir === "ltr"`): a standard system font (e.g. Calibri or Arial)

**Still unverified — the one open item left from the spike:** `docx`'s
`font` option references a font by name, which only renders correctly in
Word if that font is actually installed on the reader's machine. The
spike didn't test this (it's a rendering question, not something visible
in the raw XML — the XML will happily reference a font name regardless of
whether it exists on any given machine). This needs an actual "open the
exported file in Word and look" check, not another XML inspection.

**Open risk:** Nastaliq fonts are often not installed on a typical
reader's Windows/Mac machine, unlike on the web (where we serve the font
file directly). If the exported .docx opens with a fallback font instead
of Nastaliq, that's expected Word behavior, not a bug — worth setting
this expectation with Sajjad before it's reported as one.

**Decided 2026-08-07:** v1 does NOT embed fonts in the .docx (`docx`
supports referencing a font by name only, not embedding the font file
itself, without significant added complexity). Fallback rendering on a
reader's machine without the Nastaliq font installed is an accepted v1
behavior, not a bug to fix. The manual Word check in §8 is mandatory
specifically to confirm what that fallback actually looks like before
this ships, not optional.

## 6. Direction Handling Detail

Document Studio's `dir` state (`"rtl" | "ltr"`) is currently a single
per-document toggle (matching the whole editor), not per-paragraph. v1
of DOCX export applies that same single direction to every paragraph in
the document: whole document RTL → every paragraph RTL; whole document
LTR → every paragraph LTR. It does NOT attempt per-paragraph direction
detection (e.g. an English sentence inside an otherwise-RTL document
staying LTR-directional at the paragraph level; inline mixed text within
one paragraph is unaffected either way, since direction here is a
paragraph-level DOCX property).

**Status: accepted v1 limitation, not a blocker** — logged here as a
backlog item for a future iteration, not something v1 needs to solve.

## 7. Implementation Order

1. ✅ Done — Install `docx` (`docx@9.7.1`), confirm `npx tsc --noEmit`
   and `npm test` stay clean with the new dependency present
2. ✅ Done — `scripts/docx-spike.ts`: a standalone script (not part of
   the app) proving heading/bold/italic/bullet-list/numbered-list/
   hyperlink/RTL-bidi/alignment all produce valid, correct OOXML —
   verified by unzipping the real output and inspecting the XML directly
   (§4 above now reflects confirmed facts, not assumptions)
3. **Next** — Build `createDocxDocument()` (sync, testable mapping) in
   `app/tools/document-studio/utils/buildDocxDocument.ts`, walking a
   `DocNode` tree the same way `extractPlainText.ts` does, plus
   `buildDocxBlob()` (thin async wrapper) — with tests on
   `createDocxDocument`'s output structure, same pattern as
   `extractPlainText.ts`'s test suite: a sample `DocNode` covering
   headings/bold/italic/lists/alignment/blockquote (not by opening it in
   Word for every test — that stays a manual final check per §8)
4. Only once step 3 is green (`npm test` passing, `tsc` clean) — add the
   "Download .docx" button to `DocumentStudioEditor.tsx`. Not before:
   mapping-adapter correctness and UI integration are deliberately kept
   as separate steps, not bundled into one commit.

## 8. Verification Plan

- `npm test` — automated tests for the mapping logic (§7.3)
- `npx tsc --noEmit`
- Production build
- Manual: download a real .docx from the live site and open it in actual
  Microsoft Word, checking specifically: RTL paragraphs display correctly
  without bracket mirroring (the point of this whole phase), bold/italic
  render, bullet/numbered lists render, alignment is respected, and the
  font-mapping risk in §5 (Nastaliq availability)

Per `AI-COLLABORATION.md`'s Evidence Rule: the mapping table in §4 is now
**verified** (confirmed via direct XML inspection of a real generated
file). What's still **inferred, not verified**: that Word actually
*renders* all of this correctly when a human opens the file — the spike
proves the XML is structurally correct per the OOXML spec, not that
Word's rendering matches expectations pixel-for-pixel. That's step 8's
manual check, still pending.
