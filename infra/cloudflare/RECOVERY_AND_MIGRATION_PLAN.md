# Qalam Works: Cloudflare pilot — owner-safe recovery plan

**Status: preparation only; no production deployment, billing activation, DNS change, public license approval or data upload.**
The owner has supplied matching files. Keep production Vercel untouched until explicit separate authorization.

## Confirmed inventory
- The immutable Tafsir V10 archives are SHA-256 verified (6,236 verses per language, no broken refs). Existing separate draft work for a **private R2 Worker** must be reviewed and integrated only after the new bucket is created.
- Ten owner-provided WOFF2 files are indexed by SHA-256 in `migration-source-manifest.json`. Do not commit or expose the binaries.
- The **three OFL-marked fonts** in the public-font worker are disabled by default. Include complete copyright/OFL notices before approved public deployment.
- Muhammadi and Jameel have **no clear redistribution license** embedded; Nafees and Alvi contain restrictive terms. The owner must review rights before those are publicly delivered from the replacement host. Do not silently substitute other fonts.
- The approved Jameel digest in `app/lib/privateJameelFont.ts` matches the recovered original.
- Missing from the currently available originals are several existing Blob font names: AdobeArabic Regular/Bold, DigitalKhattIndoPakRegular (not the distinct `DigitalKhattIndoPak.woff2` checked-in edition), TraditionalArabic Regular/Bold, Al Majeed, Al Qalam Quran Majeed, Asif Quranic. Do not mislabel or replace them.

## Cloudflare R2 steps — explicit user-controlled account actions
1. Owner reviews R2 subscription terms and any requirement for payment method; **activation is not free-of-charge guaranteed**, despite $0 due now.
2. Create `qalam-tafsir-private` and `qalam-fonts-private` buckets (Standard). Keep both **private**, with no public r2.dev or custom public domain.
3. Run the offline verifier against exactly the owner-provided originals. It checks compressed checksums, WOFF2 headers, verse count and references:
   `node scripts/verify-cloudflare-recovery-assets.mjs <path-to-source-folder>`.
4. Upload Urdu/English archives as the exact filenames to the **root** of `qalam-tafsir-private`. After uploading, download and validate a fresh copy to prove integrity. Do not claim a restored live service yet.
5. Private Tafsir Worker uses only exact fixed R2 keys and a server-only bearer token. Never put book URLs, bucket credentials or token in browser code.
6. `qalam-fonts-private` may receive the staged font originals. **Do not activate public delivery** for fonts without the approved license and correct source identity.
7. On protected preview, connect authenticated Tafsir Worker server-side to app; probe `1:1`, `1:2`, `1:7`, `2:153`, `114:6` in both languages. Verify original text and Arabic/Urdu typography.
8. Only after owner approves, apply phased production routing. Verify in a new browser, not merely a cached browser.

## Full-site Cloudflare migration proof
- Current product is Next.js 16 App Router with route handlers and React 19.
- First run **vinext check** in a temporary isolated working copy; do not run `vinext init` on main, and do not invoke deploy.
- Verify Quran Arabic corpus, Urdu/English translations, Date Studio, Book Library and authentication independently.
- Important exception: `app/api/export-pdf/route.ts`, invoice and calendar PDF routes launch Chromium via `@sparticuz/chromium` + `puppeteer-core` in Node, some allowing up to 60 seconds. `app/api/khateeb/compose/route.ts` advertises 300 seconds. **These must not be moved unchanged to normal 128 MB Cloudflare Workers**. Prototype dedicated Container or Browser Run and revalidate source-codepoint and font embedding checks before migration.
- A separate PDF execution service may remain on a compatible Node host while most Qalam pages run on Workers.
- Every preview should be timeboxed and small. No automatic public deployment, DNS cutover, payment or deleting Vercel Blob.

## Stop conditions
If source license, binary checksum, Worker auth, font glyph paint, PDF corpus text, verse linkage or storage bill cannot be verified, **stop** and report evidence. Never publish a substituted Quranic/font source.
