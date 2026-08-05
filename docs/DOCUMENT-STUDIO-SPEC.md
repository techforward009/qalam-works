# Qalam Works — Document Studio Specification (v1.0 — Approved)

**Status:** Approved
**Date:** 2026-08-05

## 1. Product Purpose

Document Studio is a professional, multilingual document workspace for Urdu,
Arabic, Persian, and mixed RTL/LTR publishing workflows. It is where a user
writes or pastes a document, formats it properly, runs it through Qalam
Works' existing publishing intelligence (Unicode normalization, quality
audit), and exports a clean, publication-ready file.

It is the natural next step after Phase 2's standalone tools: instead of
copying text between a text editor and separate audit tools, Document
Studio brings editing and publishing checks into one workspace.

## 2. Phase Breakdown

### Phase 3A — Editor Foundation
- Rich text editing: bold, italic, headings, lists, blockquotes, links
- RTL/LTR switching, correct mixed-direction handling within one document
- Copy, and download as plain text (see Decision below)
- No tables yet (see Decision below)
- No AI, no Unicode/Quality integration yet — this phase is purely
  "does the editor work correctly for Urdu/Arabic/Persian/English mixed
  content"

### Phase 3B — Publishing Intelligence
- Integrate existing Unicode Standardizer logic (standardizeUrduText) as
  an in-editor action, not just a separate tool
- Integrate existing Quality Checker logic (checkTextQuality) as an
  in-editor audit panel
- Typography/paragraph tools building on what the editor foundation
  provides
- This phase is where Document Studio becomes distinctly Qalam Works,
  rather than a generic rich text editor
- Homepage visibility decision takes effect once this phase is complete
  (see Decision below)

### Phase 3C — Export System
- DOCX export (see Decision below)
- PDF export / print layout
- Table support becomes relevant here (see Decision below)
- File naming and basic metadata

### Phase 3D — AI Layer (deferred until a real AI backend exists)
- Rewrite, simplify, academic tone, translation assistance, summarization
- Not started until Phase 6 (AI Backend + SaaS) groundwork exists per
  ROADMAP.md

## 3. Decision: Document Editor Engine

**Status:** Approved — TipTap
**Reason:**
Document Studio's core problem isn't just "let the user type text" — it's
RTL/LTR mixed formatting, custom Qalam-specific actions (running
standardization/quality-check on selected text), and long-term
extensibility toward tables, footnotes, and collaboration-style features
later. TipTap (built on ProseMirror) has a mature extension model suited
to exactly this, and its community/ecosystem size matters for a solo
developer who will often need existing solutions rather than building
from primitives. Lexical was considered but its ecosystem is currently
smaller and more implementation-heavy for custom extensions.

**Accepted trade-off:** unlike every tool built so far in Phase 2/2.5,
this introduces a real new dependency. This is a deliberate, one-time
exception to the "no unnecessary dependencies" principle used for Invoice
Studio — a real rich text editor cannot be safely hand-built from
`contentEditable` for production use.

## 4. Decision: DOCX Export

**Status:** Approved — `docx` npm package (dolanmiu/docx) for generation
**Reason:**
The existing `mammoth` dependency (already in use for the Document
Pipeline) only reads/extracts text from DOCX files — it cannot generate
new ones. The `docx` package is the standard tool for programmatically
building new .docx files (headings, paragraphs, tables, styles).
`mammoth` stays for reading; `docx` is added for writing. These are
complementary, not overlapping.

## 5. Scope Decisions (resolved from earlier open questions)

**Phase 3A export scope — Approved:**
Phase 3A includes plain-text copy/download only. DOCX and PDF export are
deferred to Phase 3C. Reason: gives an immediately usable feature without
requiring the DOCX/PDF pipeline before the editor foundation itself is
proven.

**Table support — Approved:**
Deferred beyond Phase 3A, revisited in Phase 3B/3C. Reason: tables aren't
just an editor feature — RTL table alignment, DOCX conversion, and PDF
rendering all add real complexity that isn't needed to validate the core
editor.

**Homepage visibility — Approved:**
Document Studio is NOT hero-promoted during Phase 3A (same "build it,
don't lead with it" treatment as Invoice Studio initially). Once Phase 3B
(publishing intelligence integration) is complete, it becomes a featured
homepage section — unlike Invoice Studio, which stays a secondary utility
indefinitely, Document Studio is intended to become Qalam Works' core
workspace, so its homepage promotion timing is different by design.
