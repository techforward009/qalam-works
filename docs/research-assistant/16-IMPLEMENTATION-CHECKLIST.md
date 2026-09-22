# 16 — Implementation checklist

**Status:** Phase A done. Phase B unfrozen 2026-09-22 (processText adapter + chunking). Later phases still frozen.

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

**Later phases (each needs its own unfreeze)**

6. Storage  
7. Dense retrieval (v0.2; stub interface in v0.1)  
8. Keyword retrieval  
9. Hybrid fusion (v0.2)  
10. Reranking (v0.2; `NoopReranker` in v0.1)  
11. Evidence gate  
12. Typed LLM answer  
13. Citation verification  
14. API  
15. UI  
16. Evaluation dataset  
17. Golden tests  
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
