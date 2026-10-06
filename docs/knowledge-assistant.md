# Shared Qalam Knowledge Assistant

The public foundational collection is shared by Khateeb Studio and Research Studio. User documents, private research sessions and saved sermons are separate. The existing protected document assistant remains protected.

## Delivered pilot

- `app/lib/knowledge`: corpus types, canonical citations, integrity-checked versioned storage, bounded revision cache and question retrieval.
- `POST /api/knowledge/ask`: bounded public questions, collection/language scope, up to eight source passages. Reads only the foundational corpus, plus exact Ahmedgraf Quran text.
- Shared UI in both studios: question, source selection, separate Arabic and translated/commentary passages, exact-context viewing, selection and citation-preserving copy.
- Khateeb adapter transfers chosen Quran evidence and immutable book snapshots into the existing saved/backup/print workflow. It creates a preparation draft, not a completed sermon.

Retrieval normalizes only the search index, removes question stopwords, expands a small explicit bilingual topic dictionary, scores coverage/direct matches and reranks for collection/language diversity. Exact quoted phrases and explicit section numbers bypass topic expansion. It is **not embeddings, BM25, a learned reranker or generative AI**. Long paragraphs over 8,000 characters are skipped rather than silently truncated; original context remains available through book search. Translations are independent source passages, not automatically paired with a particular Arabic paragraph.

The provider-neutral answer contract carries claims and exact evidence citations. Quote verification proves source membership only; it does not prove that a claim follows from its quotation or certify a narration's authenticity. No answer provider is enabled by this pilot. The previously disabled Qalam AI endpoint remains unchanged.

## Next substantial stages

1. Build versioned passage indexing with paragraph/section boundaries and complete long-passage retrieval. Expand multilingual evaluation questions before changing ranking.
2. Add a replaceable embedding adapter, reciprocal-rank fusion of lexical/semantic results, and a replaceable relevance reranker. Evaluate exact Arabic citations, Urdu questions and negative queries independently.
3. Enable a provider-neutral synthesis adapter with bounded original evidence, untrusted-source handling, citation/quote validation and an entailment/coverage review. Preserve source quotations, translations, generated summaries and sermon guidance as distinct output parts.
4. Add authenticated private-document adapters without adding those documents to the public corpus. Keep per-user authorization and storage boundaries explicit.
5. Fiqh ingestion must identify marja, official source, edition/date, ruling number, qualifications and authority status. Authoritative rulings are retrieved and attributed; generated extrapolations cannot be presented as a marja's fatwa. This pilot refuses marja/fatwa requests because that corpus is absent.

Existing immutable Blob object paths and saved snapshot formats stay compatible. Human citations omit filenames, import ordinals and technical locators; hashes/paragraph identifiers remain inside snapshots for verification.
