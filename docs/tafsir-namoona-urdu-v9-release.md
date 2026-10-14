# Tafsir Namoona Urdu v9 — release gate

This PR integrates the Qalam Works Quran Reader with an Urdu Tafsir Namoona source through a **private Vercel Blob**, never by checking the book into GitHub.

## Assets and mapping

- Local final deliverable: `Tafseer_Namoona_Urdu_v9_for_Vercel_Blob.br` (Brotli-compressed v9 JSON, 6,619,362 bytes, SHA256 `4645a268a658b61d691fef009c2958f8948414a7529b66cc2d23eee9317e8454`).
- Target Blob pathname: `qalam/tafsir-namoona/urdu-v9.json.br`.
- Store type: **private**, connected to Qalam Works via `BLOB_READ_WRITE_TOKEN`.
- For each entry the source identifies a shared commentary record rather than splitting multi-verse commentary.
- 6,236 verse keys total; 6,227 Unicode rows; 8 print-scan references without verified Unicode; 1 missing Urdu source.
- Requests: `GET /api/quran/tafsir-namoona?surah=56&ayah=75`.

## Release requirements

1. The project owner has stated that the publisher authorized public use verbally. This is a user-reported permission, not a written license. Confirm the scope and attribution for long-term distribution.
2. Upload the exact prepared .br file into the connected **private** Vercel Blob store at the pathname above. This tool environment cannot upload directly into an existing Blob store. Do not put the text in this public GitHub repository.
3. Set `QALAM_TAFSIR_NAMOONA_PUBLICATION_APPROVED=true` **only after the private Blob upload is verified**, the project owner confirms publication scope, and build and verse checks pass.
4. Validate representative requests: `1:1` (Unicode), `5:93` (missing), `56:75` (print_scan_only), `114:6` (Unicode). Check HTTP 503 and explicit placeholder before activation.
5. UI-only production release may proceed with the publication flag disabled; do not claim commentary text is live until the Blob is verified and the flag enabled.

## Boundaries

The Arabic Quran corpus, Quran font, punctuation and DOCX exporter are not changed. Other tafsir titles remain unavailable until their own source is verified. The printed 56:75–82 scan was not OCR'd into invented text.

## Release update (2026-10-13)

The one-time authenticated import route was removed before merge after its upload attempt was blocked. The Blob has **not** been uploaded. The final app can ship with the feature flag off; content availability must not be claimed. The compressed v9 corpus is preserved in the project owner's ChatGPT Library, not committed to GitHub.

## Preview restoration update (2026-10-14)

- The local v9 asset is present in the project owner's ChatGPT Library. Integrity rechecked on 2026-10-14: 6,619,362 compressed bytes, SHA256 `4645a268a658b61d691fef009c2958f8948414a7529b66cc2d23eee9317e8454`, corpus version 9, 6,236 verse mapping rows.
- The **private Vercel Blob has since become accessible**, superseding the 2026-10-13 upload blocker above. The existing protected preview deployment on branch `trial/tafsir-alvi-nastaleeq-20261014` returned HTTP 200 and `status: "unicode_apk"` with genuine commentary for `surah=1&ayah=1`; the API checks the exact blob SHA256 before serving its corpus.
- `QALAM_TAFSIR_NAMOONA_PUBLICATION_APPROVED=true` was confirmed already on the dedicated Alvi preview and on production. For PR #57 only, a **branch-scoped preview** variable of the same key was added after verification to restore text in that preview. This changes neither the production flag nor production deployments.
- The outdated publisher-permission placeholder was removed from the UI, but the API's explicit approval flag, private storage, hash validation, and unavailable-source fallbacks remain intact. The known print-collation caveat still appears below returned commentary.
- A successful `1:1` runtime probe does not assert that all 6,236 verse links have been exhaustively inspected against print. The 2026-10-13 review notes remain as historical status.

