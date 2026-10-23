# Private research R2 Worker

This is a non-production scaffold. No Worker or bucket is deployed by this PR.

Create a private R2 bucket named `qalam-research-private`, bind it as `RESEARCH_BUCKET`, and set a strong encrypted `AUTH_TOKEN` Worker secret. Never commit or display that secret.

Only the authenticated server may PUT/GET `research/v1/documents/<id>.json` or list the exact prefix. The endpoint is not for browsers. The research application has an explicit `QALAM_RESEARCH_STORAGE_BACKEND=cloudflare-r2` switch. There is no default backend: when `QALAM_RESEARCH_STORAGE_BACKEND` is unset or blank, authenticated research data routes return HTTP 503 with code `research-storage-not-configured` before parsing uploads or reading sources. The server logs that fixed code once per process, without configuration values. There is no automatic Blob fallback. Test with non-sensitive synthetic records before any switch. The owner explicitly does not want old data migrated.

Next: provision the private R2 bucket and Worker; configure `QALAM_RESEARCH_R2_WORKER_URL` and `QALAM_RESEARCH_R2_BEARER_TOKEN` as server-only secrets; verify the Worker with synthetic records and focused tests; only then request owner approval for activation. Never activate on production automatically.

IMPORTANT: The research selector governs only private research document persistence; it does not configure Khateeb book storage. Sermon evidence keeps this PR's `loadKnowledgeBooks` R2 path and skips `attachBookTranslations` for R2. The Blob-only reviewed sidecars (`khateeb-translations/v1/`) are gone. R2 Urdu sermons have book translations only for Nahj al-Balagha and Sahifa through repo bindings; English sermons have Quran-only evidence until a separate English-bindings PR. No Blob fallback is introduced. This Worker permits only research document paths and performs no migration or production activation.

## Server configuration reference (documentation only)

No environment-example file exists in this repository. Research needs the explicit
`QALAM_RESEARCH_STORAGE_BACKEND=cloudflare-r2` selection plus the server-only
`QALAM_RESEARCH_R2_WORKER_URL` and `QALAM_RESEARCH_R2_BEARER_TOKEN`. These are
configuration requirements, not an instruction to activate or change settings.
An unset backend intentionally disables research data routes even if owner
authentication is configured. The authentication/session endpoints remain usable;
anonymous data requests are still rejected before the storage configuration check.

Object responses use `Cache-Control: private, no-store, no-transform`. The reader
accepts decompressed responses without comparing decoded size to compressed
Content-Length, while always enforcing a 25 MiB decoded-body limit. Tafsir mirrors
require a positive integer Content-Length; missing, zero or invalid values raise
`tafsir-mirror-invalid-content-length`.
