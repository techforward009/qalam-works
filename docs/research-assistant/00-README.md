# Research Engine — Handoff Package

**Status:** SPEC FREEZE  
**Date:** 2026-09-21  
**Product:** Qalam Works  
**Milestone:** Research Engine v0.1 — local/private document Q&A with verified citations

This folder is the implementation contract. It freezes the ChatGPT / awesome-ai-apps research into Qalam-native documents. **Do not start application code from this package until Phase A is explicitly unfrozen.**

## Brief (locked)

Build a Qalam-native, evidence-first Research Engine.

It must preserve document/page provenance, pass extracted text through Qalam's existing deterministic text-processing layer, create stable page/chunk identifiers, support hybrid retrieval and optional reranking, refuse when evidence is insufficient, generate typed answers, and verify every citation against the stored source text before displaying the answer.

The implementation must be modular, TypeScript-first, testable independently, and must not modify or replace Qalam's existing Unicode, BiDi, Quality Checker, Translation Studio, or Document Studio engines.

AI is permitted only after deterministic evidence retrieval has succeeded.

## What this is not

- Not an AI chatbot.
- Not a rewrite of existing Qalam engines.
- Not a LangChain / LlamaIndex core.
- Not a copy of [Arindam200/awesome-ai-apps](https://github.com/Arindam200/awesome-ai-apps). That repository is a **pattern reference only**. Qalam copies **ideas**, not their code, frameworks, or file layout.

## Existing Research Studio (do not confuse)

`app/tools/research-studio/` already holds a **notes/sources project store** (`researchTypes.ts`, `researchStore.ts`, `tests/researchStudio.test.ts`). It has **no public `page.tsx`**.

That store is a separate v0 workspace:

- notes are **verbatim** (never normalized)
- sources are bibliographic metadata
- persistence is localStorage

The Research Engine specified here is a **new evidence pipeline**. It must not rewrite, reuse as a data model, or break that store.

Proposed home for the new engine (when implementation is unfrozen):

```text
app/tools/research-studio/engine/   # new modules only
app/api/research/                   # new APIs only
tests/research/                     # new golden fixtures + unit tests
```

Public UI, when it ships, is `/tools/research-studio`. Until then, do not add the route to `sitemap.ts`.

## Document index

| File | Topic |
| --- | --- |
| [01-PRODUCT-SCOPE.md](01-PRODUCT-SCOPE.md) | What we are building, and what we are not |
| [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | Layers, isolation, Qalam core + small RAG services |
| [03-DATA-MODEL.md](03-DATA-MODEL.md) | Document, page, chunk, citation types |
| [04-INGESTION.md](04-INGESTION.md) | PDF / DOCX / TXT / MD → pages |
| [05-CHUNKING.md](05-CHUNKING.md) | Page → paragraph → stable chunk IDs |
| [06-RETRIEVAL.md](06-RETRIEVAL.md) | Dense + keyword + RRF |
| [07-RERANKING.md](07-RERANKING.md) | Top 20 → Top 5, interchangeable reranker |
| [08-EVIDENCE-GATE.md](08-EVIDENCE-GATE.md) | Refuse before any LLM call |
| [09-CITATION-VERIFICATION.md](09-CITATION-VERIFICATION.md) | Exact quote check; claim mapping |
| [10-LLM-CONTRACT.md](10-LLM-CONTRACT.md) | Typed answer only; one call by default |
| [11-API-CONTRACT.md](11-API-CONTRACT.md) | `/api/research/*` |
| [12-UI-SPEC.md](12-UI-SPEC.md) | Research Studio UI; RTL; citations |
| [13-SECURITY.md](13-SECURITY.md) | SSRF, untrusted retrieved text, privacy |
| [14-EVALUATION.md](14-EVALUATION.md) | Benchmarks, metrics, refusal |
| [15-TEST-PLAN.md](15-TEST-PLAN.md) | Fixtures, golden tests, regression |
| [16-IMPLEMENTATION-CHECKLIST.md](16-IMPLEMENTATION-CHECKLIST.md) | Phase order and Definition of Done |
| [17-AMENDMENT-MVP.md](17-AMENDMENT-MVP.md) | Product rule, MVP promise, Phase A cap |

## How to read each document

Every numbered spec has three locked sections:

- **MUST** — required behavior
- **MUST NOT** — forbidden behavior
- **ACCEPTANCE** — tests or checks that close the phase

If a later conversation contradicts this folder, **this folder wins** until a dated amendment is added here or in `docs/DECISIONS.md`. **[17-AMENDMENT-MVP.md](17-AMENDMENT-MVP.md) wins over 00–16 on MVP scope and Phase A width.**

## Implementation freeze

| Allowed now | Forbidden now |
| --- | --- |
| Edit these spec files | `app/tools/**` engine code |
| Add a DECISIONS.md pointer | New public routes |
| | LangChain / LlamaIndex as core |
| | OCR, GraphRAG, agentic loops |
| | Changes to Unicode / BiDi / Quality Checker / Document Studio / Translation Studio |

## Reference patterns (ideas only)

| Source | Adopt | Do not adopt yet |
| --- | --- | --- |
| Agentic Typed RAG | stable chunk IDs, typed answers, refusal gate, exact quote check | their runtime, vendors, agents |
| Production PDF RAG | page provenance, hybrid retrieval, RRF, rerank, clickable citations | their stack as Qalam core |
| Trustworthy RAG | claim-level evidence mapping | LLM-as-judge as truth |
| Gemma OCR | later visual-page OCR research | Phase 1 |
| GraphRAG | later scholarly graph | now |

## v0.1 slice

```text
PDF/DOCX/TXT/MD
  → page extraction
  → Qalam processText() adapter (normalized copy only)
  → chunks with immutable IDs
  → retrieval
  → evidence gate
  → typed LLM answer (only if allowed)
  → exact citation verification
  → render or refuse
```
