# 04 — Ingestion

**Status:** SPEC FREEZE  
**Depends on:** [03-DATA-MODEL.md](03-DATA-MODEL.md)

## Phase A deliverable

Turn a user file into `ResearchDocument` + `DocumentPage[]` without calling an LLM.

## Inputs — v0.1

| Format | Notes |
| --- | --- |
| PDF | Born-digital text layer only |
| DOCX | Paragraphs mapped to synthetic pages if the file has no page breaks: **document as one logical unit with paragraph indexes preserved**; do not invent fake page 1..N unless a page break is real |
| TXT | Entire file = page 1 unless form-feed (`\f`) page breaks exist |
| MD | Same as TXT; headings recorded for later chunk metadata |

## Inputs — later

PPTX, HTML, XLSX, scanned PDF, images. Not Phase A.

## Pipeline

```text
bytes
  → mime / type sniff
  → extractor
  → DocumentPage.rawText (verbatim extractor output)
  → adapter: processText(rawText, mode) → normalizedText
  → optional Quality Checker report (metadata only)
  → processingStatus = ready | failed
```

## Qalam adapter

```ts
import { processText } from "@/app/utils/processing/processText";
```

- Default `mode`: `"auto"` unless the user pinned a language.
- Never write `processText` output back onto `rawText`.
- Never import and edit `processText.ts`, `standardizeUrduText.ts`, or quality-checker engines.
- RTL/LTR: store `direction` from `processText().direction` (or script detection) on chunks in the next phase; pages keep both texts.

## Failure modes

| Case | `failureCode` |
| --- | --- |
| Zero extractable characters | `empty` |
| Unreadable / truncated PDF or DOCX | `corrupt` |
| Wrong mime (e.g. image in v0.1) | `unsupported` |
| Extractor crash | `internal` |

Corrupt and empty documents must not produce fake pages.

## PDF page preservation

A 300-page born-digital PDF must yield up to 300 pages. Blank pages are allowed as empty `rawText` **with their pageNumber kept**. Dropping page numbers (page 5 becoming page 4 because page 3 was blank) is a defect.

## MUST

- Keep extractor output byte-stable for a given library version (golden files).
- Preserve Arabic-script code points; no NFC “cleanup” outside `processText`.
- Isolate extractors so PDF code cannot import Document Studio.

## MUST NOT

- Run OCR in this phase.
- Fetch URLs as documents in v0.1 (see [13-SECURITY.md](13-SECURITY.md) if URL ingest is added later).
- Call an LLM to “fix” extraction.
- Normalize in place.

## ACCEPTANCE

- Fixture PDF with 3 pages → 3 `DocumentPage` records, `pageNumber` 1, 2, 3.
- Urdu PDF page round-trips `rawText` including Arabic punctuation.
- Mixed RTL/LTR page keeps Latin URLs intact in `rawText`.
- Empty file → `failed` / `empty`, zero pages.
- Truncated PDF → `failed` / `corrupt` (or partial pages plus `failed`, never silent success).
- DOCX with Urdu + English paragraphs extracts both scripts.
- Existing Unicode / Quality Checker unit tests still pass with **no edits** to those engines.
