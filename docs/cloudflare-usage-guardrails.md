# Cloudflare usage guardrails — Qalam Works

## Verified architecture (2026-10-16)

- The Digital Khatt original font is served from Next.js `/fonts/DigitalKhattIndoPakRegular.woff2`, not R2.
- The separate public font Worker serves only ten exact, size-pinned WOFF2 files in a private R2 bucket.
- PR #90 adds a Cloudflare edge cache for successful GETs. Its response remains browser-cacheable for 24 hours; failed and denied requests are never cached.
- Tafsir Namoona is **not** publicly cached: its private Worker requires a bearer secret and returns `private, no-store`. Do not re-use the public font cache for authenticated Tafsir payloads.
- Tafsir requests load only requested surah shards; the server holds a bounded cache of 24 shards per process. Their SHA-256 verification must remain enabled.

## Measurement before another rollout

In Cloudflare Analytics, record daily Workers requests and errors, R2 Class A/B operations, total R2 storage, and R2 egress (if present). Compare at least one full day before and after the cache deployment, normalized for traffic. An R2 Class B decline is expected but **not yet measured**.

Keep the font gateway and private Tafsir Worker separate in analytics. Cache-hit rate is not established by the tests; verify under real traffic. Do not claim live savings until counters show them.

## Owner cost guardrails

Use operational review thresholds at **70%, 85%, and 95%** of the applicable plan limits, measured independently for Workers requests, R2 operations and storage. These are recommended thresholds, **not automated alerts**: configure alerts only after confirming the available Cloudflare account plan and notification capabilities. Avoid unnecessary live-font smoke-test loops; one deliberate test can fetch several megabytes. Do not disable protected-font validation or Tafsir checksums to reduce usage.

## Release and incident safety

Deploy only with owner approval. If R2 usage rises unexpectedly, inspect per-route Worker requests and cache-hit telemetry first; distinguish a cache miss from a repeated full-font download. Keep `Cache-Control: no-store` on errors and confidential Tafsir content. Never put credentials, private R2 URLs, or unreviewed fonts in source control.
