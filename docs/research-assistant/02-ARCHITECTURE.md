# 02 — Architecture

**Status:** SPEC FREEZE  
**Depends on:** [01-PRODUCT-SCOPE.md](01-PRODUCT-SCOPE.md), `docs/ARCHITECTURE.md`

## Principle

```text
Qalam core (deterministic, already shipped)
     +
small AI / RAG services (this engine)
```

Not:

```text
Qalam → LangChain → LlamaIndex → another abstraction → LLM
```

Qalam already owns Next.js App Router, TypeScript, TipTap Document Studio, Vitest, and deterministic `processText()`. New retrieval services plug in **beside** that core.

## Placement in the product

```text
Qalam Works
├── Unicode Standardizer
├── Document Cleaner
├── Quality Checker
├── Document Studio
├── Translation Studio
└── Research Studio          ← public module (UI later)
      ├── v0 notes/sources store   (already exists; do not rewrite)
      └── Research Engine          (this spec; new)
            ├── Sources / Documents
            ├── Search
            ├── Evidence
            ├── Ask
            └── Citations
```

Document Studio may **consume** engine results in a later phase. It must not host the engine.

## Layering

```text
UI (Research Studio)
        ↓
API  /api/research/*
        ↓
Ask orchestrator (no unbounded agent loop)
        ↓
Evidence gate  →  refuse  OR  typed LLM  →  citation verify
        ↑
Retrieval (keyword, later dense + RRF + rerank)
        ↑
Chunk store
        ↑
Ingestion (extract pages → adapter → chunks)
        ↑
User files (untrusted)
```

## Qalam adapter rule

```text
Document
 → deterministic extraction
 → Qalam processText() on a copy
 → optional Quality Checker inspection (no mutation)
 → AI only where reasoning is required
```

Forbidden:

```text
Document → LLM → "cleaned" Urdu
```

Call sites (do not fork):

- `app/utils/processing/processText.ts` — `processText(input, mode)`
- `app/utils/unicode/standardizeUrduText.ts` — compatibility wrapper only; prefer `processText`
- Quality Checker remains **inspection only** (`docs/PRODUCT-ROLES.md`)

## Code ownership (when unfrozen)

Follow `docs/ARCHITECTURE.md` tool isolation:

```text
app/tools/research-studio/
├── utils/                 # EXISTING notes store — do not modify for this engine
│   ├── researchTypes.ts
│   └── researchStore.ts
├── engine/                # NEW
│   ├── ingestion/
│   ├── chunking/
│   ├── retrieval/
│   ├── evidence/
│   ├── llm/
│   ├── types/
│   └── utils/
└── page.tsx               # NEW only in UI phase

app/api/research/          # NEW
tests/research/            # NEW
```

Promote nothing into `app/utils/` until a second tool genuinely reuses it.

## Cost and control

| Question class | LLM calls |
| --- | --- |
| Weak / zero evidence | **0** |
| Simple sourced question | **1** |
| Complex, after a controlled second retrieval | **1** (max 1 extra retrieval) |
| Retries after invalid quote | **1–2** total, then refuse |

No unbounded agent loops in v0.1–v0.2.

## Observability

Every ask gets a trace id `research_YYYY_NNNNNN` with: query **length/language only**, retrieval counts, top scores, model id, token counts, latency, gate result, validation flags.

**Never** put document text, quotes, filenames, or answers into analytics. See `docs/ANALYTICS-PRIVACY.md`.

## MUST

- Keep the engine independently testable with no Next.js UI.
- Isolate LLM I/O behind `engine/llm/` and a typed schema.
- Treat existing engines as **read-only dependencies**.

## MUST NOT

- Install LangChain / LlamaIndex as Qalam architecture.
- Modify Document Studio TipTap schema for citations in v0.1.
- Mix notes-store types (`ResearchNote`, `ResearchProject`) with engine `Document` / `Chunk` types.
- Use vector similarity as truth.

## ACCEPTANCE

- A new contributor can name the folder for engine code vs notes-store code vs API vs tests.
- Architecture diagram in this file matches [16-IMPLEMENTATION-CHECKLIST.md](16-IMPLEMENTATION-CHECKLIST.md) phase order.
- No proposed module lives inside `app/tools/document-studio/`.
