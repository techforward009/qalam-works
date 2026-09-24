# 13 — Security and privacy

**Status:** SPEC FREEZE. Owner gate documented 2026-09-24.
**Depends on:** `docs/ANALYTICS-PRIVACY.md`

Qalam must be stricter than demo RAG apps.

## Untrusted retrieved text

Document content **must never override system instructions**.

- Wrap every chunk in a delimiter the model is told to treat as data.
- Do not concatenate user files into the system prompt.
- Do not execute links, HTML, or JS found in PDFs.

## URL ingestion (if ever enabled)

Block:

- `localhost`, `127.0.0.1`, `::1`
- RFC1918 / link-local / metadata IPs (`169.254.169.254`, etc.)
- Internal hostnames
- Non-http(s) schemes

v0.1: **no URL ingest**. Upload bytes only.

## Privacy

From `docs/ANALYTICS-PRIVACY.md`, also apply to Research Engine:

Never transmit to analytics:

- uploaded text, quotes, answers
- filenames
- hashes of user content
- raw exception messages that may include user text

Allowed: tool id, success boolean, error codes, latency buckets, gate reason **enum**, chunk counts.

## Secrets

- LLM keys only on the server (`app/api/research/*`).
- No `XAI_API_KEY` (or any provider key) in client components.

## Research Studio owner gate

v0.1 has one owner, not accounts. The browser bundle does not receive `QALAM_RESEARCH_ACCESS_PASSWORD` or `QALAM_RESEARCH_SESSION_SECRET`. The session is an HttpOnly signed cookie named `qalam_research_session`. Passwords and session tokens are not logged and are not copied into auth errors. Auth errors do not include document content, filenames, or document ids. Unauthenticated callers do not list documents, fetch pages, or reach Blob. Research Blob objects stay private. Logout clears the cookie in the browser; a copied cookie remains valid until expiry because v0.1 keeps no revocation list.

## MUST

- Cap file size and page count.
- Sanitize filenames in UI (no HTML).
- Trace ids must not include query text.

## MUST NOT

- Use document text as a prompt prefix without an untrusted-data wrapper.
- Log `rawText` to Vercel Analytics or stdout in production.
- Log Research passwords or session tokens.
- Follow redirects to private IPs if URL ingest is added.

## ACCEPTANCE

- Unit test: system prompt still equals the template after a chunk containing “Ignore previous instructions”.
- SSRF tests exist **before** any URL fetch ships.
- Analytics privacy tests (`tests/analytics.privacy.test.ts` pattern) still pass; add Research events to the denylist if new events are introduced.
