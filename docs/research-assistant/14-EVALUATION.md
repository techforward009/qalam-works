# 14 — Evaluation

**Status:** SPEC FREEZE. Tiny offline subset implemented 2026-09-24. The 100-item set is still deferred.
**Depends on:** [08-EVIDENCE-GATE.md](08-EVIDENCE-GATE.md), [09-CITATION-VERIFICATION.md](09-CITATION-VERIFICATION.md)

“It looks good” is not done. A fixture dataset is part of Definition of Done.

## Starter set (target)

100 questions:

- 25 Urdu
- 20 Arabic
- 15 Persian
- 20 mixed RTL/LTR
- 20 exact-reference (`Hadith 289`, page-like numbers)

And:

- 50 answerable
- 50 unanswerable

## Item shape

Answerable:

```json
{
  "question": "امام حسن عسکریؑ کی علمی شخصیت کے اہم پہلو کیا تھے؟",
  "expected_sources": ["imam-and-the-imams.pdf"],
  "expected_pages": [137, 138],
  "answerable": true
}
```

Unanswerable:

```json
{
  "question": "What did Imam X say in 1920?",
  "answerable": false
}
```

Use public-domain or project-owned fixtures. Do not commit copyrighted books.

## Metrics

**Retrieval:** Recall@5, Recall@10, MRR  

**Grounding:** citation validity rate, quote exactness, unsupported-claim rate  

**Refusal:** unanswerable refusal rate, false-answer rate (answered when `answerable: false`)  

**Engineering:** latency, estimated cost, error rate  

## MUST

- Track false answers on unanswerable items as a **release blocker** if rate > 0 on the golden 50.
- Re-run the set after any chunker or retriever change.

## MUST NOT

- Grade with an LLM-as-judge as the only metric.
- Optimize only English questions.

## ACCEPTANCE

- CI runs a **tiny** golden subset (≤ 10 items) without network if models are stubbed.
- Full 100-item run is a documented script, not a hidden notebook.
- Unanswerable items expect `answered: false`.

## v0.1 tiny harness

`tests/research/evaluation.test.ts` runs ten checked-in cases from `tests/research/fixtures/evaluationCorpus.ts`. No network, no Workers AI, no API key. The default deterministic answer path is used. There is no single quality score.

| Case | Measured result |
| --- | --- |
| direct-factual | Folded `العسکری` retrieves both Askar chunks. Gate: sufficient. Quotes match `rawText`. |
| multi-document | `سامرا` retrieves Askar and Samarra. Gate: sufficient. |
| no-evidence | Unknown token. Gate: `no_evidence`. Refused. |
| weak-retrieval | One lexical chunk. Gate: `weak_retrieval`. Refused. |
| conflicting-numbers | `868` and `874`. Gate: `conflicting_evidence`. Refused. |
| invalid-citation | Invented quote fails verification. |
| scoped-retrieval | `سامرا` limited to Samarra does not return Askar. |
| exact-reference | `Hadith 289` is enough as one chunk. Gate: sufficient. |
| mixed-script-fold | `كراچى qalamworks` matches stored `کراچی qalamworks`. |
| paraphrase-gap | `علمی مقام` retrieves the chunk that only shares `علمی`. Gate: `weak_retrieval`. Refused. |

Measured limitation: a shared content word is enough to retrieve a chunk, and not enough to answer. Citation fold is not applied; `ك` matching `ک` is retrieval-only. This set does not justify an embedding or hybrid retrieval change. False answers on the refused cases: 0.
