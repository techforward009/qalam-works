# 11 — API contract

**Status:** SPEC FREEZE  
**Depends on:** [03-DATA-MODEL.md](03-DATA-MODEL.md), [10-LLM-CONTRACT.md](10-LLM-CONTRACT.md)

Routes live under `app/api/research/` when implementation is unfrozen. They must not be added to the public sitemap.

## Endpoints

### Upload

```http
POST /api/research/documents
```

Multipart file field `file`. v0.1 ingests, chunks, and stores in the same request. Response: `{ id, documentId, filename, format, pageCount, chunkCount, processingStatus }`. No raw text. Documents live only in process memory. The separate process route stays frozen.

### Process

```http
POST /api/research/documents/:id/process
```

Runs extraction + adapter + chunking. Idempotent if already `ready`.

### Search

```http
POST /api/research/search
```

Body: `{ query: string, documentIds?: string[], k?: number }`  
Response: retrieved chunks **without** calling the LLM.

### Ask

```http
POST /api/research/ask
```

Body: `{ query: string, documentIds?: string[] }`

Success:

```json
{
  "answered": true,
  "answer": "...",
  "citations": [
    {
      "documentId": "book_001",
      "pageNumber": 137,
      "chunkId": "book_001:p137:c2",
      "quote": "..."
    }
  ],
  "evidence": { "chunksUsed": 3 }
}
```

Refusal:

```json
{
  "answered": false,
  "answer": "Insufficient evidence.",
  "citations": [],
  "evidence": { "reason": "weak_retrieval", "chunksUsed": 0 }
}
```

Localized `answer` strings are a UI concern; API may return an English `answer` plus `reason` and let the client translate.

### Page fetch (citation click)

```http
GET /api/research/documents/:id/pages/:page
```

Returns `{ documentId, pageNumber, rawText }`. `rawText` is the stored page text, unchanged. Unknown document or page is HTTP 404 `not_found`, without other ids. A malformed id or page is HTTP 400. Page text lives only in process memory.

## MUST

- Auth / private-mode: v0.1 may be owner-only or local-dev unsigned; document the chosen lock. Do not expose other users’ documents.
- Cap upload size (recommend 25 MB) and page count (recommend 400) with a typed error.
- Return structured error codes, not stack traces.

## MUST NOT

- Put secrets in client bundles.
- Echo full documents in traces sent to third-party analytics.
- Add GET-with-query for Ask (use POST).

## ACCEPTANCE

- Ask with no documents → `answered: false`, `reason: "no_evidence"`, HTTP 200 (domain refusal, not 500).
- Process corrupt file → HTTP 4xx/typed `corrupt`, not 500 HTML.
- Page endpoint 404s on unknown page without leaking other ids.
