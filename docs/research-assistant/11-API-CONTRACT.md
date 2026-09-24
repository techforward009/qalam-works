# 11 — API contract

**Status:** SPEC FREEZE. Owner authentication documented 2026-09-24.
**Depends on:** [03-DATA-MODEL.md](03-DATA-MODEL.md), [10-LLM-CONTRACT.md](10-LLM-CONTRACT.md)

Routes live under `app/api/research/` when implementation is unfrozen. They must not be added to the public sitemap.

## Owner authentication

Research Studio v0.1 is a single-owner gate. It is not a multi-user account system and it does not assign documents to people.

`POST /api/research/auth` accepts only `{ "password": "..." }`. The password is compared on the server with `QALAM_RESEARCH_ACCESS_PASSWORD`. It is not stored in the cookie and it is not returned. A correct password sets the HttpOnly cookie `qalam_research_session`: HMAC-SHA256 over an expiry and a random nonce, about 7 days, `SameSite=Lax`, `Path=/api/research`, and `Secure` in production. The signature key is `QALAM_RESEARCH_SESSION_SECRET`. A wrong password is HTTP 401 `unauthorized` and sets no cookie. Malformed JSON, unexpected fields, and an oversized body are HTTP 400.

`GET /api/research/auth` returns HTTP 200 `{ "authenticated": true }` or HTTP 401 `{ "authenticated": false }`. `DELETE /api/research/auth` clears that cookie and returns `{ "authenticated": false }`. Logout only clears the browser cookie. v0.1 has no server-side revocation list, so a copied cookie still works until it expires.

If either environment variable is missing, password checks and the document routes return HTTP 503 `{ "error": "Research access is not configured.", "code": "auth_not_configured" }`. There is no unsigned fallback and no process-memory fallback.

`POST /api/research/documents`, `POST /api/research/ask`, and `GET /api/research/documents/:id/pages/:page` check the session before any document bytes are read and before Blob is called. Otherwise HTTP 401 `{ "error": "Authentication required.", "code": "unauthorized" }`.

The `qalam-research` Blob store stays private and authoritative. Responses do not include blob URLs.

## Endpoints

### Upload

```http
POST /api/research/documents
```

Multipart file field `file`. v0.1 ingests, chunks, and stores in the same request. Response: `{ id, documentId, filename, format, pageCount, chunkCount, processingStatus }`. No raw text. Each ready document is one private object in the `qalam-research` Blob store. The separate process route stays frozen.

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

Returns `{ documentId, pageNumber, rawText }`. `rawText` is the stored page text, unchanged. Unknown document or page is HTTP 404 `not_found`, without other ids. A malformed id or page is HTTP 400. Page text is read from the private `qalam-research` object. Responses do not include blob URLs.

## MUST

- Auth / private-mode: v0.1 is owner-only. The password stays on the server. There is no per-user document ownership.
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
