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
