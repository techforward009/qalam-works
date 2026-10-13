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

The harness demands the proper JSON shape, exact substring quotations, real fixture citation IDs, necessary citation coverage, and exact Arabic preservation. An unsupported question must yield a refusal without invented answer or citation. The harness caps generated tokens at 1,000 per call and makes at most six sequential requests (fewer on service unavailability). There is **no automatic retry, production switch, subscription, or billing change**.

## Evaluation gate

- All six smoke tests must pass, with no changed Arabic or invented attribution.
- Follow with at least 25 independently reviewed, owner-authorized **public** test cases and equal-condition incumbent-provider comparison covering Urdu readability, Arabic fidelity, hallucination, citation validity, response time, repeatability and per-request cost.
- A clean score from a tiny synthetic set does **not** prove real-world quality, better coding performance or correctness of any Islamic source.
- Keep authoritative source text immutable; Ahmedgraf Quran, Sheikh Mohsin Ali Najafi / Ali Quli Qara'i approved translations, citation verification and existing user privacy boundaries remain locked.

## Verified / not yet verified

- **Verified:** Meta documentation; current Qalam provider policy; fixture runner logic and its offline self-check.
- **Not yet verified:** real Muse Wonder answers, latency, billing, or comparative accuracy: no Model API key has been supplied to run a live model test.
- **Unchanged:** production environment, Vercel deployment, model routing, private book storage, tests and other pending pull requests.

**Do not merge or deploy this experiment without owner approval.**
