# 09 — Citation verification

**Status:** SPEC FREEZE  
**Depends on:** [03-DATA-MODEL.md](03-DATA-MODEL.md), [10-LLM-CONTRACT.md](10-LLM-CONTRACT.md)

## Exact quote check (primary)

The model returns `quote`. The engine loads `sourceChunk.rawText` (and may also check `normalizedText` if Unicode folding is required).

```ts
function verifyCitation(args: {
  quote: string;
  sourceChunk: DocumentChunk;
}): { ok: boolean; reason?: "missing_chunk" | "quote_not_found" | "empty_quote" };
```

- **PASS** if `quote` is a contiguous substring of `rawText` after a **documented** whitespace fold (collapse `\s+` to single space on both sides). No semantic paraphrase match in v0.1.
- **FAIL** otherwise.

Failed citations invalidate the whole answer: retry once with a repair prompt, then refuse.

## Answer verification

```ts
function verifyAnswer(answer: ResearchAnswer, chunks: DocumentChunk[]): ResearchAnswer;
```

Rules:

- `answered: true` with `citations.length === 0` → invalid → refuse
- any citation `chunkId` not in the evidence set → invalid
- any quote fail → invalid
- `answered: false` must have empty citations

## Claim-level mapping (later, v0.2+)

Trustworthy-RAG idea: split the answer into claims and map each to a citation.

v0.1: **do not** use an LLM-as-judge as the authority. Deterministic quote/source check first. Claim extraction may be added later **behind** that check.

## MUST

- Verify against stored source text, not against the prompt transcript.
- Keep `verifyCitation` / `verifyAnswer` side-effect free and unit-testable.

## MUST NOT

- Accept URL-only citations.
- Accept “page 137” without a quote.
- Use fuzzy embedding similarity as quote proof.
- Let the model self-certify.

## ACCEPTANCE

- `quote` exactly in fixture chunk → `{ ok: true }`.
- One-character fabrication → `{ ok: false, reason: "quote_not_found" }`.
- Empty quote → fail.
- Forged `chunkId` → answer dropped to `answered: false`.
- Whitespace-only difference on Arabic text still passes the documented fold; inserted Latin word fails.
