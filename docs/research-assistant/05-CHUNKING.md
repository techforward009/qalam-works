# 05 — Chunking

**Status:** SPEC FREEZE  
**Depends on:** [04-INGESTION.md](04-INGESTION.md)

## Goal

```text
Document → Page → Paragraph → Semantic chunk
```

Not “every 500 tokens” as the only strategy.

## Id format (locked)

```text
{documentId}:p{page}:c{chunk}
```

- `page` is the 1-based `DocumentPage.pageNumber`
- `chunk` is 1-based on that page
- Immutable once written

Example: `book_001:p137:c2`

## Algorithm (v0.1)

1. Split `rawText` on the page into paragraphs (blank-line / Unicode paragraph separators).
2. Assign `contentType` with conservative heuristics: heading if short and no terminal punct; list if line starts with bullet/digit; otherwise `paragraph`. Tables if extractor provided table markup; otherwise do not guess a table.
3. If a paragraph exceeds the max size (recommend 800 Unicode code points), split on sentence boundaries **within the same page**. Never merge across pages.
4. Copy the corresponding slice of `normalizedText` (or re-run `processText` on the chunk `rawText` if slice alignment is unsafe). Prefer per-chunk `processText` if offsets might drift.
5. Stamp `language` / `direction` from `processText` on that chunk.

## MUST

- One chunk never spans two PDF pages.
- `chunk.rawText` is a contiguous substring of `page.rawText` (or an exact paragraph from the DOCX extractor).
- Re-ingesting the same file with the same `documentId` and same chunker version yields the same ids and same `rawText`.
- Record `chunkerVersion` on the document.

## MUST NOT

- Use only token windows that ignore paragraphs.
- Rewrite Arabic-script whitespace as part of chunking.
- Change an existing chunk id to “fix” a bug — version and re-index instead.
- Drop footnotes; if uncertain, keep them as `contentType: "footnote"` or `paragraph`.

## ACCEPTANCE

- Page 137 with two paragraphs → `…:p137:c1` and `…:p137:c2`.
- A 2-page fixture never produces a chunk whose `pageNumber` disagrees with its id.
- Urdu paragraph with inner Latin (`Imam Hasan al-Askari`) stays one chunk unless it exceeds max size.
- Golden JSON: `{ id, pageNumber, rawText }` for a checked-in fixture PDF.
