# Muse Wonder evaluation — Qalam Works

Date: 2026-10-13  
Status: **isolated experiment, no production integration**

## Confirmed information

- Meta released Muse Wonder / Muse Wonder Full on 2026-10-12.
- Muse Wonder Model API ID: `muse-wonder-1.0`; approximately 1M token context window.
- Published Standard-mode pricing: USD $4 / million input tokens and USD $20 / million output tokens.
- Muse Wonder Full is **not** available over Model API; it requires a Muse Code subscription.
- Meta states Standard-mode API content is not used for model training. Even so, this evaluation never transmits any Qalam user or book-corpus material.
- Current Qalam Knowledge Assistant already has a Cloudflare provider, evidence restrictions and separate source-review checks. These must not be bypassed or replaced by a benchmark result.

Official sources:
- https://about.fb.com/news/2026/10/introducing-muse-wonder-models/
- https://dev.meta.ai/docs/models
- https://dev.meta.ai/resources/blog/build-with-muse-wonder
- https://dev.meta.ai/docs/protocols/chat-completions

## Safe runnable evaluation

`scripts/evaluate-muse-wonder.mjs` is a standalone Node.js script, not imported by Next.js routes. It has no third-party dependencies and **never runs during a build or deployment**. The six completely synthetic fixtures test:

1. Short Urdu answer with an exact citation.
2. Two-fact answer requiring two supporting citations.
3. Refusal to invent an Imam or hadith attribution.
4. Exact Arabic reproduction, including diacritics.
5. Refusal to invent a *supplied and verified* Urdu translation.
6. Refusal to falsely attach an unsupported financial promise to a passage.

Use:

```bash
node scripts/evaluate-muse-wonder.mjs --self-test

# Only after acquiring a Meta API key and explicitly approving paid tests:
MODEL_API_KEY=... node scripts/evaluate-muse-wonder.mjs --live

# Same fixtures with lower-cost Muse Spark 1.3:
QALAM_MUSE_EVAL_MODEL=muse-spark-1.3 MODEL_API_KEY=... node scripts/evaluate-muse-wonder.mjs --live
```

Supply credentials through a secure environment/secret manager, **never** in the repo or a `NEXT_PUBLIC_*` variable. Do not commit secrets. Output includes only fixture IDs, error categories, status, elapsed time and token counts; no texts or model answers.

The harness uses Meta's strict JSON-schema output, then independently checks exact substring quotations, allowed citation IDs, necessary citation coverage, known fixture facts, and Arabic preservation. This is a structural/smoke check: even a passed response is marked as requiring human semantic review; source-supported but misleading Urdu prose can evade automatic substring validation. An unsupported question must yield a refusal without invented answer or citation. The harness caps generated tokens at 1,000 per call and makes at most six sequential requests (fewer on service unavailability). It accumulates estimated token spend from the provider's reported usage and stops once the evaluation reaches USD $0.15. If token usage is omitted, it stops; the guard is approximate and actual billing is authoritative. The final request may slightly exceed the stop threshold; there is no automatic retry. There is **no automatic retry, production switch, subscription, or billing change**.

## Automated verification

A dedicated GitHub Actions workflow runs Node.js syntax verification and six fixture-validator self-tests on the experiment pull request with **no API key**, no provider traffic, no website deployment and no production dependency changes. See `https://github.com/techforward009/qalam-works/actions/workflows/muse-evidence-probe.yml`.

## Evaluation gate

- All six smoke tests must pass, with no changed Arabic or invented attribution.
- Follow with at least 25 independently reviewed, owner-authorized **public** test cases and equal-condition incumbent-provider comparison covering Urdu readability, Arabic fidelity, hallucination, citation validity, response time, repeatability and per-request cost.
- A clean score from a tiny synthetic set does **not** prove real-world quality, better coding performance or correctness of any Islamic source.
- Keep authoritative source text immutable; Ahmedgraf Quran, Sheikh Mohsin Ali Najafi / Ali Quli Qara'i approved translations, citation verification and existing user privacy boundaries remain locked.

## Verified / not yet verified

- **Verified:** Meta documentation; current Qalam provider policy; isolated fixture code and an actual successful GitHub Actions run of the offline self-check. Local Node.js self-check also passed.
- **Not yet verified:** real Muse Wonder answers, latency, billing, semantic accuracy or comparative accuracy: no Model API key has been supplied to run a live model test. Mere validator success must never be presented as measured model accuracy.
- **Unchanged:** production environment, Vercel deployment, model routing, private book storage, tests and other pending pull requests.

**Do not merge or deploy this experiment without owner approval.**
