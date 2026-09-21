# 03 — Data model

**Status:** SPEC FREEZE  
**Depends on:** [02-ARCHITECTURE.md](02-ARCHITECTURE.md)

All ids are strings. Chunk ids are **immutable** after insert. Raw extracted text is never overwritten.

## Document

```ts
type ResearchDocument = {
  id: string;
  filename: string;
  mimeType: string;
  language: "ur" | "ar" | "fa" | "en" | "mixed" | "unknown";
  pageCount: number;
  createdAt: string; // ISO-8601
  processingStatus: "pending" | "processing" | "ready" | "failed";
  failureCode?: "empty" | "corrupt" | "unsupported" | "internal";
};
```

## DocumentPage

```ts
type DocumentPage = {
  id: string;
  documentId: string;
  pageNumber: number; // 1-based, stable
  rawText: string;
  normalizedText: string;
  extractionMethod: "pdf-text" | "docx" | "plain" | "markdown";
};
```

`rawText` is the extractor output. `normalizedText` is `processText(rawText, mode).output` (or equivalent adapter). Citations verify against **`rawText` first**; normalized text is for retrieval.

## Chunk

```ts
type ChunkContentType =
  | "paragraph"
  | "heading"
  | "table"
  | "caption"
  | "footnote"
  | "list"
  | "quote";

type DocumentChunk = {
  id: string; // `{documentId}:p{page}:c{chunk}`
  documentId: string;
  pageNumber: number;
  chunkIndex: number; // 1-based on that page
  rawText: string;
  normalizedText: string;
  heading?: string;
  paragraphIndex?: number;
  language: ResearchDocument["language"];
  direction: "rtl" | "ltr" | "auto";
  contentType: ChunkContentType;
};
```

### Chunk id format

```text
{documentId}:p{page}:c{chunk}
```

Example: `book_001:p137:c2`

Ids must be human-readable and stable across process reruns of the **same bytes** (same document id + same page split + same chunker version). If the chunker algorithm changes, bump a `chunkerVersion` on the document and mint new ids — never mutate old ids in place.

## Citation

```ts
type Citation = {
  documentId: string;
  pageNumber: number;
  chunkId: string;
  quote: string;
};
```

## Ask result

```ts
type EvidenceGateReason =
  | "sufficient"
  | "weak_retrieval"
  | "no_evidence"
  | "conflicting_evidence";

type ResearchAnswer = {
  answered: boolean;
  answer: string;
  citations: Citation[];
  evidence: {
    chunksUsed: number;
    reason?: EvidenceGateReason;
  };
};
```

## Notes-store isolation

Do **not** extend `ResearchProject` / `ResearchNote` / `ResearchSource` from `app/tools/research-studio/utils/researchTypes.ts` to hold pages or embeddings. Those types stay bibliographic + verbatim notes.

## MUST

- Persist `rawText` and `normalizedText` as separate fields.
- Use 1-based page numbers in every user-facing citation.
- Reject documents that would collapse to a single unpaged blob when a pager exists (PDF).

## MUST NOT

- Use opaque embeddings-only keys as the public citation id.
- Store only normalized text.
- Reuse note ids (`NOTE-0001`) for chunks.

## ACCEPTANCE

- Given PDF `Book.pdf` with 300 pages, the store contains 300 `DocumentPage` rows (or a documented extractor failure per missing page), not one blob.
- `book_001:p137:c2` round-trips unchanged after reload.
- Type names in this file are the names tests and APIs must use (or a documented alias map).
