# Khateeb Studio — Book Corpus Readiness Audit
**Date:** 2026-10-15  
**Scope:** read-only offline audit of owner-supplied `Qalam-Foundational-Corpus-With-Kafi.zip`, current `main` source schema, and three potential new-book catalog entries.  
**Status:** findings verified locally; **no corpus import, production modification, or new-book redistribution**.

## 1. Direct archive inspection — confirmed

The **owner-provided archive** was materialized privately in the analysis environment. All 15 archive source members were decompressed for **integrity checking only**, without publishing or logging the source prose.

| Indicator | Observed |
| --- | ---: |
| Archive bytes | 6,073,247 |
| Source members | 15 (7 original + 8 Arabic Kafi volumes) |
| Manifest source records | 4,978 |
| Independently counted source records | **4,978** |
| Original paragraphs | **46,847** |
| Kafi paragraphs across eight volumes | **19,129** |
| Kafi record groups (NOT hadith count) | **2,302** |
| SHA-256 record-text mismatches | **0** |
| Structurally empty records | **2** (English Sahifa addenda/weekday introductions, **not evidence of lost narration text**) |
| Records with `reference.printPage=null` | **4,978** |

**Scope warning:** a record is not necessarily one narration. Some are chapters, sections, prefaces, continuations, or textual blocks; detected printed numeric starts are not validated global/canonical hadith numbers.

### Kafi edition/reference gaps (verified in owner ZIP)

| Volume | Record groups | Paragraphs | Groups without identified book heading | Groups without chapter heading |
| --- | ---: | ---: | ---: | ---: |
| 1 | 193 | 1,776 | 1 | 6 |
| 2 | 313 | 2,689 | 313 | 1 |
| 3 | 315 | 2,598 | 315 | 1 |
| 4 | 359 | 2,563 | 359 | 1 |
| 5 | 382 | 2,646 | 382 | 1 |
| 6 | 433 | 3,977 | 1 | 19 |
| 7 | 288 | 2,138 | 288 | 1 |
| 8 | 19 | 742 | 19 | 19 |

The absence of book or chapter metadata means **unknown in this parsed edition**, not that no headings exist in any print edition. Do not invent missing labels or page numbers. All printed-page slots are empty; DOCX/EPUB corpus files may not provide stable print pagination.

### Existing source and translation boundaries

The existing code accepts only the fixed source IDs in `app/lib/knowledge/bookCorpus.ts` and validates an **exactly 7-source or 15-source** manifest in `app/lib/knowledge/store.ts`. It also bounds ZIP intake at 8 MiB and private Blob source transfers. **Adding Tuhaf / Amali / Irshad is NOT a simple upload** and should not be forced into the current schema.

Current search already uses bounded multilingual topic expansion, BM25 lexical ranking, cited source snapshots, Cloudflare passage relevance, and no-invented-translation policy. `docs/knowledge-assistant.md` describes exact bound translations to **281 Nahj sayings and four Sahifa 28 source paragraphs**, not full translated coverage of Kafi. The eight Kafi sources supplied in the inspected archive are **Arabic only**. Bibliographic metadata, permissions and edition mapping need explicit human review before claiming complete references.

**Production activation not verified:** finding an owner ZIP in ChatGPT Library and seeing accepted code does **not** prove the same exact revision is currently active in Vercel Blob.

## 2. Adjacent tafsir / translation materials — separately examined

Two **distinct, owner-provided** ZIP manifests were checked offline. They do not match the foundational book-corpus schema and were **not merged**:

- `Tafsir_Namoona_v10_Private_Corpus_2026-10-14.zip`: **v10-preproduction**, not shipped publicly; 1,762 Urdu entries (4 flagged issues) and 1,761 English entries (10 flagged issues). Redirections and direct entries are separate, and full verse coverage should not be inferred from entry counts. Keep Quranic Arabic, official translations and tafsir commentary strictly separate.
- `Safdar_Najfi_Reviewed_Corpus_Working_2026-10-14.zip`: working manifest explicitly marks **HOLD**; canonical verse count 6,236, reviewed nonempty 6,235, missing original `66:1`, 171 flagged verses, **zero printed-source-verified verses**. It is **not ready** for automatic promotion as a fully verified 6,236-verse scholarly corpus.

These are manifest facts only, not an endorsement or semantic check of their complete text. Original private bytes and copyrighted passages remain outside GitHub.

## 3. Candidate books — confirmed online reading locations; import still pending

| Priority | Book / author | Original online reading | Status |
| --- | --- | --- | --- |
| 1 | **تحف العقول** — ابن شعبة الحراني | https://ar.lib.eshia.ir/15139 | Online Arabic edition discovered. Its displayed edition explicitly says reproduction/typographical rights reserved for its publisher; reading access **does not prove permission to bulk ingest or redistribute**. |
| 1 | **الأمالي** — شیخ صدوق | https://ar.lib.eshia.ir/15033 | Arabic edition found (مؤسسة البعثة); physical/online edition metadata and reuse rights must be checked before copying. |
| 1 | **الإرشاد** — شیخ مفید | https://lib.eshia.ir/27035/1/48 | Arabic volume/page links exist. Record volume and page from the particular edition, with actual page evidence. |

Prefer `lib.eshia.ir` original text first and `al-islam.org` as a complementary context / translation reference, never as permission to mirror content. **No bulk scraping, download or GitHub upload has been performed.**

## 4. Correct priority and release gates

### A — Strengthen existing corpus BEFORE adding another book
1. Independently verify sample Kafi book/chapter headings against a **specific printed or publisher-identified edition**, preserving the original paragraph IDs, SHA-256 and raw Arabic unchanged.
2. Build a versioned **reference metadata sidecar** with fields: `source_id`, `record_id`, `paragraph_id`, `volume`, `book_title`, `chapter_title`, `printed_local_number`, `edition`, `print_page|null`, `verification_status`, `verification_evidence_url`. Unverified fields must stay null.
3. Verify exact revision active in the protected Blob/catalog through an authorized read-only route; do not assume ZIP delivery equals live activation.
4. Check owner-reviewed translation availability by **exact Arabic unit/digest**, not by a superficial same-number match. Unreviewed translation drafts must remain separately labelled.

### B — Modular ingestion design (new version; no change in this PR)
1. Preserve legacy 7/15-source imports, immutable Blob pointers and existing saved sermons.
2. Introduce versioned, book-specific source registration with edition, permission, language, volume/chapter/paragraph locators, hashes and optional separately approved translations. Do not extend a fixed union silently.
3. Enforce upload/size limits, partial import rollback, idempotent activation, private access, no public raw text or secrets.
4. Start with **one authorised sample book/volume only**, validate manuscript and printed-page evidence, then expand. Never present an unverified edition page as confirmed.

### C — Actual Khateeb evaluation
Test five real topics: `صبر`, `تربیت اولاد`, `موت و آخرت`, `عدل`, `سیرتِ امام حسن عسکریؑ`, for 20/30/45-minute preparations. Count distinct relevant sources and full citations, distinguish supplied translations from editorial explanation, require original verses, reject invented page numbers, and ensure actual section lengths differ with duration. Test against current baseline before attempting any semantic model experiment.

## Audit tooling / security

`python3 scripts/audit-khateeb-corpus.py /path/to/private.zip`

The new CLI prints **only structural aggregates, source IDs and categorical errors**. It does not print private prose or connect to any external service. Tests use **synthetic** text only; the private archive is NOT included in repository or CI.

**Do not merge this draft until review, and do not deploy or import sources without separate owner approval.**

## 5. Reference sidecar prototype — 15 October continuation

- Added `scripts/kafi-reference-sidecar.py` (Python standard library): `--queue private.json` selects at most four initial non-front-matter source groups per Kafi volume and **all eighteen non-front-matter groups of volume 8**, generating a 46-entry **pending-only, no-prose** review queue against the exact archive SHA-256.
- Every row is anchored to its source digest, record digest, source/record/paragraph identifiers, and volume. Unresolved book/chapter titles and printed pages remain explicitly null; source Arabic is never edited or serialized to the queue.
- `--check private.json` rejects stale package/source anchors, missing/duplicated passage identifiers, invented local numbers, unsupported evidence domains, unreviewed metadata assertions and conflicts with non-empty original headings. Editors must supply a specific edition and evidence URL to mark a row reviewed.
- Passing these tests certifies **structural consistency only**: a cited web page does not prove a particular print-page or title without direct human comparison. The validator deliberately does not overwrite `reference.kafi`, `printPage`, the archive or the active Blob catalog.
- Five new synthetic sidecar test cases and the earlier three audit test cases pass using GitHub Actions offline. No Model API keys, Vercel production changes, source texts or new dependencies are involved.

### Private review workflow (not committed)

```bash
python3 scripts/kafi-reference-sidecar.py "/path/to/Qalam-Foundational-Corpus-With-Kafi.zip" --queue private-kafi-reference-review.json
python3 scripts/kafi-reference-sidecar.py "/path/to/Qalam-Foundational-Corpus-With-Kafi.zip" --check private-kafi-reference-review.json
```

The owner Library has a local reviewer queue based on the exact archive: **46 rows**, 28 initial selections across volumes 1–7 and 18 in volume 8. No row is falsely pre-approved, and the machine cannot verify historical or editorial attribution by itself. A separate independently inspected edition is needed before adding actual reference data. A source-specific human comparison of the source paragraph and the cited edition is the next gate.


## 6. Rāwḍat al-Kāfī, volume VIII — first external source spot-check (15 October 2026)

**Primary edition:** [Maktabat Madrasat al-Fiqahah, volume 8, bibliographic record](https://ar.lib.eshia.ir/11027) identifies Shaykh al-Kulaynī, editor **ʿAlī Akbar al-Ghaffārī** and publisher **Dār al-Kutub al-Islāmiyyah, Tehran**. The site's catalog describes the *fourth* printing (1362 Sh), while [its volume opening](https://lib.eshia.ir/11027/8/1) mentions the *second* printing (1389 AH). Do not silently reconcile these conflicting printing statements. The page references below mean precisely **online edition ID 11027**, not all printed editions.

**Verified source opening, printed local number and web page** in the owner-provided Arabic archive against independently opened online edition pages, using normalized Arabic for the opening-chain comparison **without modifying the original Arabic**:

| Private record | Printed narration number | Edition URL | Page | Checked |
| --- | ---: | --- | ---: | --- |
| \`kafi-v8-ar:section:2\` | 1 | https://lib.eshia.ir/11027/8/2 | 2 | Opening narrator chain and numeric start |
| \`kafi-v8-ar:section:6\` | 71 | https://lib.eshia.ir/11027/8/101 | 101 | Opening narrator chain and numeric start |
| \`kafi-v8-ar:section:19\` | 589 | https://lib.eshia.ir/11027/8/392 | 392 | Opening narrator chain and numeric start |

**Crucial distinction:** the source DOCX's \`القسم الأول\` through \`القسم الثامن عشر\` are *18 intake divisions*, not established authorial chapter titles. The publisher's body begins \`كتاب الروضة\`. Do not promote division ordinals into certified book chapters. The three spot-check sidecar entries record the book title \`كتاب الروضة\`, leave \`chapter_title\` null, and attach the independently opened page and local number. **No full-isnād verification, complete narration collation, canonical hadith authenticity judgement, or blanket certification of volume 8** has been performed.

A new private **46-row** JSON sidecar is stored in the owner's Library as \`Kafi_Rawda_Vol8_Verified_Anchors_20261015.json\`: exactly **3 source openings reviewed**, **43 remain pending** (15 further volume-8 divisions, 28 samples in volumes 1–7). A local recheck against the exact ZIP confirmed archive/source/record/paragraph identities and all three local numbers/page-URL alignments; no original book bytes are changed or published.

**Additional code defense:** on the draft branch, \`scripts/kafi-reference-sidecar.py\` now refuses claiming a \`print_page\` that does not match the cited \`lib.eshia.ir/{edition}/{volume}/{page}\` URL. An unpaginated secondary webpage is insufficient for a printed page-number assertion. This checks internal **consistency**, not that a site actually contains the quoted source; a scholarly editor must perform that comparison. Synthetic tests exercise valid and rejected links, and no private source prose is committed.

**Next narrowly scoped gate:** compare more *specific local numbered starts* from the other 15 divisions to edition 11027, and identify whether online Arabic page references consistently align with the supplied DOCX. Never auto-fill unverified print pages or chapters, and do not modify production sources.

## 7. Rawda VIII extension — eight source-opening checks and a variant to resolve

The same original-owner private ZIP was compared with **eight distinct opening narration numbers** in the actual online edition `11027`. Checks were deliberately restricted to the first narrator chain, the printed local number and the cited web page. The three initial anchors above are included in these eight, not additional claims.

| Printed number | Owner source group | Original online edition page |
| ---: | --- | --- |
| 1 | `kafi-v8-ar:section:2` | https://lib.eshia.ir/11027/8/2 |
| 36 | `kafi-v8-ar:section:5` | https://lib.eshia.ir/11027/8/80 |
| 71 | `kafi-v8-ar:section:6` | https://lib.eshia.ir/11027/8/101 |
| 129 | `kafi-v8-ar:section:8` | https://lib.eshia.ir/11027/8/148 |
| 276 | `kafi-v8-ar:section:11` | https://lib.eshia.ir/11027/8/221 |
| 385 | `kafi-v8-ar:section:13` | https://lib.eshia.ir/11027/8/265 |
| 541 | `kafi-v8-ar:section:17` | https://lib.eshia.ir/11027/8/343 |
| 589 | `kafi-v8-ar:section:19` | https://lib.eshia.ir/11027/8/392 |

**Discrepancy still unresolved:** printed **no. 574** at [edition page 379](https://lib.eshia.ir/11027/8/379) has a different opening narrator separator in the supplied file versus the webpage: owner file includes `عن` between `علي بن محمد` and `علي بن العباس`, while the cited webpage apparently omits it. This difference may arise from edition, punctuation or textual handling; it has **not** been corrected or explained away, and the queue record stays **pending**. **Do not attach this page as verified until further edition comparison.** This is not an authenticity or isnād verdict.

The private, owner Library sidecar `Kafi_Rawda_Vol8_Eight_Anchors_20261015.json` records 8 narrowly reviewed openings, **38 pending**, and the one explicitly flagged discrepancy. The source identities and chapter title/pagination uncertainties remain unchanged. No source prose, private ZIP, or reviewed owner sidecar is included in GitHub. No runtime change; no live import or deployment.


## 7. Accelerated Rawda original-page review — 14/18 (15 October)

The owner-private 46-entry queue now has **14 page/start-number spot checks in volume eight** and **32 pending rows** (four volume-eight starts and 28 earlier-volume samples). All new matches were checked against the exact owner ZIP's anchored original Arabic paragraph and independently displayed original online edition **11027**; full body collation is NOT implied.

| Local number | Page in edition 11027 | Primary original URL |
| ---: | ---: | --- |
| 1 | 2 | https://lib.eshia.ir/11027/8/2 |
| 7 | 36 | https://lib.eshia.ir/11027/8/36 |
| 18 | 57 | https://lib.eshia.ir/11027/8/57 |
| 36 | 80 | https://lib.eshia.ir/11027/8/80 |
| 71 | 101 | https://lib.eshia.ir/11027/8/101 |
| 100 | 129 | https://lib.eshia.ir/11027/8/129 |
| 129 | 148 | https://lib.eshia.ir/11027/8/148 |
| 219 | 190 | https://lib.eshia.ir/11027/8/190 |
| 276 | 221 | https://lib.eshia.ir/11027/8/221 |
| 329 | 240 | https://lib.eshia.ir/11027/8/240 |
| 385 | 265 | https://lib.eshia.ir/11027/8/265 |
| 505 | 327 | https://lib.eshia.ir/11027/8/327 |
| 541 | 343 | https://lib.eshia.ir/11027/8/343 |
| 589 | 392 | https://lib.eshia.ir/11027/8/392 |

This table is public **bibliographic metadata only**, not extracted private text or permission to republish any book.

The four **not established** opening anchors are **193, 429, 464 and 574**. For 574 the owner-supplied beginning includes a conjunction **عن** between two transmitters, whereas the page 379 online edition omits it; this **variant must not be silently erased or accepted as an identical witness**. Preserve both edition witnesses and mark exact-chain collation pending: https://ar.lib.eshia.ir/11027/8/379 .

The updated owner-private `Kafi_Rawda_Vol8_Fourteen_Anchors_20261015.json` contains source/record/paragraph SHA anchors and 14 scoped page assertions, without verbatim source prose. It is saved to the user's Library, not GitHub. **No inference for missing chapter headings**, no automatic authenticity judgement or complete isnad comparison, and no production import.

### Proposed Khateeb presentation gate
A source-page annotation is **supplementary** to the original immutable source quotation/reference, never a replacement. Only show it after checking source and record SHA, paragraph ID, local printed number, and URL volume/page. When no exact verified annotation is present, keep original book citation unchanged and optionally show `صفحہ کی تصدیق زیرِ تحقیق` in owner-only research UI. Do not automatically publish or merge this experimental data.
