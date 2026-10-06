# Shared Qalam Knowledge Assistant

The foundational corpus is shared by Khateeb Studio and Research Studio. Private research documents, authentication and saved user drafts retain their existing boundaries.

## Delivered

- Shared corpus types, canonical references, integrity-checked versioned Blob storage and revision-aware source cache.
- Exact phrase/section/verse lookup plus BM25 lexical ranking with explicit multilingual topic expansion. Collection/language diversity selects at most eight relevant passages. Search normalization never changes stored quotations.
- Bounded `POST /api/knowledge/ask`: `question`, `scope`, `locale`, optional `mode` (`sources` or `research`) and `contextQuestion`. The default API mode remains source-only. The UI requests research by default. The client cannot submit evidence.
- Follow-ups retrieve the current question and prior topic independently, so a newly requested exact reference is not shadowed by the prior question.
- Ahmedgraf Quran originals, with supplied Mohsin Ali Najafi/ Ali Quli Qara'i translations where the existing curated translation provider has coverage. Missing translations are not invented.
- A replaceable synthesis provider uses the existing production Cloudflare bindings and configured GLM-4.7-Flash model. No new SDK or credential is needed. The unrelated disabled Qalam AI endpoint remains unchanged.
- The model selects only server-issued citation references; the server attaches exact original passages instead of asking the model to rewrite Arabic. Claims need valid references and original quotations. Legacy model-supplied quote substrings, if present, must match exactly. A separate model call reviews whether every factual statement follows from its cited evidence. Unknown references, altered quotations, empty citations, unsupported claims and failed reviews prevent the summary from being shown. Review is an additional machine check, not scholarly authentication of narrations.
- The UI keeps source Arabic, supplied translation/commentary and research paraphrase separate. Citation buttons open the original context and highlight the exact cited quote. A failed summary leaves source passages available.
- Citation-preserving copy, portable research JSON export and Khateeb draft transfer. Only claims whose complete citation set remains selected are copied/transferred. Summary sections are editorial; original book snapshots and Quran evidence remain separately stored through existing backup/restore/print workflows.

## Bounds and cost

Complete passages are selected within a 16,000-character evidence budget including supplied translations; text is never silently clipped for the model. Draft generation has a 27-second timeout and 1,800-token cap; support review has a 15-second timeout and 350-token cap. Invalid output is not automatically retried.

Successful answers receive a unique generation ID, creation time and provider ID. Research-file exports retain that provenance. A source-version/text/translation/question/locale/provider-bound 10-minute cache, identical-request coalescing, four in-flight generations per process and a bounded six-uncached-requests-per-minute caller window reduce repeat cost. These are process-local controls, not a distributed quota guarantee. Requests/prompt contents, credentials and raw provider errors are not logged. Provider failure logs contain only stage, failure category and HTTP status.

## Remaining stages

- Complete long-paragraph indexing (current search skips paragraphs exceeding 8,000 characters), wider multilingual evaluation, replaceable embeddings and hybrid rank fusion. Current topic expansion is not semantic embeddings or a learned reranker.
- Authenticated private-document adapters with per-user scope, durable general-research notebooks and research-file restore.
- Authoritative fiqh ingestion identifying marja, official source, edition/date, issue number, qualifications and authority status. Current marja/fatwa questions are refused; no ruling is inferred or attributed from this corpus.

Existing immutable Blob paths and saved sermon formats stay compatible. Human references omit filenames, import ordinals and technical locators; snapshots retain hashes and paragraph IDs for source verification.
