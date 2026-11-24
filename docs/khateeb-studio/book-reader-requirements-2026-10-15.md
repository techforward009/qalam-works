# Khateeb Studio — کتاب خانہ / Book Reader

**Decision record — 2026-10-15**  
**Status:** Product requirement, architecture and acceptance criteria. **No reader implementation or production activation in PR #71.**  
**Owner goal:** A khateeb must be able to **read the stored books as books**, not only retrieve excerpts for sermons.

## Existing functionality (confirmed in repository)

- `app/tools/khateeb-studio/BookLibraryPanel.tsx` already offers corpus search, book/language/source filters, a modal for **one complete record**, paragraph selection, copy-with-reference, and add-to-sermon.
- `app/api/khateeb/library/route.ts` supports `catalog`, `search`, `record`, `topic`; there is **no dedicated book TOC/reader navigation API**.
- `app/lib/knowledge/bookCorpus.ts` stores separate `BookSource` editions and `BookRecord` metadata, paragraphs and text hashes, optional `printPage`. **All 4,978 owner ZIP record entries have null `printPage`**; do not fabricate pagination.
- Arabic Al-Kafi volume 8 has `القسم` intake divisions: these are **not verified authorial chapter labels**. Keep original and review labels distinct.
- Source body/paragraph IDs and citation hashes already permit durable excerpts, but a persistent per-user last-read location / bookmarks, book-shaped continuous reading, and cross-chapter next/previous navigation are **not implemented**.

## Experience: first-class «کتاب خانہ»

### Entry
Make «کتاب خانہ» a **prominent first-class area** reachable from Khateeb Studio (and optionally Research Studio later), not buried under «میری مجلس». Preserve existing search/excerpt workflows and avoid duplication.

### Shelf
Display available books: **نہج البلاغہ، صحیفہ کاملہ سجادیہ، الکافی**, and authorized books as added later. Each card shows book name, source-edition language, available volumes, reader availability, and translation provenance where known. A cover is optional and must never be invented/misattributed. Never expose private storage object keys or file extensions as reader titles.

### Open a book
- Choose edition/language and (for Al-Kafi) **volume**, then choose real book/chapter heading **where verified**. Where absent, display a neutral **source division / source order** label, *not* “باب” as a guessed heading.
- An accessible **table of contents** derives stable ordered sections from source record identities; first section opens by default. Offer **previous / next section**, return to contents, and resume from last-read location.
- Reading view: a calm **paper-like** page style in light/dark mode, RTL for Arabic/Urdu and LTR for English, good line length/leading, clear source/translation separation, and user-controlled **font size** and optional comfortable width. Use Qalam's existing vetted Arabic and Urdu font roles, never force Arabic into an Urdu font.
- Reader layout may resemble pages, but **synthetic screen pagination is navigation only**. It must not be labeled as actual printed page numbers; show a print-page citation only when attached to an exact reviewed edition and paragraph.
- Text is copied **exactly** from immutable corpus paragraphs. No generative restyling, silent normalization, diacritic deletion, model-authored translation, or “fixed” chain of narrators.

### In-book search
- Search **within current book/volume/edition** or across all authorized books. Return highlighted hits with section heading/source reference and buttons to jump to the **exact original paragraph**.
- Support Arabic diacritic-insensitive matching as a **query/index operation only**. Keep displayed/copied Arabic unchanged. Matching text must not turn a partial substring into an invented citation.
- Search term may be entered in Urdu, Arabic or English; cross-language semantic search is a separate later experiment and must never override exact text search.
- Retain search query/active hit across navigating into and out of the reading view; provide next/previous match affordances. Respect the user's source access and per-request bounded results.

### Copy, save, cite, use
- Select words or one/multiple bounded paragraphs; actions: **صرف عبارت نقل کریں**, **حوالہ سمیت نقل کریں**, **مجلس میں شامل کریں**, **نشان لگائیں**, **یہاں سے پڑھنا جاری رکھیں**.
- Citation includes source book + volume + original verified chapter/section and local number + optional true printed edition/page **only when independently reviewed**; otherwise omit the page. For translations carry translator and edition; when translation is missing state so and **never invent** one.
- Persistent bookmarks/last-read use **source SHA, record SHA, paragraph ID + language/edition** and are not silently migrated across changed editions; allow the user to clear their private history.
- Copy-to-sermon reuses **existing validated `BookExcerpt` pipeline**, and maintains immutable snapshot hashes. Do not introduce a parallel unchecked excerpt format.
- A future print reader may print selected lawful excerpts; whole-book export requires a separate **reuse-rights and permission gate** and is **not in the initial milestone**.

## Source access and rights — release blockers

**Security observation to audit before building reader:** `GET /api/khateeb/library` currently reads `loadBookCatalog` and record/search from private Blob, but (unlike `POST`) does not call `rejectUnauthenticatedResearch` in the route's GET handler. Thus **do not assume** docs' "private library" means authenticated readers today. Product owner must explicitly resolve which specific texts are permitted to be public vs owner-only. **Do not enlarge access** by adding new browse or full-book APIs that inherit a permissive GET path.

For the private corpus, the new reader routes must demand the existing signed owner research session **before any catalog metadata or source text is returned**; privacy-preserving `Cache-Control: private, no-store` and strict ID/source validation are required. For publicly licensed material, design a clearly separate intentionally public access path, after rights validation and edition attribution. Avoid fetching all book records in the browser or exposing Blob path/credentials; the server returns a bounded TOC and one bounded reading unit at a time.

## Delivery plan (separate PR; after #71 audit)

1. **Phase R1 — shelf, contents and one-volume book reading.** Read-only, authenticated edition/volume selection, bounded TOC, next/previous (source order), RTL book layout, exact copy; restore old search and sermon behavior unchanged.
2. **Phase R2 — in-book search and bookmarks.** Jump to original paragraph, highlight without mutating source string, find next/previous, private local last-read and bookmarks; copy with checked original citations.
3. **Phase R3 — reviewed reference sidecar and source/translation parallel view.** Only verified exact source/hash/edition annotations; original source and supplied translations separate; optional add-to-sermon.
4. **Phase R4 — catalog growth and advanced reading.** New authorized books, cross-edition comparison, optional read-aloud and print based on verified rights. Performance testing with all eight Kafi volumes.

## Acceptance and testing

- Arabic and Urdu **RTL**, English LTR, desktop/mobile, light/dark, no clipping of Nastaliq diacritics and correct Arabic font. Font-size controls must persist only by user preference.
- Navigation never crosses to a different edition silently. Section 1 → 2 and last-section → end are deterministic; all source IDs and paragraph IDs stable.
- **Exactly copied characters** and source hashes preserved through selected text, copy, print preview and sermon insertion. Quoted Arabic and any available translation remain distinct.
- Searches show only readable, permission-allowed books, jump to precise paragraph, and preserve matched original text.
- Missing real print pages remain blank/«مطبوعہ صفحہ دستیاب نہیں»; **screen page N never masquerades as a printed page N**.
- Lost session and unknown source return forbidden/not-found, never raw private metadata. No accidental text disclosure via public GET, cache or browser state. Confirm policy with tests **before** making additional browse routes.
- Long book/volume performance: index browsing is **paged**, reading unit bounded; no 19,129-paragraph single DOM render. Keyboard and screen reader navigation work.
- Provenance: incomplete Al-Kafi book-title/chapter metadata, references with `عن` variation, and any Tafsir/Safdar corpus in editorial HOLD stay unresolved, not auto-fixed.
- No merge or production deployment until owner approves both access policy and reading UX.

## First implementation tasks after audit

- **SEC-1:** add regression test for unauthenticated `GET` and map current public/owner boundary before enabling browse.
- **R1-1:** pure function `buildBookContents(records,sourceId)` returns bounded, source-ordered TOC entries with *never-invented* labels, stable IDs and continuation boundaries.
- **R1-2:** authenticated `GET ...?op=contents&sourceId&cursor` and `GET ...?op=read&sourceId&id` with caps and safe errors; reuse existing `record` only after access review.
- **R1-3:** dedicated `BookReader` component with shelf / index / page-like text, exact copy, back/next/previous. Integration with existing `BookExcerpt` once verified.
- **R1-4:** Urdu design review on phone and desktop (especially Arabic vs Nastaliq text layout), then automated tests.

**Scope boundary:** This document records the user's additional requirement. PR #71 remains an audit and editorial sidecar prototype, not a book-reader rollout.
