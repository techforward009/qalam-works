# 01 — Product scope

**Status:** SPEC FREEZE  
**Depends on:** [00-README.md](00-README.md)

## Purpose

Ship an **evidence-based document research assistant**, not a chatbot.

AI is a way to **reach and understand a source**. AI is not a substitute for the source.

```text
User documents
      ↓
Document extraction
      ↓
Qalam normalization (copy, never overwrite raw)
      ↓
Page / paragraph preservation
      ↓
Chunking + metadata
      ↓
Search / retrieval
      ↓
Evidence verification
      ↓
AI answer (only if gate allows)
      ↓
Exact citations
      ↓
Human-readable result
```

## Product name

**Research Studio** — public name.  
**Research Engine** — the evidence pipeline specified in this package.

Existing notes/sources utilities in `app/tools/research-studio/utils/` remain a separate v0 workspace and are out of v0.1 scope.

## In scope for v0.1

- Born-digital PDF, DOCX, TXT, MD
- Page-level provenance
- Qalam `processText()` adapter on a **normalized copy**
- Stable `{documentId}:p{page}:c{chunk}` IDs
- Retrieval + evidence gate + typed answer + exact quote verification
- Refusal when evidence is weak or missing
- Private / local documents only
- Direction-aware UI when the UI phase is unfrozen

## Out of scope for v0.1

- Scanned PDF / OCR / page images
- PPTX, HTML, XLSX
- GraphRAG / knowledge graphs
- Agentic multi-search loops
- LangChain or LlamaIndex as the application core
- Rewriting Unicode Standardizer, Quality Checker, BiDi, Roman Urdu, Translation Studio, Document Studio
- Feeding Research Engine results into Document Studio (later consume-only integration)
- Public web crawl as a default corpus
- Accounts, sharing, or multi-user sync

## Later milestones (do not build now)

| Version | Focus |
| --- | --- |
| v0.1 | Page extract → normalize copy → chunk → retrieve → typed answer → citation → refuse |
| v0.2 | Hybrid retrieval + reranking |
| v0.3 | Multiple documents as a working set |
| v0.4 | OCR after Unicode Standardizer + Quality Checker |
| v0.5 | Research workflows |
| v0.6 | Agentic retrieval, only if simple RAG benchmarks fail |
| v0.7 | GraphRAG / scholarly knowledge |

## MUST

- Present unanswered questions as **Insufficient evidence**, never as invented prose.
- Show human citations: filename + page + quote, not only chunk IDs.
- Keep Urdu, Arabic, Persian, and mixed RTL/LTR as first-class inputs.
- Treat retrieved document text as **untrusted data**, never as instructions.

## MUST NOT

- Build a generic “AI chat with files” UX.
- Let the model fill gaps when sources are silent.
- Replace deterministic Qalam engines with an LLM cleanup step.
- Put this engine inside the Document Studio editor schema.
- Start OCR, GraphRAG, or agency in the first implementation slice.

## ACCEPTANCE

- A product reviewer can point to this file and classify any proposed ticket as in-scope, later, or forbidden.
- v0.1 demo path is: upload born-digital PDF → ask a sourced question → see a cited answer **or** a refusal.
- Existing `tests/researchStudio.test.ts` (notes store) remains passing and unmodified in intent.
