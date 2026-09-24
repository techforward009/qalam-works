# 15 — Test plan

**Status:** SPEC FREEZE  
**Depends on:** [14-EVALUATION.md](14-EVALUATION.md)

Match Qalam’s golden-fixture style (`tests/` + Vitest). Do not stand up a new framework.

## Layout (when unfrozen)

```text
tests/research/
├── fixtures/
│   ├── urdu-basic.json
│   ├── arabic-basic.json
│   ├── persian-basic.json
│   ├── mixed-rtl-ltr.json
│   ├── exact-citation.json
│   └── refusal.json
├── ingestion.test.ts
├── chunking.test.ts
├── retrieval.test.ts
├── evidenceGate.test.ts
├── citationVerifier.test.ts
└── askContract.test.ts
```

Keep `tests/researchStudio.test.ts` as the **notes-store** suite. Do not fold it into the engine suite.

## Phase A — ingestion

- PDF extraction, DOCX extraction
- page preservation
- empty document
- corrupt document
- RTL text, mixed RTL/LTR
- Arabic, Persian, Urdu

## Phase C — retrieval (Urdu-first)

- `امام حسن عسکری`
- `امام حسن العسکری`
- `حسن عسکری`
- `Imam Hasan al-Askari`
- `امام Hasan al-Askari`

English-only RAG benchmarks are secondary.

## Phase E — gate

See [08-EVIDENCE-GATE.md](08-EVIDENCE-GATE.md) table. No LLM.

## Phase G — verification

- exact quote pass/fail
- forged quote reject
- missing citation reject

## Regression

Every Research Engine PR must still run the **focused** existing suites that prove engines were not edited:

- Unicode / `processText` language-mode tests already in `tests/processText.languageModes.test.ts`
- `tests/researchStudio.test.ts`
- Do **not** require full `npm test` for a docs-only change
- Implementation PRs: focused new tests + `npx tsc --noEmit` + `npm run build` as in recent Invoice/Date freezes; broaden only on failure

## MUST

- Golden fixtures are checked in as JSON + tiny sample files.
- Tests do not need a live LLM (inject a stub).

## MUST NOT

- Snapshot entire Next page HTML as the only proof.
- Modify Unicode tests to “make RAG pass”.

## ACCEPTANCE

- `vitest run tests/researchStudio.test.ts` stays green without edits.
- New `tests/research/evidenceGate.test.ts` covers the six gate rows.
- The tiny offline benchmark is `tests/research/evaluation.test.ts` plus `tests/research/fixtures/evaluationCorpus.ts`. It does not call a model. The 100-item JSON set is still deferred.
- Citation verifier has a failing quote fixture.
