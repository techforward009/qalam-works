# Qalam Works — Open-Source Reuse Audit

**Project:** Qalam Works — Product & Engineering  
**Date:** 2026-09-09  
**Purpose:** Phase 3B اور اس کے بعد کے Document Studio roadmap میں unnecessary reinvention کم کرنا، Grok/engineering credits بچانا، اور proven open-source building blocks کو محفوظ/قانونی طریقے سے reuse کرنا۔

---

## Executive Summary

Qalam Works کو اپنا editor engine تبدیل نہیں کرنا چاہیے۔

موجودہ **Tiptap + ProseMirror** foundation برقرار رکھنا سب سے مناسب راستہ ہے، کیونکہ:

- Tiptap/ProseMirror modular اور mature ہیں۔
- Qalam پہلے ہی ان پر architecture بنا چکا ہے۔
- formatting, tables, images, lists اور collaboration foundations کے کئی حصے open source میں پہلے سے موجود ہیں۔
- engine migration سے regression، schema migration، export breakage، Urdu/RTL regressions اور testing cost بہت بڑھ جائے گی۔

Qalam کی اصل intellectual/product value یہ نہیں کہ وہ basic word-processing primitives دوبارہ لکھے، بلکہ:

- Urdu / RTL intelligence
- mixed-language intelligence
- Protected Token Engine
- Run-Level Language Intelligence
- Context-Aware Punctuation
- Urdu typography/publishing intelligence
- Quality Audit / Suggestions / Health alignment
- local-first document workflow

ہیں۔

بہترین strategy:

> **عام editor infrastructure reuse کریں؛ Qalam-specific Urdu/RTL/publishing intelligence خود رکھیں۔**

---

# 1. سب سے اہم دریافت: Ruler / Indent Infrastructure

## Project
`devslab-kr/editor-ruler`

## License
**Apache-2.0**

## Relevance

یہ project تقریباً وہی interaction family حل کرتا ہے جس پر Qalam نے کئی ruler hotfixes کیے:

- horizontal ruler
- vertical ruler
- left/right margins
- first-line indent
- hanging indent
- draggable handles
- unit support: cm / inch / px
- keyboard-accessible handles
- live drag preview
- guide/snapping patterns
- Tiptap v2/v3 integration/adapters
- table-column marker patterns

## Qalam Decision

Blind install یا full replacement نہیں۔

**Reuse/port interaction core**:

- drag lifecycle
- hit areas
- first-line-indent handles
- hanging-indent handles
- keyboard accessibility
- tick-generation ideas
- interaction states

**Qalam source of truth برقرار رہے**:

- internal millimeters
- `pageLayout`
- RTL/LTR physical margin mapping
- document settings
- IndexedDB persistence
- print geometry
- existing Pages/Pageless architecture

## Important

اس project کو دیکھنے کے بعد first-line/hanging-indent mechanics صفر سے لکھوانا مناسب نہیں۔

---

# 2. Phase 3B — Professional Formatting

زیادہ تر formatting features کے لیے official Tiptap extensions پہلے سے موجود ہیں۔

## Reuse candidates

### Text Color
Official Tiptap Color extension۔  
**Decision:** Direct integration/adaptation.

### Highlight
Official Tiptap Highlight extension۔  
**Decision:** Direct integration/adaptation.

### Lists
Tiptap ListKit / existing list extensions۔  
**Decision:** Direct use؛ Qalam کو صرف toolbar/RTL/export regression work کرنا چاہیے۔

### Font / Active Formatting
Tiptap editor-state APIs موجود ہیں۔  
**Decision:** selection-aware active toolbar state کو shared resolver architecture کے ساتھ رکھیں؛ basic selection engine دوبارہ نہ بنائیں۔

---

# 3. Tables — Phase 4

## Best foundation

- Tiptap TableKit
- ProseMirror Tables

## License
MIT ecosystem۔

## Already solved

- rows
- columns
- cell selection
- merge/split patterns
- row/column commands
- colspan/rowspan
- table normalization
- column resizing foundations

## Qalam-specific work

- Urdu/RTL table behavior
- RTL column resizing regression tests
- mixed-script cells
- PDF/DOCX export parity
- page pagination with tables

## Decision

**Do not write a table engine from scratch.**

Use TableKit / ProseMirror Tables and build a dedicated Urdu/RTL regression suite around it.

---

# 4. Images — Phase 5

## Foundation
Official Tiptap Image ecosystem۔

Available patterns include:

- image node
- inline/block images
- resize handling
- aspect-ratio preservation

## Qalam-specific architecture

Recommended:

`Tiptap image node` → `Qalam IndexedDB asset ID` → `local Blob` → `preview URL` → `PDF/DOCX export`

## Decision

Image node/resizing engine reuse کریں؛ asset persistence/export integration Qalam-specific رہے۔

---

# 5. Pagination

Open-source Tiptap pagination projects موجود ہیں، مثلاً:

- `RomikMakavana/tiptap-pagination`
- `adalat-ai-tech/tiptap-pages`
- `hugs7/tiptap-extension-pagination`

## Potential useful ideas

- overflow algorithms
- page breaking
- headers/footers
- table pagination
- cross-page behavior

## Qalam Decision

**Current Phase 2 pagination architecture replace نہ کریں۔**

Qalam intentionally uses:

`one TipTap document` + `one document JSON` + `visual pagination/decorations`

کچھ open-source pagination projects page nodes/schema changes introduce کرتے ہیں، جو frozen Qalam architecture سے ٹکراتے ہیں۔

## Use

**Reference only**, unless future regression proves a contained reusable algorithm can be safely ported.

---

# 6. DOCX

## Export

Qalam کا موجودہ `docx` package مناسب foundation ہے۔

### License
MIT.

### Capabilities

- paragraphs
- tables
- images
- page margins
- landscape
- headers/footers
- styling

## Decision

Current DOCX export architecture keep کریں۔

## Rich DOCX Import

Qalam ابھی `.docx` import کے لیے `mammoth.extractRawText()` استعمال کرتا ہے، اس لیے formatting intentionally ضائع ہوتی ہے۔

### Better future path

`DOCX` → `Mammoth convertToHtml` → `sanitize` → `TipTap mapping/generateJSON`

## Mammoth License
BSD-2-Clause.

## Decision

Future rich DOCX import میں parser صفر سے نہ لکھیں۔ Mammoth کو formatting-aware conversion کے لیے evaluate کریں۔

---

# 7. Collaboration — Conditional Phase 11

A complete open-source technical stack ممکن ہے:

- Tiptap Collaboration
- Yjs
- `y-indexeddb`
- Hocuspocus

## Licenses
MIT ecosystem.

## Potential architecture

`Tiptap` → `Yjs document` → `y-indexeddb` offline persistence → `Hocuspocus` realtime WebSocket backend

## Key constraint

اصل مسئلہ software licensing نہیں بلکہ **reliable zero-cost hosting** ہے۔

## Decision

Phase 11 conditional ہی رہے۔ Collaboration صرف اس وقت:

- جب hosting واقعی free/reliable ہو
- local-first behavior خراب نہ ہو
- document library architecture safely migrate ہو سکے

---

# 8. Version History — Phase 7

Yjs snapshots/version concepts useful references ہیں، لیکن Phase 7 کو ابھی Yjs migration سے نہیں باندھنا چاہیے۔

## Recommended Phase 7

Qalam IndexedDB میں:

- immutable revisions
- timestamp
- title
- content snapshot/delta as appropriate
- restore action

## Future

اگر collaboration/Yjs آئے تو version-history architecture کو بعد میں Yjs-aware کیا جا سکتا ہے۔

## Decision

**Simple local version history first.**

---

# 9. Comments / Suggesting — Phase 8

یہاں mature, drop-in, permissively licensed solution اتنا واضح نہیں ملا۔

References exist:

- ProseMirror change-tracking prototypes
- suggestion-mode experiments
- BlockNote collaboration/comments work

لیکن کئی solutions prototype، WIP، premium ecosystem سے جڑے، یا licensing implications رکھتے ہیں۔

## Decision

**Open-source designs/reference patterns لیں، production model Qalam-native رکھیں۔**

Likely architecture:

- ProseMirror decorations/marks
- local comment records
- suggestion review state
- IndexedDB persistence
- later Yjs compatibility

---

# 10. Spellcheck

## English
Browser-native spellcheck مناسب zero-cost baseline ہے۔

## General open-source options

- Hunspell
- nspell

## Urdu Problem

Reliable, properly licensed, production-grade Urdu Hunspell dictionary ecosystem محدود ہے۔ Random word lists کو dictionary سمجھ کر production میں شامل نہیں کرنا چاہیے۔

## Decision

**English** → browser-native spellcheck  
**Urdu** → Qalam LI-5 / curated Urdu intelligence / explainable rules

Future dictionary only after:

- license verification
- quality benchmark
- false-positive testing
- orthography coverage review

---

# 11. Large Office Suites

## ONLYOFFICE Docs Community

### Strengths
- very complete office editor
- DOCX
- collaboration
- printing
- spellchecking
- professional UI patterns

### License
AGPL-3.0.

### Decision
Excellent **feature/reference benchmark**۔ Direct source incorporation صرف explicit licensing strategy کے بعد۔

---

## Collabora Online

LibreOffice-based browser office suite۔

### License
MPL-2.0 source ecosystem.

### Issue
Architecture بہت heavy ہے اور Qalam کے lightweight Next.js + Tiptap + local-first direction سے مختلف ہے۔

### Decision
Reference/benchmark only.

---

## CKEditor 5

Strong editor ecosystem، لیکن advanced collaboration/history/comments commercial/premium ecosystem سے جڑے ہو سکتے ہیں، اور licensing implications اہم ہیں۔

### Decision
No engine migration.

---

## Lexical

MIT licensed strong editor framework۔ Useful references:

- selection state
- tables
- images
- lists
- collaboration patterns

### Decision
Reference only. Qalam کو Tiptap چھوڑ کر Lexical پر migrate نہیں کرنا چاہیے۔

---

## BlockNote

Tiptap + ProseMirror-based polished editor system۔ Useful ideas:

- formatting UI
- slash menus
- indentation UX
- collaboration patterns

### Licensing
Core ecosystem MPL-2.0؛ بعض XL packages الگ/stronger license رکھتے ہیں۔

### Decision
UI/UX/reference source کے طور پر مفید؛ direct code reuse ہمیشہ package-level license check کے بعد۔

---

# 12. Open-Source Reuse Matrix

| Qalam Feature | Best Candidate | License | Recommended Use |
|---|---|---|---|
| Ruler / first-line / hanging indent | `editor-ruler` | Apache-2.0 | Reuse/port |
| Text color | Tiptap Color | MIT ecosystem | Direct use |
| Highlight | Tiptap Highlight | MIT ecosystem | Direct use |
| Lists | Tiptap ListKit | MIT ecosystem | Direct use |
| Tables | Tiptap TableKit / ProseMirror Tables | MIT | Direct use + RTL tests |
| Images | Tiptap Image | MIT ecosystem | Direct use/adapt |
| Page setup | Qalam current implementation | — | Keep ours |
| Pagination | OSS Tiptap pagination projects | mostly MIT | Reference only |
| DOCX export | `docx` | MIT | Keep current |
| DOCX rich import | Mammoth | BSD-2 | Strong future reuse |
| Local persistence | IndexedDB | browser-native | Keep current |
| Offline Yjs | `y-indexeddb` | MIT | Conditional future |
| Collaboration | Yjs + Hocuspocus | MIT | Conditional future |
| Version history | Qalam IndexedDB revisions | — | Build locally first |
| Comments/Suggesting | assorted prototypes | mixed | Reference + Qalam-native |
| Spellcheck | browser / Hunspell / nspell | mixed | English now; Urdu later |
| Full office suite | ONLYOFFICE | AGPL-3.0 | Benchmark/reference |
| Full office suite | Collabora | MPL ecosystem | Benchmark/reference |

---

# 13. Revised Implementation Strategy

The roadmap itself does not need a major reorder. What changes is **how each phase is implemented**.

## Phase 3B
Use:

- Tiptap official formatting extensions
- `editor-ruler` concepts/core
- Qalam existing active-format resolver
- Qalam RTL/mm/export tests

Avoid custom formatting primitives where Tiptap already has them.

## Phase 4
Use TableKit + ProseMirror Tables; add Urdu/RTL regression suite.

## Phase 5
Use Tiptap Image + Qalam IndexedDB asset layer.

## Phase 7
Qalam local immutable revisions first.

## Phase 8
Qalam-native comments/suggesting; OSS reference implementations only.

## Phase 10
Keep current local-first model; prepare migration boundaries.

## Phase 11
Yjs + Hocuspocus only if reliable zero-cost hosting exists.

---

# 14. Reuse Gate — New Rule Before Every Major Phase

Before coding any significant Document Studio feature:

1. Search existing Tiptap/ProseMirror ecosystem.
2. Search high-quality GitHub implementations.
3. Verify license.
4. Identify maintenance/adoption risk.
5. Compare with current Qalam architecture.
6. Decide one of:
   - Direct use
   - Adapt
   - Port small core
   - Reference only
   - Reject
7. Only then write new code.

---

# 15. Features Qalam Should NOT Reinvent

Where proven OSS exists, avoid writing these from zero:

- generic text color
- highlights
- basic lists
- table engine
- image node
- generic image resize
- basic ruler drag mechanics
- first-line/hanging-indent interaction mechanics
- DOCX parser
- basic collaboration CRDT
- WebSocket collaboration server
- offline CRDT persistence

---

# 16. Features Qalam SHOULD Own

These remain Qalam's differentiating layer:

- Urdu/RTL-first editor behavior
- mixed Urdu/English run intelligence
- Protected Token Engine
- contextual punctuation
- Urdu orthographic intelligence
- typography intelligence
- Urdu-specific spell/writing intelligence
- language-aware suggestions
- Quality Audit / Health / Suggestions single source of truth
- publishing readiness
- local-first Qalam document workflow
- multilingual export fidelity
- Qalam-specific PDF/DOCX quality
- explainable language corrections

---

# 17. Immediate Next Step

Before Phase 3B coding, perform a small source/API compatibility audit for:

1. `devslab-kr/editor-ruler`
   - Tiptap adapter
   - first-line indent
   - hanging indent
   - unit/tick behavior
   - drag lifecycle
   - accessibility
   - compatibility with Qalam mm + RTL model

2. Tiptap Color
3. Tiptap Highlight
4. Tiptap ListKit
5. Current Qalam:
   - schema
   - toolbar
   - PDF mapping
   - DOCX mapping
   - active-format state

Then create the **smallest safe Phase 3B implementation plan**.

---

# Final Recommendation

Qalam Works کو **Google Docs-class workflow** حاصل کرنے کے لیے ہر بنیادی editor feature خود نہیں لکھنا چاہیے۔

Best strategy:

> **Open-source editor infrastructure + Qalam Urdu/RTL intelligence**

اس approach سے:

- engineering time کم ہوگا
- Grok credits بچیں گے
- regression risk کم ہوگا
- mature interaction patterns ملیں گے
- Qalam team اپنی اصل differentiator پر زیادہ وقت خرچ کر سکے گی

یعنی:

**دنیا نے جو generic مسئلہ solve کر رکھا ہے، اسے reuse کریں۔  
جو Urdu/RTL/publishing مسئلہ دنیا نے solve نہیں کیا، وہ Qalam خود solve کرے۔**
