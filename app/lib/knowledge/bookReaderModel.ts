import {
  bookRecordReference, cleanBookTitle, normalizeBookSearch,
  type BookRecord, type BookSource,
} from "./bookCorpus";

/** Book reading always uses source order, not a guessed printed pagination. */
export const BOOK_TOC_PAGE_SIZE = 24;
export const BOOK_READER_PARAGRAPHS = 12;
export const BOOK_FIND_PAGE_SIZE = 20;

export type BookContentsEntry = {
  id: string;
  sourceId: string;
  title: string;
  ordinal: number;
  headingStatus: "source-title" | "source-division";
  paragraphCount: number;
};
export type BookContents = {
  entries: BookContentsEntry[];
  total: number;
  page: number;
  pageSize: number;
};
export type BookReaderTranslation = {
  paragraphIds: string[];
  text: string;
  language: "ur" | "en";
  translator: string;
  source: string;
};

export type BookReadingPage = {
  recordId: string;
  sourceId: string;
  recordOrdinal: number;
  language: BookSource["language"];
  title: string;
  reference: string;
  translator: string | null;
  paragraphCount: number;
  paragraphs: BookRecord["paragraphs"];
  page: number;
  pageCount: number;
  previousRecordId: string | null;
  nextRecordId: string | null;
  recordSha256: string;
  sourceSha256: string;
  /** UI part number ONLY, not a printed book page. */
  screenPartOnly: true;
  /** Exact source-bound reviewed translations available for this reader part. */
  translations?: BookReaderTranslation[];
};
export type BookFindHit = {
  recordId: string;
  paragraphId: string;
  title: string;
  snippet: string;
};
export type BookFindResults = {
  hits: BookFindHit[];
  total: number;
  page: number;
  pageSize: number;
};

export function sourceRecordsInOrder(records: readonly BookRecord[], sourceId: string) {
  return records.filter(record => record.sourceId === sourceId);
}
function safeTitle(record: BookRecord, index: number, locale: "ur" | "en"): { text: string; status: BookContentsEntry["headingStatus"] } {
  // Al-Kafi's "القسم N" labels are parser intake divisions, NOT certified chapters.
  // Unknown headings must remain unknown until an independently reviewed edition.
  if (record.book === "kafi") {
    return { text: locale === "ur" ? `اصل متن کا حصہ ${index + 1}` : `Source division ${index + 1}`,
      status: "source-division" };
  }
  const title = cleanBookTitle(record.title || "").trim();
  return { text: title || (locale === "ur" ? `حصہ ${index + 1}` : `Section ${index + 1}`),
    status: "source-title" };
}

export function bookContents(records: readonly BookRecord[], sourceId: string, locale: "ur" | "en", page = 1): BookContents {
  const ordered = sourceRecordsInOrder(records, sourceId);
  const entries = ordered.slice((page - 1) * BOOK_TOC_PAGE_SIZE, page * BOOK_TOC_PAGE_SIZE).map((record, index) => {
    const ordinal = (page - 1) * BOOK_TOC_PAGE_SIZE + index + 1;
    const label = safeTitle(record, ordinal - 1, locale);
    return {
      id: record.id, sourceId, title: label.text, ordinal,
      headingStatus: label.status, paragraphCount: record.paragraphs.length,
    };
  });
  return { entries, total: ordered.length, page, pageSize: BOOK_TOC_PAGE_SIZE };
}

export function bookReadingPage(records: readonly BookRecord[], source: BookSource, id: string,
  locale: "ur" | "en", part = 1): BookReadingPage | null {
  const ordered = sourceRecordsInOrder(records, source.id);
  const index = ordered.findIndex(record => record.id === id);
  if (index < 0) return null;
  const record = ordered[index];
  const pageCount = Math.max(1, Math.ceil(record.paragraphs.length / BOOK_READER_PARAGRAPHS));
  if (!Number.isInteger(part) || part < 1 || part > pageCount) return null;
  return {
    recordId: record.id, sourceId: source.id, recordOrdinal: index + 1, language: record.language,
    title: safeTitle(record, index, locale).text,
    reference: bookRecordReference(record, locale),
    translator: source.translator, paragraphCount: record.paragraphs.length,
    paragraphs: record.paragraphs.slice((part - 1) * BOOK_READER_PARAGRAPHS, part * BOOK_READER_PARAGRAPHS),
    page: part, pageCount,
    previousRecordId: index > 0 ? ordered[index - 1].id : null,
    nextRecordId: index + 1 < ordered.length ? ordered[index + 1].id : null,
    recordSha256: record.textSha256, sourceSha256: source.sha256,
    screenPartOnly: true,
  };
}

export function bookFind(records: readonly BookRecord[], sourceId: string, question: string,
  locale: "ur" | "en", page = 1): BookFindResults {
  const term = normalizeBookSearch(question).slice(0, 120);
  if (!term) return { hits: [], total: 0, page, pageSize: BOOK_FIND_PAGE_SIZE };
  const hits: BookFindHit[] = [];
  const ordered = sourceRecordsInOrder(records, sourceId);
  for (const [index, record] of ordered.entries()) {
    for (const paragraph of record.paragraphs) {
      if (!normalizeBookSearch(paragraph.text).includes(term)) continue;
      hits.push({
        recordId: record.id, paragraphId: paragraph.id,
        title: safeTitle(record, index, locale).text,
        snippet: paragraph.text.slice(0, 250),
      });
    }
  }
  return {
    hits: hits.slice((page - 1) * BOOK_FIND_PAGE_SIZE, page * BOOK_FIND_PAGE_SIZE),
    total: hits.length, page, pageSize: BOOK_FIND_PAGE_SIZE,
  };
}

/** Copied text must retain all source characters and an honest unpaginated reference. */
export type BookCopyMode = "original" | "translation" | "combined";

/** Copies only source-bound text; translation attribution remains distinct from the Arabic source. */
export function copyReadingPage(page: BookReadingPage, withReference: boolean, mode: BookCopyMode = "original"): string {
  const original = page.paragraphs.map(p => p.text).join("\n\n");
  const translated = (page.translations ?? []).map(t => t.text).join("\n\n");
  const prose = mode === "translation" ? translated
    : mode === "combined" ? [original, translated].filter(Boolean).join("\n\n")
    : original;
  if (!withReference) return prose;
  const translationAttribution = mode !== "original" && (page.translations?.length ?? 0) > 0
    ? [...new Set(page.translations!.map(t => [t.translator, t.source].filter(Boolean).join(" — ")))].join("\n")
    : null;
  const originalAttribution = mode !== "translation" && page.translator ? `مترجم: ${page.translator}` : null;
  return [page.reference, originalAttribution, translationAttribution, prose].filter(Boolean).join("\n\n");
}

/**
 * Locate the first matching span in the unmodified source string.
 * Grapheme boundaries keep Arabic harakat bound to their letters. The text
 * returned here is ALWAYS a slice of the original, not normalized output.
 */
export function originalBookQuerySpan(text: string, question: string): string | null {
  const needle = normalizeBookSearch(question);
  if (!needle || needle.length > 120 || text.length > 50000) return null;
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)];
  let searchable = "";
  const origins: { start: number; end: number }[] = [];
  for (const segment of graphemes) {
    const original = segment.segment;
    const normalized = normalizeBookSearch(original);
    if (!normalized) {
      // Punctuation/whitespace separate tokens; combining marks are part of
      // their grapheme and never become artificial separators.
      if (/[\s\p{P}\p{S}]/u.test(original) && searchable && !searchable.endsWith(" ")) {
        searchable += " ";
        origins.push({ start: segment.index, end: segment.index + original.length });
      }
      continue;
    }
    const value = normalized.replace(/\s+/g, " ");
    for (const char of value) {
      searchable += char;
      origins.push({ start: segment.index, end: segment.index + original.length });
    }
  }
  const start = searchable.indexOf(needle);
  if (start < 0) return null;
  const end = start + needle.length - 1;
  return text.slice(origins[start].start, origins[end].end);
}
