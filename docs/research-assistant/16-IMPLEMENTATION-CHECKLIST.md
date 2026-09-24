# 16 — Implementation checklist

**Status:** Ask, upload, page fetch, the tiny evaluation harness, the Research Studio page, private Blob persistence, and the owner password gate are unfrozen. The 100-item set stays frozen.

See [17-AMENDMENT-MVP.md](17-AMENDMENT-MVP.md). Phase A, when unfrozen, is **only** items 1–3 below. Later numbers require their own unfreeze.

## Sequence (locked)

**Phase A (unfrozen 2026-09-22)**

1. Types  
2. Document ingestion  
3. Page preservation  

**Stop and review.**

**Phase B (unfrozen 2026-09-22)**

4. Qalam `processText()` adapter  
5. Chunking  

**Stop and review.**

**Phase C (unfrozen 2026-09-22)**

6. Storage  

**Stop and review.**

**Phase D (unfrozen 2026-09-24)**

8. Keyword retrieval

**Stop and review.**

**Phase E (unfrozen 2026-09-24)**

11. Evidence gate

**Stop and review.**

**Phase F (unfrozen 2026-09-24)**

13. Citation verification

**Stop and review.**

**Phase G (unfrozen 2026-09-24)**

12. Typed answer contract, without an LLM call

**Stop and review.**

**LLM answer adapter (unfrozen 2026-09-24)**

Workers AI draft only, after the evidence gate and before citation verification. No API or UI.

**Stop and review.**

**Research API (unfrozen 2026-09-24)**

14. `POST /api/research/ask`, `POST /api/research/documents`, and `GET /api/research/documents/:id/pages/:page`. Process memory only. No UI.

**Stop and review.**

**Evaluation harness (unfrozen 2026-09-24)**

16. Tiny offline benchmark only. No retrieval change and no model call.

**Stop and review.**

**Research Studio UI (unfrozen 2026-09-24)**

15. `/tools/research-studio` only. No sitemap entry. No engine changes.

**Stop and review.**

**Private Blob persistence (unfrozen 2026-09-24)**

Research documents persist in the private `qalam-research` Vercel Blob store. One JSON object per document. `parseStoredCorpus()` validates every read and write. Memory is a per-request working set only. Production requires `QALAM_RESEARCH_STORE_ID`.

**Stop and review.**

**Research Studio owner authentication (unfrozen 2026-09-24)**

`/tools/research-studio` stays publicly reachable as a page. The workspace and the document APIs require a server-checked owner password (`QALAM_RESEARCH_ACCESS_PASSWORD`). The session cookie `qalam_research_session` is HttpOnly and signed with `QALAM_RESEARCH_SESSION_SECRET`. Missing configuration is `auth_not_configured`, not unsigned access. Blob persistence is unchanged. This is a single-owner v0.1 gate, not per-user ownership.

**Stop and review.**

**Multi-part evidence coverage (unfrozen 2026-09-24)**

Keyword retrieval and the evidence gate are unchanged. Ask preparation reads up to 20 keyword hits, then keeps at most 5 chunks by deterministic matched-term coverage. This is not semantic query understanding. Citation verification, Blob storage, and authentication are unchanged.

**Stop and review.**

**Later phases (each needs its own unfreeze)**

7. Dense retrieval (v0.2; stub interface in v0.1)  
9. Hybrid fusion (v0.2)  
10. Reranking (v0.2; `NoopReranker` in v0.1)  
17. Golden tests (100-item set)
18. Performance / security testing  

**Agentic retrieval last** (v0.6), only if fixed retrieval benchmarks fail.

## Coder MUST NOT (bold)

- Rewrite the existing Unicode engine  
- Modify the existing BiDi formatter  
- Break the existing Document Studio schema  
- Give the LLM unrestricted control over raw documents  
- Treat vector search as truth  
- Render answers without citations  
- Use URL-only citations  
- Put scanned OCR in Phase 1  
- Implement GraphRAG now  
- Drop a generic agent framework across Qalam  
- Impose LangChain / LlamaIndex as Qalam architecture  
- Edit `app/tools/research-studio/utils/researchTypes.ts` / `researchStore.ts` to hold embeddings  

## Definition of Done (feature is not done when the UI opens)

**Functional**

- PDF ingest works  
- Urdu / Arabic / Persian preserved  
- Pages preserved  
- Chunks have stable ids  
- Search works  
- Citations work  

**Quality**

- Unsupported question → refusal  
- Forged quote → reject  
- Citation matches source  
- RTL/LTR preserved  
- Mixed-script queries work  

**Regression**

- Existing Qalam focused tests still pass  
- Notes-store `tests/researchStudio.test.ts` still passes  

**Build**

- `npx tsc --noEmit`  
- `npm run build`  
- Focused Vitest for new modules  

**Production**

- Secrets not on the client  
- Document content not in analytics  
- Retrieval trace available (no raw text)  
- Errors graceful  

## Unfreeze rule

A dated line in `docs/DECISIONS.md` or a PR titled `Unfreeze Research Engine Phase A` is required before any `engine/` file is added.

Until then, only this `docs/research-assistant/` package (and a pointer decision) may change.
