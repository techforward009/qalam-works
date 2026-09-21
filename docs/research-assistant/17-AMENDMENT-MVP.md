# 17 — Amendment: MVP product rule (2026-09-21)

**Status:** SPEC AMENDMENT — still frozen; **Phase A is not unfrozen**  
**Supersedes in case of conflict:** the “first slice” language in 00–16, without deleting those files.

This amendment records agreement between the engineering freeze and the product/MVP reading:

- First implementation is **small**.
- Research Engine is **not** a general chatbot.
- Phases open **one at a time**.

## Product-level rule (locked)

**Research Studio is an evidence-based document research tool. It is not a general-purpose conversational AI assistant.**

`Research Engine ≠ AI Chatbot`

## User-facing MVP promise (locked)

Ask your documents. See the answer with a page and an original quotation. If the material is not there, you will be told clearly.

اردو:

اپنی دستاویزات سے سوال کریں۔ جواب کے ساتھ صفحہ اور اصل اقتباس دیکھیں۔ مواد نہ ملے تو واضح طور پر بتایا جائے گا۔

## Where it lives in the product

Do **not** invent a second “AI Chat” world.

When UI is later unfrozen, **Ask your documents** belongs on Research Studio (sources / notes / quotations already sketched in `app/tools/research-studio/utils/`). The notes store remains verbatim; the engine is an additional pipeline, not a replacement.

Phase A still **must not** rewrite `researchTypes.ts` / `researchStore.ts`.

## Actual first pipeline (v0.1)

Not hybrid retrieval, not rerankers, not agents, not OCR, not GraphRAG:

```text
PDF / DOCX / TXT / MD
        ↓
Text extraction
        ↓
Qalam processText() on a copy (raw kept)
        ↓
Page preservation
        ↓
Chunks
        ↓
Keyword search
        ↓
Evidence check
        ↓
LLM answer (only if allowed)
        ↓
Citation check against stored source
        (normalized copy first; raw as fallback)
        ↓
Answer + page + quote   OR   “مواد کافی نہیں”
```

Dense / RRF / rerank stay **v0.2+**, and only if keyword retrieval is proven insufficient.

## Phase A — still frozen; scope not expanded

When Phase A is explicitly unfrozen, it is **only**:

1. Types (`ResearchDocument`, `DocumentPage`, related ids)
2. Ingestion (PDF / DOCX / TXT / MD)
3. Page preservation

Then **stop**. Review the result. Unfreeze the next phase in a dated decision. Do not pull chunking, search, LLM, API, or UI into Phase A.

## MUST

- Keep this amendment in the handoff index.
- Treat the MVP promise as the only user-facing claim until later phases ship.

## MUST NOT

- Unfreeze Phase A by implication of this amendment.
- Widen Phase A to “the whole v0.1 pipeline”.
- Add a standalone ChatGPT-style chat route.

## ACCEPTANCE

- A reviewer reading only this file can state: chatbot or not; MVP promise; Phase A contents; whether code may start (**no**).
