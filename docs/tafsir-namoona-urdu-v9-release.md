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

1. Publisher/rightsholder authorization to distribute the Urdu translation on the public site must be documented. **Not yet verified.**
2. Upload the exact prepared .br file into the connected **private** Vercel Blob store at the pathname above. This tool environment cannot upload directly into an existing Blob store. Do not put the text in this public GitHub repository.
3. Set `QALAM_TAFSIR_NAMOONA_PUBLICATION_APPROVED=true` **only after (1) and (2)** and once build and verse checks pass.
4. Validate representative requests: `1:1` (Unicode), `5:93` (missing), `56:75` (print_scan_only), `114:6` (Unicode). Check HTTP 503 and explicit placeholder before activation.
5. Deploy from reviewed PR only; production publish must not happen while rights, blob or tests are outstanding.

## Boundaries

The Arabic Quran corpus, Quran font, punctuation and DOCX exporter are not changed. Other tafsir titles remain unavailable until their own source is verified. The printed 56:75–82 scan was not OCR'd into invented text.
