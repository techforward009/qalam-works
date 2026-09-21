# 07 — Reranking

**Status:** SPEC FREEZE  
**Depends on:** [06-RETRIEVAL.md](06-RETRIEVAL.md)  
**Build in Phase D / v0.2.** v0.1 may use `NoopReranker` (identity on the top 5 keyword hits).

## Shape

```text
Top 20 fused candidates
        ↓
     reranker
        ↓
     Top 5 evidence chunks
```

## MUST

```ts
interface Reranker {
  rerank(query: string, candidates: RetrievedChunk[]): Promise<RankedChunk[]>;
}
```

- Ship three implementations behind the same interface:
  - `NoopReranker` — take first min(5, n)
  - `LocalReranker` — optional on-device model later
  - `ApiReranker` — optional hosted model later
- Default v0.1: `NoopReranker`.
- Reranker input is **untrusted chunk text**.

## MUST NOT

- Hard-code a single vendor.
- Call the LLM as the reranker in v0.1 (cost + instruction-injection risk).
- Skip the evidence gate because a reranker score “looks high”.

## Benchmarks (Phase D)

| Metric | Notes |
| --- | --- |
| Recall@5 | Expected page in top 5 |
| Precision@5 | |
| MRR | |
| Latency | p50 / p95 |

## ACCEPTANCE

- Swapping `NoopReranker` for a stub `ApiReranker` requires no Ask-orchestrator change.
- `NoopReranker` on 3 candidates returns 3, order unchanged.
- Reranker failure degrades to fused top 5 and is traced; it does not throw past the API.
