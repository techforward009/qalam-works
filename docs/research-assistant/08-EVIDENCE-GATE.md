# 08 — Evidence gate

**Status:** SPEC FREEZE  
**Depends on:** [06-RETRIEVAL.md](06-RETRIEVAL.md), [07-RERANKING.md](07-RERANKING.md)

This is the spirit of the system. **If the gate says no, the LLM is not called.**

## MUST

Pure TypeScript where possible:

```ts
function evaluateEvidence(results: RankedChunk[]): EvidenceGateResult;
```

```ts
type EvidenceGateResult = {
  allowed: boolean;
  reason:
    | "sufficient"
    | "weak_retrieval"
    | "no_evidence"
    | "conflicting_evidence";
};
```

Combine, not a single magic number:

- retrieval threshold (score floor)
- minimum evidence count (v0.1: at least **2** independent chunks **or** 1 chunk with exact-reference match, documented in code)
- source availability (chunk still exists, page still exists)
- query/evidence overlap (shared distinctive tokens after light folding)

`score > 0.3` alone is **not** truth.

## MUST NOT

- Call the LLM to decide whether evidence is sufficient in v0.1.
- Allow generation on zero hits.
- Allow generation on a single weak semantic hit.
- Mutate chunks inside the gate.

## Decision table

| Situation | Result |
| --- | --- |
| Strong evidence (multiple chunks, good overlap) | `allowed: true`, `sufficient` |
| Weak retrieval scores | `allowed: false`, `weak_retrieval` |
| Zero results | `allowed: false`, `no_evidence` |
| One weak result | `allowed: false`, `weak_retrieval` |
| Multiple strong results | `allowed: true`, `sufficient` |
| Strong results that directly contradict on a factual slot (dates, names) | `allowed: false`, `conflicting_evidence` (flag; no answer) |

Conflicting evidence: v0.1 conservative refuse. Do not ask the model to “synthesize” a compromise.

## ACCEPTANCE

Unit tests with **no LLM**:

- strong evidence → allow
- weak retrieval → refuse
- zero results → refuse
- one weak result → refuse
- multiple strong results → allow
- conflicting evidence → flag / refuse

A refused ask records `evidence.reason` on the API response and `llm.skipped = true` on the trace.
