# Qalam Works — Tafsir Namoona v10 (Urdu and English)

This is a source-only overlay for the existing Next.js repository. No book text is checked into GitHub.

## Source baseline and boundaries

- Prepared against main commit `c63ac62605a22dc05c725879fc3847748c3e16d2` on 2026-10-14.
- Review the changes against the latest main before applying. Do not overwrite other people's concurrent changes.
- Scope: `app/api/quran/tafsir-namoona/route.ts` and `app/quran/QuranTafsirPage.tsx` only.
- No changes to Quran Arabic text, Quran translation sources, Khateeb Studio, or fonts.
- Alvi Nastaleeq remains the Urdu Tafsir font; Amiri for embedded Arabic text.

## Private source files (upload in Vercel Blob, NOT GitHub)

| Blob path | Compressed SHA256 |
| --- | --- |
| `qalam/tafsir-namoona/urdu-v10.json.br` | `f8f0eaef81ba175d9603434a17f17f9b0abc1197859d1f1e31e294c9b782dc5b` |
| `qalam/tafsir-namoona/english-v10.json.br` | `6e08e6952e33a452f7f644c6462cdad3d8250741ef7f1445c3ae5d37becaed59` |

Preserve existing `qalam/tafsir-namoona/urdu-v9.json.br` and the v9 production deployment for rollback.

## Order of operations

1. Obtain or confirm rights for **each** Urdu and English commentary source, including public web distribution and attribution. The old Urdu publication flag does not automatically authorize English publication.
2. Run `python tests/test_tafsir_v10_corpus.py` with the private package files in `private-corpus/`, or change the paths to the unzipped private corpus directory. Verify checksums against `manifest.json`.
3. Upload both `.br` assets as **private** Vercel Blob objects at exactly the paths above. Confirm the private store is linked and `BLOB_READ_WRITE_TOKEN` is set for the target project. Do not print or commit the token.
4. Create a new GitHub feature branch (not `main`); apply the two source-file overlays. Run the repository's existing tests, typecheck, build, and Quran/Tafsir integration tests.
5. On branch-specific **Preview** environment only: set `QALAM_TAFSIR_NAMOONA_RELEASE=v10`; maintain `QALAM_TAFSIR_NAMOONA_PUBLICATION_APPROVED=true` only with verified authorization. To preview English content also set `QALAM_TAFSIR_NAMOONA_EN_PUBLICATION_APPROVED=true` after verifying rights.
6. Verify API calls for 1:1, 2:241, 2:255, 29:67, 47:36-38, 82:15-19 and 114:6 in both languages. `47:36-38` and `82:15-19` have unavailable English-source commentary; UI must be explicit rather than claiming full coverage.
7. Confirm the UX on desktop/mobile and dark mode; Arabic text and Quran translations must remain identical to current production.
8. After code review, promote tested code to production. Activate `QALAM_TAFSIR_NAMOONA_RELEASE=v10`, confirm the Production deploy is READY, and probe the live API. Do not declare success until the public domain responds with expected v10 content.

## Rollback

Set `QALAM_TAFSIR_NAMOONA_RELEASE=v9` (or unset it) and redeploy the last passing commit; existing v9 private Blob is preserved. Keep both v10 assets private. If the new UI is problematic, roll back the full production deployment using Vercel's own prior READY deployment.

## Editorial and release constraints

This integration resolves internal cross-references and marks gaps; it is not full print collation. The Urdu source uses two fallback entries from the existing v9 archive. Eight English verse links have no full new English text and return `source_unavailable` (47:36–38 and 82:15–19). The English source is an independent editorial corpus, not a guaranteed identical English edition of the Urdu printed book.