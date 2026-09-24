# 10 — LLM contract

**Status:** SPEC FREEZE  
**Depends on:** [08-EVIDENCE-GATE.md](08-EVIDENCE-GATE.md), [09-CITATION-VERIFICATION.md](09-CITATION-VERIFICATION.md)

## When the model runs

Only after `evaluateEvidence().allowed === true`. Pass the **question + at most 5 evidence chunks**. Those chunks are a deterministic matched-term coverage subset of the keyword pool (up to 20), not necessarily the first five by score, and not a second model call.

## Output schema (locked)

```ts
type ResearchAnswer = {
  answered: boolean;
  answer: string;
  citations: Citation[];
};

type Citation = {
  documentId: string;
  pageNumber: number;
  chunkId: string;
  quote: string;
};
```

Free-form chat is invalid. Parse as JSON (or a constrained decoder). On parse failure: one retry, then refuse.

## Prompt rules

- System instructions live only in server code. Retrieved `rawText` is wrapped as **untrusted document data**.
- Each selected chunk is one numbered evidence item, with `citationRef`, `documentId`, `pageNumber`, `chunkId`, the chunk's existing `matchedTerms`, and untrusted `rawText`.
- The question may have more than one part. The single call must cite every supplied item that supports a part, and must say when the supplied evidence does not establish a part. It must not invent missing facts.
- Instruct: use only provided chunks; if none of them support an answer, `answered: false`.
- Every factual sentence in `answer` must have a citation marker that maps to `citations[]`.
- Quotes must be copied verbatim from the chunk.

## MUST

- Default **one** LLM call per ask.
- Maximum **1–2** retries on schema/quote failure, then refuse.
- No model call on weak evidence (zero cost).
- Typed schema only.

## MUST NOT

- Stream uncited tokens to the UI as the final answer.
- Give the model the full book.
- Let the model invent `chunkId` values; the tool list / prompt must include the allowed ids.
- Use the model to normalize Urdu.

## Invalid → refuse

| Condition | Action |
| --- | --- |
| No citation | invalid |
| Invalid quote | retry then refuse |
| No evidence (should never reach here) | refuse |
| Schema miss | retry then refuse |
| Verified citations omit a selected evidence cluster | `insufficient_answer_coverage` |

After citation verification, a selected chunk refuses the answer when at least two of its folded matched terms appear in none of the verified cited chunks. One missing term does not refuse. The answer text is not scanned. There is no second model call, and missing quotes are not appended. The user-facing sentence is "The answer did not cover all supported parts of the question."

User-visible refusal copy (Urdu UI):

```text
مجھے فراہم کردہ دستاویزات میں اس سوال کا کافی مستند مواد نہیں ملا۔
```

English UI:

```text
Insufficient evidence in the provided documents.
```

Do not paraphrase extra “helpful” guesses after that sentence.

## ACCEPTANCE

- Fixture: allowed evidence + stub model returning a valid quote → `answered: true` and citations pass `verifyAnswer`.
- Stub model omits citations → final `answered: false`.
- Stub model paraphrases quote → reject.
- Gate refuse → stub model **not invoked** (spy count 0).
