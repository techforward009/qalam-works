# Qalam Works storage and delivery audit — 2026-10-16

## Scope and evidence

This is a code and configuration audit of PR #90 at commit `794ed4237ed34fc5bce77fa7b88e30ae35223d3e`. It does not include access to Vercel or Cloudflare account analytics, production environment-variable values, private bucket contents, or a fresh production browser session. No usage metric below is inferred from code.

## Dependency map

| Area | Current path in this branch | Transfer/cache behavior | Evidence and limit |
|---|---|---|---|
| Shared interface fonts | `public/fonts/`; loaded by `app/layout.tsx` via `next/font/local` | Served as Next static assets. Includes Inter, Noto Nastaliq Urdu, Noto Naskh Arabic, Amiri, and Vazirmatn faces. | Asset identity is local to the repository. No Vercel Blob dependency for these files. |
| Quran reader font | `public/fonts/DigitalKhattIndoPak.woff2` (345,344 bytes in the branch tree) | Static local asset. | This is distinct from `DigitalKhattIndoPakRegular.woff2`. |
| Document Studio Digital Khatt font | `public/fonts/DigitalKhattIndoPakRegular.woff2` (97,924 bytes in the branch tree) | Static local asset; PDF path validates actual glyph use and blocks missing/wrong Digital Khatt. | Keep this identity separate from the Quran Reader font above. |
| Recovered original fonts | Private R2 bucket through `infra/cloudflare/font-mirror/index.js`; public Worker route is restricted to ten exact names and exact expected sizes. | PR #90 caches successful GET responses at the edge and browsers for 24 hours. Cache failures fall back to R2. Denied/error responses use `no-store`. | App catalog currently routes seven of the ten names to this Worker. The other three whitelist entries do not appear in the Document Studio catalog. |
| Remaining Document Studio font catalog | `app/tools/document-studio/utils/publicBlobFontCatalog.ts` | Adobe Arabic (regular/bold), Traditional Arabic (regular/bold), Faiz Lahori, and Al Majeed Quranic were removed. They are not licensed and are not requested. Two catalogued files still resolve to the public Vercel Blob host: Al Qalam Quran Majeed and Asif Quranic. Their original binaries are not in this branch's `public/fonts` inventory. | Do not copy or substitute another font without the authentic file and authorization. |
| Jameel font in PDF export | `app/lib/privateJameelFont.ts`, called by `app/tools/document-studio/utils/pdfJameelRequest.ts` and `app/api/export-pdf/route.ts` | Tries the public Cloudflare font Worker first, validates SHA-256, then falls back to Vercel Blob with `cache: no-store`. There is no process-wide font-byte cache in this loader. | A PDF request can re-download the font if local bytes are absent and the Worker path fails. The Blob fallback is a supported risk path, not proof it was used during the incident. |
| Quran Arabic corpora | Quran editions and corpus files are under `public/quran` and `app/quran`; Digital Khatt records the static corpus path in `app/quran/indopak-digital-khatt/data.ts`. | Local static assets; no Blob use shown by the reader data modules inspected. | Preserve source strings and edition identities. |
| Quran translations | `app/quran/reader/translationCorpus.ts`; 6,236 ayat split into 25 chunks of 256 (last chunk shorter), loaded on demand with browser `force-cache`. | Page requests deduplicate chunk loads in the module cache; browser caching is enabled. | No full translation archive download per verse. |
| Tafsir Namoona v10 | `app/api/quran/tafsir-namoona/route.ts`; private Vercel research Blob is the default full-archive source. An optional authenticated private Cloudflare mirror and optional per-surah shards exist. | Blob full archive is capped at 16 MiB and SHA-256 checked; the module caches a promise per language per function instance. Shard mode loads only required surahs, verifies a manifest and shard hashes, and caps each shard at 4 MiB. | Whether production has the mirror/shard environment variables set is unknown. Blob reads use `useCache: false`; cold function instances can repeat them. |
| Tafsir v9 | Same route, private Vercel Blob legacy release. | SHA-256 checked and held in a per-instance promise cache. | The active production release setting is not visible here. |
| Private Tafsir Worker | `infra/cloudflare/tafsir-mirror/src/index.ts` | Bearer authentication; private R2 binding; strict archive/shard allowlist and size bounds; `private, no-store`; no public edge cache. | Keep separate from the public font Worker. |
| Khateeb Book Library | `app/api/khateeb/library/route.ts`, `app/lib/knowledge/store.ts`, `app/lib/knowledge/sourceCache.ts` use the private `qalam-research` Blob store. | API responses are `private, no-store`; source imports are split into bounded parts (3 MiB each; 8 MiB archive cap); decoded sources are integrity checked. A per-process cache holds at most 15 book sources. | A cache miss or new function instance reads a source again. Pagination and cold starts may therefore cause repeated private Blob reads; no request logs were available to measure this. |
| Research Studio documents | `app/api/research/documents` and `app/api/research/vercelResearchBlob.ts` | Private Blob store; upload bound is 25 MiB and 400 pages; page text is returned without rewriting. | This is user-content storage, not a candidate for public caching. |
| PDF and DOCX export | `app/api/export-pdf/route.ts` and Document Studio export utilities | PDF uses server-side Chromium and verifies font use, Unicode preservation, page measurement, and embedding. DOCX is built from the document model. Font availability is the relevant storage dependency; export output is not stored in Blob by these paths. | No weakening of PDF font or glyph checks is proposed. |

## Vercel Blob incident assessment

### Confirmed

- The owner reported that the account's approximately 10 GB Blob transfer allowance was exhausted and asset access was suspended. This audit had no access to the corresponding Vercel usage graph or incident logs.
- The code still contains direct public Blob font URLs, private research-Blob reads, and a private Blob fallback for Jameel PDF font loading.
- `loadResearchBlob` requests the private Tafsir archive with `useCache: false`; its promise cache only lasts for the lifetime of a serverless process.
- Public Blob URLs are direct browser assets. Vercel's current documentation says Blob delivery is CDN cached by default, while data-transfer charges apply to public downloads and private Blob fetches by Vercel Functions. Cache misses/expiry and private server-side reads remain relevant even when a CDN exists.

### Evidence-supported contributors, not proven causes

1. Repeated use of larger public font files can add substantial downloads when the browser/CDN cache misses or expires. The catalog includes Alvi and Jameel originals that are several megabytes in the approved recovery list; current per-file download counts are unavailable.
2. Each PDF export can load a font in a new server-side browser. Jameel's Blob fallback explicitly disables HTTP caching. The Cloudflare-first path reduces the chance of this fallback but does not prove it never occurred.
3. If the Tafsir shard mirror is not configured, each new Vercel function instance can fetch the full compressed v10 archive for each language it serves. `useCache: false` makes a cache-independent read; the in-process promise only avoids repeat reads within that instance.
4. Book-library source caching is process-local and bounded. Repeated page reads after eviction or on cold instances may fetch a source again.

### Unknown

- Which route, file, browser, bot, or external referrer consumed the transfer.
- Whether the 10 GB usage was mostly fonts, Tafsir, book-library traffic, or other Blob assets.
- Production cache-hit/miss rates, unique visitors, request volume, active Blob store plan/allowances, and the exact time-series usage.
- Which Tafsir release and mirror variables were active at the incident time.
- Whether automated or unexpected external traffic contributed.

No exact incident root cause can be assigned without Vercel Blob usage analytics and request logs. Do not treat the code-level risks above as measured traffic.

## PR #90 font gateway review

- The allowlist rejects query strings, unknown paths, and non-GET/HEAD methods.
- Successful GET responses are cached under a fixed origin+path key. Cached GETs serve later GET and HEAD requests without another R2 read. Cache API failures fall back to the object read.
- The Worker pins the exact filename and expected byte length for each of ten originals and checks the returned R2 object size before caching. The Worker code does **not** calculate a SHA-256 per response. The upload record says hashes were checked against the recovery archive before upload, but those hashes are not pinned in the Worker. Treat runtime byte identity as a remaining verification gap until original hashes are supplied and enforced, or a trusted upload-time integrity control is documented with evidence.
- A cold HEAD request reads R2 metadata through `get` but does not store a cache entry. This is bounded and does not send the font body to the caller; it can still count as an R2 read.
- Existing Cloudflare Worker tests cover cache reuse and cache failure fallback. They do not establish live cache hit rate or account-level savings.

## Usage limits and controls

As of 2026-10-16, Cloudflare's official R2 documentation lists a Standard free tier of 10 GB-month storage, 1 million Class A operations and 10 million Class B operations per month, with no R2 egress charge. Above the free tier, published Standard rates are $0.015/GB-month, $4.50 per million Class A operations, and $0.36 per million Class B operations. The account's plan and actual consumption are not available in this audit. Cloudflare Workers Free currently lists 100,000 requests per day; Paid lists no general daily request limit. Confirm the account's actual plan before relying on these limits.

The existing operational thresholds of 70%, 85%, and 95% are review thresholds only. No automated alert is configured or verified. Use Cloudflare Analytics to record Workers requests/errors, R2 Class A/B operations, storage, and cache-hit evidence; use Vercel usage by Blob store and project to compare daily transfer. Do not add a polling job. Compare at least one full day before and after an approved rollout, normalized for traffic.

## Rollback and release status

- PR #90 is open and unmerged. This audit did not modify production, deploy a Worker, change DNS, alter bucket permissions, or change account/payment settings.
- If the PR is not accepted, revert its branch changes. If the Worker code has been deployed independently, restore its previous Worker version through the Cloudflare dashboard; no bucket object needs to be deleted.
- Keep the authenticated Tafsir Worker and public font Worker separate. Never expose the Tafsir bucket or store its responses in a public edge cache.
- The measured-pagination Book Reader, corpus identities, Arabic/Urdu source content, and strict PDF font validation were not changed.

## Acceptance evidence and remaining gates

At branch head `794ed4237ed34fc5bce77fa7b88e30ae35223d3e`, GitHub Actions showed the Cloudflare font recovery safety, Tafsir mirror safety, DOCX fidelity, and PDF route safety workflows as successful. The painted-font browser acceptance workflow failed at **“Verify exact baseline ancestry”**; setup, install, build, and browser inspection were skipped. This does not demonstrate a code defect in the font test, but the essential fresh-browser check remains unverified. Exact test totals were not exposed in the workflow summary, so they are not claimed here.

A production build, complete end-to-end suite, live R2 analytics comparison, new-browser visual checks across every listed studio, and actual production Worker configuration were not verified in this audit. Production release readiness is therefore conditional.

## Official usage references

- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Vercel Blob transfer and caching: https://vercel.com/docs/vercel-blob
- Vercel usage dashboard guidance: https://vercel.com/docs/pricing/manage-and-optimize-usage
