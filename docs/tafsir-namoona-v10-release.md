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
3. Upload both `.br` assets as **private** Vercel Blob objects in the project-linked **`qalam-research`** store (`QALAM_RESEARCH_STORE_ID`), at exactly the paths above. The v10 API uses Vercel OIDC to access this store. Do not place these v10 objects in the separate `qalam-private-fonts` store used by the legacy v9 API, and do not print or commit any token.
4. Create a new GitHub feature branch (not `main`); apply the two source-file overlays. Run the repository's existing tests, typecheck, build, and Quran/Tafsir integration tests.
5. On branch-specific **Preview** environment only: set `QALAM_TAFSIR_NAMOONA_RELEASE=v10`; maintain `QALAM_TAFSIR_NAMOONA_PUBLICATION_APPROVED=true` only with verified authorization. To preview English content also set `QALAM_TAFSIR_NAMOONA_EN_PUBLICATION_APPROVED=true` after verifying rights.
6. Verify API calls for 1:1, 2:241, 2:255, 29:67, 47:36-38, 82:15-19 and 114:6 in both languages. `47:36-38` and `82:15-19` have unavailable English-source commentary; UI must be explicit rather than claiming full coverage.
7. Confirm the UX on desktop/mobile and dark mode; Arabic text and Quran translations must remain identical to current production.
8. After code review, promote tested code to production. Activate `QALAM_TAFSIR_NAMOONA_RELEASE=v10`, confirm the Production deploy is READY, and probe the live API. Do not declare success until the public domain responds with expected v10 content.

## Rollback

Set `QALAM_TAFSIR_NAMOONA_RELEASE=v9` (or unset it) and redeploy the last passing commit; existing v9 private Blob is preserved. Keep both v10 assets private. If the new UI is problematic, roll back the full production deployment using Vercel's own prior READY deployment.

## Editorial and release constraints

This integration resolves internal cross-references and marks gaps; it is not full print collation. The Urdu source uses two fallback entries from the existing v9 archive. Eight English verse links have no full new English text and return `source_unavailable` (47:36–38 and 82:15–19). The English source is an independent editorial corpus, not a guaranteed identical English edition of the Urdu printed book.
## Verified private-store fix and Preview acceptance — 14 October 2026

- Both objects were uploaded to **qalam-research**, not the default legacy `BLOB_READ_WRITE_TOKEN` store. The source reader was corrected on `feature/tafsir-namoona-v10` to use `QALAM_RESEARCH_STORE_ID` and Vercel OIDC for v10 only. The existing v9 lookup and checksum remain unchanged.
- The two source files were independently checked against the pinned SHA-256 values above: 6,236 verse keys in each, 1,762 Urdu entries, 1,761 English entries.
- Preview deployment `dpl_63JvCHaVqGnZc5oh2TMGHPcouwHr` built READY at commit `bb783867c79abbd52ae0038fc76a4d3bb47f74ec`.
- Preview HTTP 200 and `version: 10` confirmed for Urdu and English verses 1:1, 2:241, 2:255, 29:67, 114:6. English missing-source checks 47:36 and 82:19 return `source_unavailable` without invented commentary.
- Existing production v9 API still returns HTTP 200; no release or merge has occurred in this check.
- **Release hold:** independent authorization/attribution for both Urdu and English tafsir texts is not recorded as verified, and browser screenshot acceptance remains open. Do not merge/publish until the owner explicitly confirms permissions for both texts and preview UI is accepted.

## Typography and source-fidelity audit — 15 October 2026

- English heading `Tafsir Bismillah-your-Rahman al-Rahim` is present in the private v10 `topic.title` returned by the Preview API. The route passes this field through unchanged, so the defect is in the English corpus heading, before React rendering. `displayTafsirHeading` now shows `Tafsir of Bismillah al-Rahman al-Rahim` for that exact source title while keeping the raw title in a separate DOM attribute. No commentary paragraph or corpus file was edited.
- Other English headings were reviewed against their paired Urdu source headings in the required verse samples. Clear title-only display repairs are kept in the same presentation map; uncertain titles remain unchanged for editorial review.
- Urdu spacing defects are already present in the source strings returned by the Preview API. The reader's old word segmentation preserved the string when rejoined, but could split script styling inside a line. The replacement only segments a complete standalone Arabic quotation (and a narrowly recognized trailing reference); ambiguous lines stay intact. A test asserts exact character, punctuation, newline, and whitespace preservation. No source word boundaries were guessed or repaired because an original printed-page comparison is not available in this cycle.
- Arabic quotations use the existing Digital Khatt face only when the complete phrase is covered. Browser platform-font inspection confirms `DigitalKhattIndoPakRegular` paints supported Arabic runs without another font inside the quotation. The approved font lacks U+06D2 (`ے`); those exact source runs remain unmodified, do not receive Digital Khatt, and show an explicit coverage notice.
- The existing `Gulzar-Regular.woff2` and `Alvi_Nastaleeq.woff2` assets were reused. Browser platform-font inspection reports Gulzar for Urdu topic headings and Alvi Nastaleeq for Urdu commentary paragraphs. No font file or Quran translation code/data was changed.
- Desktop light and mobile dark screenshots were captured before and after with the same controlled response fixture. The protected Preview API was checked separately for actual corpus content; screenshot fixtures are not copied into this repository because public redistribution remains release-gated.
- Focused Vitest and `tsc --noEmit` results, exact branch commit, and the Preview deployment URL are recorded in the PR acceptance comment after the branch Preview finishes.

## Scheherazade New Arabic typography trial — 15 October 2026

- A focused **Preview-only** font trial was requested by the owner. Urdu Tafsir headings (Gulzar), Urdu body (Alvi), Quran translation labels/selection and both source corpora remain unchanged. No production environment, Quran text or deployment was modified.
- The existing whitelisted public Blob face `ScheherazadeNew-Medium.woff2` is loaded as a uniquely named `Qalam Tafsir Scheherazade` font face for complete confidently classified Arabic Tafsir quotations. It reuses the catalogued asset rather than uploading or bundling another font. Directional isolation and exact quote text remain unchanged.
- Exact private v10 Urdu/English corpora were inspected without rewriting them. The existing Arabic-line classifier identifies 1,534 Urdu-corpus lines and 4,082 English-corpus lines; their **135 unique non-whitespace Unicode code points** were checked against the actual WOFF2 `cmap` of four existing fonts.
- **Scheherazade New** covers **134/135**, with the only missing character U+2024 (ONE DOT LEADER, an unusual punctuation mark in an English line). It covers the Arabic letters, tashkeel, U+06D2, tested Quranic marks and Arabic punctuation in these recognised lines. The previously trialled Digital Khatt, Adobe Arabic and Traditional Arabic miss significantly more of these code points.
- Old Digital Khatt glyph-gap notices are removed from the reading flow. Source characters and spaces are not normalized or changed. Browser-based rendered-font and dark/mobile visual approval is still required; the Unicode `cmap` check is evidence of codepoint coverage, not proof of error-free shaping.
- Keep PR #65 draft and unmerged until the owner approves Preview appearance, actual Urdu spacing/printed-source collation is handled, and separate redistribution rights for Urdu and English Tafsir are confirmed.

## English Tafsir unvowelled Arabic-script correction — 15 October 2026

- User-provided evidence: eleven Arabic quotations in the English commentary were displaying with the English font, including unvowelled Urdu/Persian forms of Arabic letters.
- Root cause: the old shared classifier required multiple vowelled words and generally a standalone Arabic line. Those authentic source strings need not carry diacritics.
- In **English Tafsir only**, `splitTafsirTypography(text, "en")` now groups consecutive Arabic-script words even without diacritics and styles each complete phrase with the existing approved Scheherazade New font. It works inside English sentences. Latin text, numeric references, unrelated scripts and punctuation remain outside the Arabic font runs where appropriate.
- The conservative Urdu mode (default or `"ur"`) remains unchanged. No source corpus, Quran translation, Quran Arabic data, translator selector or font files were modified; every character and newline is preserved.
- Automated tests include all eleven verbatim reporter samples, mixed English/Arabic lines, punctuation and Latin/digit boundaries, and Urdu behavior isolation.
- Validation for commit `87d75148d30b30b5eb9672812583ba845ee39676`: 22/22 focused Vitest passed and `npx tsc --noEmit` passed in a fresh repository checkout.
- Keep PR #65 **draft/unmerged** until the owner checks visual behavior on the actual Preview and separate publication permissions for both Tafsir sources are recorded. Font-script detection does not certify hadith/Quran quotation accuracy against printed originals.

## Urdu Al-Fatihah first-page source revision & visual pass — 15 Oct 2026

**Saved source correction (not a UI-only patch):**

- Owner's original Urdu archive in ChatGPT Library `/Tafsir_Namoona_v10_Upload_Files/urdu-v10.json.br` was replaced with the corrected private archive. The pre-edit original is backed up as `urdu-v10-backup-20261015.json.br`; exact replacement audit is saved as `first_ayah_revision_audit_20261015.json`.
- Scope: entry `1:1` only (five original topic bodies/headings; original `sourceId` 10–14 retained). 83 conservative typographical, word-spacing and bracket fixes recorded. All other 1,761 entries and the complete 6,236 verse lookup mappings are preserved. Qur'anic/Arabic quotation lines are not normalized or rewritten. Complex wording and mismatched citations requiring source comparison remain pending editorial review.
- Original compressed SHA-256: `f8f0eaef81ba175d9603434a17f17f9b0abc1197859d1f1e31e294c9b782dc5b`.
- Revised compressed SHA-256: `8cf7d265873f93d6987882b5c616a0267a7caa94304075c88d4dc57150c2f1e7`.
- **PRIVATE BLOB SYNC VERIFIED — 15 Oct 2026:** Owner uploaded `qalam/tafsir-namoona/urdu-v10-reviewed-20261015.json.br` into the existing private `qalam-research` Blob store, **without overwriting** the original `urdu-v10.json.br`. The feature branch now pins **both** the revised key and SHA-256 `8cf7d265873f93d6987882b5c616a0267a7caa94304075c88d4dc57150c2f1e7` (GitHub commit `dc7b23fd82dcb33f09c60e6d72b2a9f8fa37f599`). The deployed Preview loader's strict SHA-256 verification passed: Urdu API returns HTTP 200, `version:10`, all five first-verse topics, corrected `حضرت عیسی (علیہ السلام)` and `پروگرام کو دوام`; legacy reversed brackets and joined words absent. English 1:1 still returns v10 and unavailable English 82:19 correctly reports `source_unavailable`. V9 and original private Urdu v10 objects remain available for rollback. The book was **not** added to GitHub.

**Preview-only typography & layout:**

- Center the main Urdu Tafsir title and Al-Fatihah ayah context; display `ماخذ` and its selection on the same responsive row. Custom accessible source menu renders all names and statuses in genuine Alvi Nastaleeq rather than OS-controlled native select options. Unavailable Tafsir sources remain visibly disabled.
- Use Gulzar Nastaliq for centered Urdu headings, Alvi Nastaleeq for all Urdu controls, body, references and metadata; retain the already approved Scheherazade New for Arabic passages.
- Five-topic mini index uses in-page anchors. The first article heading displays `بسم اللہ الرحمن الرحیم` rather than repeating the global `تفسیر`; **source topic title stays unchanged**.
- The visual border is modestly narrower on Tafsir pages only; all Quran Reader editions and previously approved translator UI stay unchanged.
- Standalone, vetted Qur'anic/hadith Arabic quotations in the 1:1 topics are classified as a single Arabic font run, even when unvowelled. This is presentation-only detection; it does not edit source quotations or assert their exact canonical authenticity.

**Remaining release checks:** independent rendered-browser screenshots on actual mobile/desktop in Urdu/dark mode, reference/quotation collation with a reliable printed book, separate redistribution rights for both Tafsir corpora and explicit owner Preview acceptance. **Keep PR draft/unmerged and production untouched.**


## Verified private-source Preview deployment — 15 Oct 2026

- Deployment: `dpl_EkpxnPtvSuRpZZwUunCgt7rEX6FN` at `https://qalam-works-r8ko-oqdwqvyrl-qalam-works.vercel.app/quran/1/1` — Vercel **READY**.
- Focused Vitest on pinned reviewed source commit: **25/25 passed**, TypeScript `npx tsc --noEmit` passed.
- The source corpus remains private. Any delegation/signature query parameters are transient and must never be committed to GitHub or release documents.
- PR #65 remains **draft, open, unmerged**; **no production deployment**. Final publication still requires owner's mobile/desktop appearance approval, review of remaining source-text anomalies and separate confirmed rights to publicly redistribute both Urdu and English Tafsir commentary.
