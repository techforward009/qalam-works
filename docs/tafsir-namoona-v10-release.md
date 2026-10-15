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

## 20px Arabic / bilingual topics / punctuation source audit — 15 Oct 2026

### UI Preview changes (no production)

- Owner requested the **Urdu Tafsir Arabic quotations at 20px** instead of 21px. Only `language === "ur"` uses `20px` for Scheherazade New; English keeps `1.12em`.
- Reused the Urdu five-topic `<details>`/anchor navigation for English with `Topics in this verse (N)`, real English corrected display headings, LTR layout, and the same in-page anchors. Urdu Gulzar/Alvi styling remains intact.
- Code commit with both layout changes: `262d4c0df520ec0712c32b5b56925dbcfe3dc3c8`. Tests pinned to 20px plus bilingual topic navigation.
- Vercel Preview: https://qalam-works-r8ko-9cgfzsy5k-qalam-works.vercel.app/quran/1/1 ; deployment `dpl_7bnGAFErkSY6pPzw89jaxFuTQLYL`, **READY**. Latest UI test commit `1f645c869d2024a333e1311dde30e0711be171f9`: **26/26** focused Vitest and TypeScript passed.

### Permanently reviewed book source — next version, pending private Blob upload

- A new **private user-Library** file exists under `/Tafsir_Namoona_v10_Upload_Files/urdu-v10-reviewed-20261015b.json.br`. It is a derivative of the already reviewed `urdu-v10.json.br`, which is preserved unchanged as rollback. Do NOT commit this copyrighted private book archive into GitHub.
- Corrected **28 punctuation-preceding spaces** on all five topic bodies of Al-Fatihah 1:1. All **other entries (1,761)**, verse mappings (6,236) and their source identifiers were preserved. The five topic `sourceId` values remain 10–14.
- Replaced just the quoted Arabic line of Surah Hud 11:41 with the **approved unchanged Indo-Pak Quran verse** from the repository's Ahmedgraf Quran corpus `quranSimpleSource.ts`; its source diacritics and verse marks are copied precisely. This does not modify the Quran corpus and does not alter Urdu translated commentary. The owner's sample is substantially similar; the approved official app corpus controls final diacritics and marks.
- Original reviewed `*.br` SHA256: `8cf7d265873f93d6987882b5c616a0267a7caa94304075c88d4dc57150c2f1e7`. **New revision-b `*.br` SHA256: `dcae52c68fde3cfd938866f04e9f8f8a2e73b86edda1a85cd0060800567f2591`. Revision audit saved as `urdu-v10-punctuation-audit-20261015b.json` in the same Library folder.
- Full private corpus audit flagged **7,838 other** Urdu spaces before Urdu/comma/colon/full-stop punctuation **after** correcting the 28 first-verse cases, and 38 such positions in the English corpus. These are **audit candidates**, not verified editorial changes: do not mass-rewrite other entries or alter religious quotations without source review.
- **NOT YET SYNCED TO VERCEL:** The v10 route continues to correctly pin the *previously reviewed* live private Blob `urdu-v10-reviewed-20261015.json.br` with its earlier SHA256. When the owner uploads `urdu-v10-reviewed-20261015b.json.br` **under the same relative directory in private `qalam-research`**, update the `RELEASE.ur.path` and `RELEASE.ur.digest` **together** in the feature branch and verify source hash, verse wording, first-page spacing and v10 API before owner acceptance. Never overwrite the previous private Blob or change the digest while the revised object is absent.

PR #65 stays draft and unmerged. Publication rights and owner/mobile visual acceptance are still outstanding. Do not deploy Production until expressly authorized.

## Batch 01: Ten distinct Urdu Tafsir source entries — editorial review (15 Oct 2026)

Owner-directed next step: refine the first ten **unique source commentary entries**, rather than double-count redirect verses that point at identical articles. Scope and order: `1:1` (already reviewed), `1:2`, `1:3`, `1:4`, `1:5`, `1:6`, `1:7`, `2:2` (also shown for 2:1), `2:5` (also shown for 2:3–4), `2:7` (also shown for 2:6). Exactly **40 topic records** across the ten unique source entries.

- New review on nine entries: **197 conservative edits**, comprising 108 punctuation-preceding spaces, 82 carefully selected spelling/word-spacing adjustments, 3 honorific parenthesis reversals, 3 spaces after punctuation and one duplicate comma. Examples include `جروف مقطعات → حروف مقطعات` and corrected subdivision numbering `۲۔ قرآن میں قلب ... → ۴۔ قرآن میں قلب ...`.
- The **already reviewed first entry `1:1` remains exactly identical** to the approved revision-b source (including its Ahmedgraf Indo-Pak rendering of Hud 11:41). All other **1,752 nonselected entries** and all 6,236 original verse linkage records remain exactly identical. Internal source IDs and headings/body structural boundaries preserved. Quoted Quranic/Hadith text was not speculatively revised.
- Private owner Library deliverable: `/Tafsir_Namoona_v10_Upload_Files/urdu-v10-reviewed-first10-20261015.json.br`. SHA-256: `8017cdf3dd6074a2a38943fc5bece55453dbb2c4b795b6a12d524d2347d3aabf`. Input revision-b SHA-256: `dcae52c68fde3cfd938866f04e9f8f8a2e73b86edda1a85cd0060800567f2591`.
- Detailed audit and Urdu summary are saved beside the private source: `tafsir-first10-audit-20261015.json`, `Tafsir_Namoona_First10_Review_Report_20261015.md`, and `tafsir-first10-manifest.json`.
- **NO private Blob upload yet, per owner request.** Owner will upload one file after reviewing the ten-entry batch. Do not change route pinned release path/digest until the exact new object exists in `qalam-research` and its SHA verifies. Keep previous keys for rollback. Do not commit the book to GitHub.
- Subsequent ten-entry batches should start strictly after `2:7` and build cumulatively from the latest private reviewed corpus; avoid starting each batch from an uncorrected archive.

**Editorial caveat:** This round deliberately addresses source-observable typographical issues, not unverified rewrites of narration/Qur'an or theological interpretation. Further primary-print comparison may identify more matters; report uncertain readings rather than guessing. Keep the PR draft and do not deploy production.

## Source commentary verse-group visibility and accurate heading — 15 Oct 2026

**Why:** A printed Tafsir Namoona commentary section frequently covers several Quranic verses at once. The Quran Reader's displayed page boundary is not the author's tafsir-unit boundary. A user navigating from one ayah needs to see the range of *all* linked verses before reading its original full exposition.

**Implementation (Preview only):**

- `app/quran/reader/tafsirVerseCoverage.ts` indexes the existing v10 private `verses[ayah].refs` links in a stable server-side per-corpus cache. `GET /api/quran/tafsir-namoona` now returns `coverage: [{sourceKey, verses}]` for each returned source entry; this is derived metadata rather than a new or edited commentary corpus.
- UI displays a clear, centered Urdu/English coverage header for *each source unit*, including distinct and non-contiguous source ranges when required, and a separate “selected verse” indicator. Urdu uses Gulzar and Alvi; no font or Quran/translation corpus was altered.
- Proven group boundaries from current private verse mapping: `2:1,2:2 → 2:2`; `2:3–5 → 2:5`; `2:6–7 → 2:7`; `2:8–16 → 2:16`. Some verses have two associated source units, or individual source units span discontinuous links; implementation preserves all groups rather than inventing continuous coverage.
- The reading-view-only deduplication now renders the article heading in Gulzar *once*: if its first source text line equals its title, the duplicate line is suppressed **in the reading UI only**. The currently deployed earlier private corpus had `قرآن کے جروف مقطعات کے متعلق تحقیق` in the heading while the first body line correctly said `قرآن کے حروف مقطعات کے متعلق تحقیق`. A narrowly verified fallback displays the correct first source line as its heading and omits its duplicated body line without mutating the original corpus. The newer private Library ten-entry batch already has the corrected actual source title.
- The topic-list label now says **“اس تفسیری مضمون کے موضوعات”** / **“Topics in this commentary”**, rather than falsely claiming every section specifically treats the selected individual verse. Existing 20px Urdu Arabic, the English commentary topic list, and all approved Quran translation UI remain unchanged.

**Single-ayah notes design (not shipped as fabricated source text):**

Provide two distinct reading modes once the source editorial annotations exist: **Full Original Tafsir** and **Notes for this Ayah**. For the second, create a privately reviewed structured map `{ayahKey, commentarySourceKey, topicSourceId, paragraphRange, verification}`, connecting only verified passage segments to the *selected* ayah. Both modes carry permanent links to the original full exposition. Until such source-to-paragraph links are reviewed, the UI continues to show the original full source group; it must not automatically assume a shared whole essay belongs individually to each verse, nor ask an AI to invent verse-specific notes. Add the verse-level annotations progressively during the ongoing ten-entry editorial review batches.

**Safety/acceptance:** Focused unit tests cover contiguous links, non-contiguous links, multiple source references, typed boundaries and exact-only title suppression. No private book text, publication flag, language corpus, edition or production deployment is touched. PR #65 remains draft, owner/browser visual review and both language rights approvals still required.

## Critical Quran-page Tafsir completeness fix — 15 October 2026

**User regression report:** The Quran Reader's first printed page displays all seven Al-Fatihah ayahs, but its Tafsir tab previously forwarded *only selected* `surah=1&ayah=1`. This exposed just the first 1:1 commentary, and subsequent Quran page navigation jumped to Al-Baqarah. The remaining Al-Fatihah interpretations were not missing from the private book—both Urdu and English v10 already contain individual 1:2 through 1:7 source entries.

**Repair:** The existing `QuranReader` now passes its exact authoritative `ayahsOnPage(page.page)` array to `QuranTafsirPage`. In Quran-page mode the client sends one validated `verses=1:1,1:2,...,1:7` query (max 80 distinct known ayahs) to the already approved/private v10 API. The server returns *each unique original source article* encountered on those Quran-page ayahs once, in first-occurrence order, including each full original topic, its full source-linked coverage and corresponding actual verses shown on the page. No book text is rewritten, guessed, merged or trimmed. The existing single-ayah API remains backward compatible.

**Actual Preview API verification, bilingual (200, v10):**

- Quran page 1, Al-Fatihah 1:1–7 → **7 distinct source units**, each of the 7 original entries included in Urdu and English; 19 subtopics per language (5+3+1+1+4+2+3).
- Quran page 2, Al-Baqarah 2:1–5 → **2 distinct original source units**, one for 2:1–2 and one for 2:3–5, in both Urdu and English; duplicates avoided.
- Existing individual verse 1:1 API still returns its 5 original topics as before.
- Reader heading now names **the actual full Quran-page ayah range** instead of erroneously implying the whole page is a commentary only for verse 1.
- Arabic/Urdu fonts and 20px Quran quotation styling remain unchanged; the parent Quran, translation and metadata structure remains unchanged.

**Validation:** 45/45 focused Vitest across Tafsir typography, source verse grouping, Quran Reader UI and Quran Reader metadata/data passed; `npx tsc --noEmit` passed for commit `ba23c6c7d0d5f7b3b30531f156295d7cb4efa67d`.

**Scope:** PR #65 still draft, preview only; do NOT merge or deploy production without approval. The separate cumulative first-ten-source-entry private Library revision still awaits owner upload to Vercel Blob; this page-completeness fix works already with the verified previously uploaded version.

## Arabic quotations in Urdu Tafsir: source-aware first-ten typography pass — 15 Oct 2026

**Owner observation:** After full Al-Fatihah page visibility was fixed, multiple Arabic Quran/Hadith passages in its 7 separate commentaries still painted with Alvi Nastaleeq. The old Urdu classifier had been trained mainly against five topics under 1:1 and required diacritics for other standalone lines, causing false Urdu runs.

**Implementation, Preview only:**

- `app/quran/reader/tafsirTypography.ts`: expanded a **reviewed Arabic quotation beginning list by 28** from the seven distinct Al-Fatihah entries (1:1 through 1:7) and the three further first-ten reviewed source entries (2:2, 2:5, 2:7), retaining the 25 earlier beginnings. Recognition now checks for Urdu-only letters before accepting a reviewed beginning, avoiding whole mixed Urdu lines being styled Arabic.
- Added **13 vetted exact in-paragraph Arabic phrases** (such as `لاموٴثر فی الوجود الّا اللہ`, `رب زدنی علما`, mixed Qur'anic quotation followed by Urdu explanation, and common Arabic salawat). The splitter isolates just the phrase, preserving source bytes, spacing, Urdu context and all line breaks. This avoids the unsafe proposal “treat every Urdu-script word as Arabic” in a mixed Urdu prose paragraph.
- Extended the Urdu printed-verse citation suffix detection to cover first-ten referenced Surah names such as Luqman, Saba', Maryam, Muhammad, Ta-Ha, Anbiya', Zumar and Jathiya; the actual Arabic quotation receives **Scheherazade New at 20px**, its Urdu metadata/citation remains Alvi Nastaleeq.
- Existing English commentary script splitter, the original private v10 corpora, Quran Arabic source and translator selector were **not modified**. All source topic links, the new complete-page seven-article grouping, font size and original verse coverage preserved.
- Independent test cases exercise **28 unvowelled passage examples** and 6 mixed-Arabic-and-Urdu phrases, explicit citations and ordinary Urdu negative cases; all require exact character/space round-trips.
- Validation on commit `a75e823497db486420f7010d8fb2df14c7d59ddc`: **49/49 targeted Vitest passed**, `npx tsc --noEmit` succeeded in a clean Vercel sandbox. Preview `dpl_AxUHFMzPno5GtXsCoENxYKf9tonV` READY: https://qalam-works-r8ko-nu250z27o-qalam-works.vercel.app/quran/1/1 . New Preview API retains 7 original source articles and 19 topics in **both** Urdu and English.
- **Review boundaries:** The private Urdu v10 book currently contains **1,762 distinct entries / 4,514 topics / ~60,854 nonempty source lines**. This change manually covers the 7 distinct Al-Fatihah entries and high-confidence patterns from the first-ten editorial batch; general recurring inline patterns can apply throughout the book. A heuristic full-book scan also finds approximately 1,682 line-start *candidates* and 407 lines containing the same Arabic salawat, but those candidates are **not a verified list of Arabic quotations** and must not trigger global auto-replacements. Continue per ten entries and include Arabic-run review with the existing source-edit audit.
- Real browser font-paint verification, further unreconciled excerpts outside the reviewed batch and source-faithfulness comparison remain future checks. Do **not** claim the entire 1,762-entry corpus has been visually corrected.

**Release:** PR #65 stays **draft/unmerged**; production unchanged. No new private Blob upload is required for this purely presentational correction.
