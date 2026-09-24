# 06 — Retrieval

**Status:** SPEC FREEZE  
**Depends on:** [05-CHUNKING.md](05-CHUNKING.md)  
**v0.1:** keyword retrieval is enough to prove the pipeline.  
**v0.2:** add dense + RRF.

## MUST

- Support **keyword** search in v0.1 (exact tokens, Arabic-script aware).
- Design types so **dense** search can be added without changing Ask API.
- Hybrid (v0.2):

```text
Question
  ├─ Dense search
  └─ Keyword search
        ↓
     RRF fusion
        ↓
     Top 20 chunks
```

- Keep retrieval independent of the LLM. Retrieval runs even when the gate will refuse.
- Urdu queries must match with and without definite article / hamza variants at the keyword layer **without** changing Unicode Standardizer. Put light query folding in the retriever, not in `processText`.

## MUST NOT

- Replace Qalam normalization.
- Treat cosine similarity as a factual answer.
- Send 50 chunks to the LLM.
- Require a GPU in v0.1.

## Query classes (test these)

| Query | Why |
| --- | --- |
| `Hadith 289` | Keyword / exact reference |
| `امام حسن عسکری` | Urdu proper name |
| `امام حسن العسکری` | Article variant |
| `حسن عسکری` | Short form |
| `Imam Hasan al-Askari` | Latin |
| `امام Hasan al-Askari` | Mixed |
| `What principles of child upbringing are emphasized?` | Semantic (v0.2 dense) |

## Interfaces

```ts
interface RetrievedChunk {
  chunk: DocumentChunk;
  score: number;
  source: "keyword" | "dense" | "hybrid";
}

interface Retriever {
  search(query: string, opts: { k: number; documentIds?: string[] }): Promise<RetrievedChunk[]>;
}
```

## ACCEPTANCE

- Given query X and a fixture that contains the expected page, that page’s chunk appears in **top 5** for keyword-capable queries (exact names, numbers).
- Zero-result query returns `[]`, not a throw.
- Retrieval tests do not import Document Studio or Unicode engine internals.
- Mixed-script query `امام Hasan al-Askari` returns the same page as the Urdu-only form on the golden fixture.

Keyword scoring is unchanged. Ask preparation may read a keyword pool of up to 20 hits, then pass at most 5 chunks to the answer step. Those 5 are chosen by deterministic matched-term coverage: a lower-ranked hit is preferred over another high-ranked hit when it adds folded query terms the selected set does not already cover. This is not semantic query understanding, and it does not parse the question. The evidence gate still decides whether the pool is strong enough.
