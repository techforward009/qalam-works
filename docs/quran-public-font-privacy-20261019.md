# Qalam Works — public DigitalKhatt and private owner Quran
Draft only. No production authorization.

## Public text and font provenance
- Public Quran text: existing immutable `public/quran/indopak-digital-khatt.json`.
- Immediate source: [risan/quran-json](https://github.com/risan/quran-json), `data/digitalkhatt/quran.json`.
- Original upstream: [DigitalKhatt/digitalkhatt-js](https://github.com/DigitalKhatt/digitalkhatt-js), MIT license.
- Redistributing host repository: risan/quran-json, CC BY-SA 4.0 (observe attribution and share-alike where applicable).
- Font: [DigitalKhatt/indopakfont](https://github.com/DigitalKhatt/indopakfont), v1.0.0-beta.1, SIL OFL 1.1. Local `public/fonts/DigitalKhattIndoPak.woff2` and `public/fonts/DigitalKhattIndoPakRegular.woff2`. OFL notice: `public/fonts/DigitalKhattIndoPak-OFL.txt`.
- These rights are independent of the AhmedGraf source and Muhammadi license.

## Material differences
- All 114 surah verse totals are identical: 6,236.
- All 6,236 verse Unicode strings differ; waqf-mark sequences differ in 3,758 verse comparisons.
- Al-Fatiha has a changed verse segmentation: DigitalKhatt 1:1 is al-hamd; AhmedGraf 1:1 is Bismillah. The final Fatiha segment likewise differs. Existing 1:1..7 translations require a separately verified alignment and should not be blindly relabeled.
- DigitalKhatt symbols include U+0614, U+0615, U+0617, U+06D6, U+06D8, U+06D9, U+06DA, U+06DB, U+06DC, U+08D5, U+08D6, U+08D7, U+08D9, U+08DB, U+08DD, U+08DE, U+08DF. Additional composing signs U+08E2 etc. Exact glyph coverage must be checked against actual WOFF2 cmap, not inferred from CSS success.

## Owner login
- Uses OAuth with the owner's existing GitHub account, validated server-side against immutable GitHub numeric ID `124031367`, not display name or unauthenticated email.
- Owner-specific 12-hour HttpOnly, SameSite=Lax, Secure-in-production, HMAC-signed session cookie. Unauthorized `/my/quran` and `/api/my/quran/font` return 404. Private page is noindex, excluded from sitemap; robots.txt disallows private paths.
- Create a GitHub OAuth App with callback set to `https://YOUR_PREVIEW_ORIGIN/api/my/oauth/callback` for Preview and a distinct Production OAuth app later, if approved. The callback URL must match the exact deployment origin. Set secrets in Vercel Preview environment, never in GitHub source:
  - `QALAM_OWNER_GITHUB_CLIENT_ID`
  - `QALAM_OWNER_GITHUB_CLIENT_SECRET`
  - `QALAM_OWNER_GITHUB_CALLBACK_URL`
  - `QALAM_OWNER_SESSION_SECRET` (random 32+ character string)
  - `QALAM_PRIVATE_FONT_WORKER_SECRET` (random 32+ character string; same value in Cloudflare Worker secret `PRIVATE_FONT_ACCESS_SECRET`)
- IMPORTANT: Cloudflare Worker must be redeployed after review to revoke existing **public** `/fonts/muhammadi-quranic-400.woff2` endpoint. Until this separate deployment occurs, the font remains public even though the new page checks owner login. This PR alone CANNOT fulfill the requirement that the font be private globally.
- Never activate the owner-only page on Production before the upstream Worker public font URL has actually been revoked, preview OAuth and owner font checks are verified, and font licensing concerns are resolved.
