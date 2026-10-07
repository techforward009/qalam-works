import patienceBindings from "./patienceBookBindings.json";
export const BOOK_SOURCE_IDS = ["nahj-ar", "nahj-ur", "sahifa-ar", "sahifa-ur", "sahifa-en", "nahj-sermons-en", "nahj-letters-sayings-en"] as const;
export const KAFI_SOURCE_IDS = ["kafi-v1-ar", "kafi-v2-ar", "kafi-v3-ar", "kafi-v4-ar", "kafi-v5-ar", "kafi-v6-ar", "kafi-v7-ar", "kafi-v8-ar"] as const;
export const ALL_BOOK_SOURCE_IDS = [...BOOK_SOURCE_IDS, ...KAFI_SOURCE_IDS] as const;
export type KafiReference = { volume: number; bookTitle: string | null; chapterTitle: string | null; sectionTitle: string | null; sourceParagraphs: number[] };
export type BookSource = {
  id: string; book: "nahj" | "sahifa" | "kafi"; language: "ar" | "ur" | "en";
  filename: string; sha256: string; translator: string | null;
};
export type BookRecord = {
  id: string; sourceId: string; book: BookSource["book"]; language: BookSource["language"];
  kind: string; number: number | string; title: string;
  reference: { sourceId: string; section: string; number: number | string; locator: string; printPage: number | null; kafi?: KafiReference };
  paragraphs: { id: string; text: string }[]; textSha256: string;
};
export type BookManifest = { format: "qalam-foundational-corpus"; version: 1; sources: BookSource[]; recordCount: number };
export type BookExcerpt = {
  id: string; recordId: string; sourceId: string; sourceSha256: string; recordSha256: string;
  title: string; language: BookSource["language"]; filename: string; translator: string | null;
  referenceLabelUr?: string; referenceLabelEn?: string;
  suppliedTranslation?: { text: string; language: "ur" | "en"; translator: string; source?: string };
  locator: string; paragraphNumbers: number[]; paragraphs: { id: string; text: string }[];
};
export type BookSearchHit = { id: string; sourceId: string; title: string; kind: string; number: number | string | null; language: BookSource["language"]; snippet: string; referenceLabelUr?: string; referenceLabelEn?: string };
export type BookSearchResult = { hits: BookSearchHit[]; total: number; page: number; pageSize: number };
export type BookSearchOptions = { query?: string; book?: string; language?: string; sourceId?: string; kind?: string; number?: string; page?: number };

function bookName(book: BookSource["book"], locale: "ur" | "en"): string {
  return book === "nahj" ? (locale === "ur" ? "نہج البلاغہ" : "Nahj al-Balagha") : book === "kafi" ? (locale === "ur" ? "الکافی" : "Al-Kafi") : (locale === "ur" ? "صحیفہ کاملہ سجادیہ" : "Sahifa Kamilah Sajjadiyya");
}
export function kafiHadithNumber(text: string): number | null {
  const match = text.match(/^\s*([0-9۰-۹٠-٩]+)\s*[ـ–—.\-]/u);
  return match ? Number(normalizeBookSearch(match[1])) : null;
}

export function bookSourceLabel(source: Pick<BookSource, "id" | "book" | "language">, locale: "ur" | "en"): string {
  const book = bookName(source.book, locale);
  const language = locale === "ur" ? { ar: "عربی", ur: "اردو ترجمہ", en: "انگریزی ترجمہ" } : { ar: "Arabic", ur: "Urdu translation", en: "English translation" };
  const part = source.id === "nahj-sermons-en" ? (locale === "ur" ? " — خطبات" : " — sermons") : source.id === "nahj-letters-sayings-en" ? (locale === "ur" ? " — مکتوبات و حکمتیں" : " — letters and sayings") : "";
  const volume = source.book === "kafi" ? ` — ${locale === "ur" ? "جلد" : "Volume"} ${source.id.match(/^kafi-v([1-8])-ar$/)?.[1] ?? ""}` : "";
  return `${book}${volume} — ${language[source.language]}${part}`;
}
export function cleanBookTitle(title: string): string {
  return title.replace(/^\s*[0-9۰-۹٠-٩]+\s*[.．۔]\s*/u, "").trim();
}
function sayingNumber(text: string): number | null {
  const match = text.match(/^\s*[(（]\s*([0-9۰-۹٠-٩]+)\s*[)）]/u);
  return match ? Number(normalizeBookSearch(match[1])) : null;
}
export function bookRecordNumber(record: BookRecord): number | string | null {
  if (record.book === "kafi") return null;
  if (record.book === "nahj" && record.language !== "en" && ["saying", "sermon", "letter"].includes(record.kind)) {
    const internal = sayingNumber(record.paragraphs[0]?.text ?? "");
    if (internal !== null) return internal;
    if (record.kind === "saying") return null;
  }
  return record.number;
}
export function bookRecordReference(record: BookRecord, locale: "ur" | "en", paragraphId?: string): string {
  const book = bookName(record.book, locale);
  if (record.book === "kafi") {
    const ref = record.reference?.kafi;
    const volume = ref?.volume ?? Number(record.sourceId.match(/^kafi-v([1-8])-ar$/)?.[1]);
    const paragraph = record.paragraphs.find(p => p.id === paragraphId);
    const number = paragraph ? kafiHadithNumber(paragraph.text) : null;
    return [book, `${locale === "ur" ? "جلد" : "Volume"} ${volume}`, ref?.bookTitle, ref?.chapterTitle, ref?.sectionTitle, number !== null ? `${locale === "ur" ? "حدیث" : "Hadith"} ${number}` : null].filter(Boolean).join(locale === "ur" ? "، " : ", ");
  }
  const number = bookRecordNumber(record);
  const kind = record.kind === "saying" ? (locale === "ur" ? "حکمت" : "Saying") : bookKindLabel(record.kind, locale);
  return `${book}${locale === "ur" ? "،" : ","} ${kind}${number !== null && number !== 0 ? ` ${number}` : ` — ${cleanBookTitle(record.title)}`}`;
}
export function bookExcerptReference(excerpt: BookExcerpt, locale: "ur" | "en"): string {
  const binding = patienceBindings.find(b => b.recordId === excerpt.recordId && b.sourceSha256 === excerpt.sourceSha256 && b.recordSha256 === excerpt.recordSha256);
  const label = locale === "ur" ? excerpt.referenceLabelUr ?? binding?.referenceLabelUr : excerpt.referenceLabelEn ?? binding?.referenceLabelEn;
  if (label) return label.split(/؛|; file entry/)[0].trim();
  const [sourceId, kind, rawNumber] = excerpt.recordId.split(":");
  const record = { sourceId, book: sourceId.startsWith("nahj") ? "nahj" : sourceId.startsWith("kafi") ? "kafi" : "sahifa", kind, number: Number(rawNumber) || rawNumber, language: excerpt.language, title: excerpt.title, paragraphs: excerpt.paragraphNumbers[0] === 1 ? excerpt.paragraphs : [] } as BookRecord;
  return bookRecordReference(record, locale, excerpt.paragraphs.length === 1 ? excerpt.paragraphs[0].id : undefined);
}

export function normalizeBookSearch(value: string): string {
  return value.normalize("NFKC").replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/[ىی]/g, "ي").replace(/ک/g, "ك").replace(/[ۀة]/g, "ه")
    .replace(/[۰-۹٠-٩]/g, char => String(char.charCodeAt(0) - (char >= "۰" ? 0x06f0 : 0x0660)))
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
export function bookKindLabel(kind: string, locale: "ur" | "en"): string {
  const names: Record<string, [string, string]> = { chapter: ["باب", "Chapter"], section: ["حصہ", "Section"], sermon: ["خطبہ", "Sermon"], letter: ["مکتوب", "Letter"], saying: ["کلمۂ قصار", "Saying"], supplication: ["دعا", "Supplication"], "weekday-supplication": ["روزانہ کی دعا", "Weekday prayer"], right: ["حق", "Right"], "front-matter": ["مقدمہ", "Front matter"] };
  return names[kind]?.[locale === "ur" ? 0 : 1] ?? (locale === "ur" ? "اضافی مواد" : "Supplement");
}
export function searchBookRecords(records: readonly BookRecord[], options: BookSearchOptions): BookSearchResult {
  const terms = normalizeBookSearch(options.query ?? "").split(" ").filter(Boolean);
  const pageSize = 20;
  const page = Math.max(1, Math.min(1000, Math.floor(options.page ?? 1)));
  const number = options.number ? Number(normalizeBookSearch(options.number)) : null;
  const matches = records.filter(record => {
    if (options.book && record.book !== options.book || options.language && record.language !== options.language || options.sourceId && record.sourceId !== options.sourceId || options.kind && record.kind !== options.kind || number !== null && (record.book === "kafi" ? !record.paragraphs.some(p => kafiHadithNumber(p.text) === number) : bookRecordNumber(record) !== number)) return false;
    if (record.book === "kafi" && number !== null) return record.paragraphs.some(p => kafiHadithNumber(p.text) === number && terms.every(term => normalizeBookSearch(p.text).includes(term)));
    const text = normalizeBookSearch(record.title + "\n" + record.paragraphs.map(p => p.text).join("\n"));
    return terms.every(term => text.includes(term));
  });
  return { page, pageSize, total: matches.length, hits: matches.slice((page - 1) * pageSize, page * pageSize).map(record => {
    const paragraph = record.paragraphs.find(p => record.book === "kafi" && number !== null ? kafiHadithNumber(p.text) === number && terms.every(term => normalizeBookSearch(p.text).includes(term)) : terms.some(term => normalizeBookSearch(p.text).includes(term))) ?? record.paragraphs[0];
    return { id: record.id, sourceId: record.sourceId, title: record.title, kind: record.kind, number: record.book === "kafi" ? paragraph ? kafiHadithNumber(paragraph.text) : null : record.number, language: record.language, referenceLabelUr: bookRecordReference(record, "ur", paragraph?.id), referenceLabelEn: bookRecordReference(record, "en", paragraph?.id), snippet: (paragraph?.text ?? "").slice(0, 350) };
  }) };
}
export function createBookExcerpt(record: BookRecord, source: BookSource, selectedIds: readonly string[]): BookExcerpt {
  if (record.sourceId !== source.id) throw new Error("source-mismatch");
  const selected = new Set(selectedIds);
  if (!selected.size || [...selected].some(id => !record.paragraphs.some(p => p.id === id))) throw new Error("invalid-selection");
  const paragraphs = record.paragraphs.filter(p => selected.has(p.id)).map(p => ({ ...p }));
  if (paragraphs.map(p => p.text).join("\n").length > 150_000) throw new Error("excerpt-too-large");
  const paragraphNumbers = record.paragraphs.flatMap((p, i) => selected.has(p.id) ? [i + 1] : []);
  return { id: `${record.id}:${source.sha256}:${record.textSha256}:paragraphs:${paragraphNumbers.join(",")}`, recordId: record.id, sourceId: source.id, sourceSha256: source.sha256, recordSha256: record.textSha256, title: record.title, referenceLabelUr: bookRecordReference(record, "ur", paragraphs.length === 1 ? paragraphs[0].id : undefined), referenceLabelEn: bookRecordReference(record, "en", paragraphs.length === 1 ? paragraphs[0].id : undefined), language: record.language, filename: source.filename, translator: source.translator, locator: record.reference.locator, paragraphNumbers, paragraphs };
}
export function isBookExcerpt(value: unknown): value is BookExcerpt {
  if (!value || typeof value !== "object") return false;
  const x = value as BookExcerpt;
  return [x.id, x.recordId, x.sourceId, x.title, x.filename, x.locator].every(s => typeof s === "string" && s.length > 0 && s.length < 4000)
    && [x.referenceLabelUr, x.referenceLabelEn].every(s => s === undefined || typeof s === "string" && s.length > 0 && s.length < 1000)
    && ALL_BOOK_SOURCE_IDS.includes(x.sourceId as typeof ALL_BOOK_SOURCE_IDS[number]) && ["ar", "ur", "en"].includes(x.language)
    && [x.sourceSha256, x.recordSha256].every(s => typeof s === "string" && /^[a-f0-9]{64}$/.test(s))
    && (x.suppliedTranslation === undefined || x.suppliedTranslation && ["ur", "en"].includes(x.suppliedTranslation.language) && typeof x.suppliedTranslation.text === "string" && x.suppliedTranslation.text.length > 0 && x.suppliedTranslation.text.length <= 30000 && typeof x.suppliedTranslation.translator === "string" && x.suppliedTranslation.translator.length > 0 && x.suppliedTranslation.translator.length <= 200 && (x.suppliedTranslation.source === undefined || typeof x.suppliedTranslation.source === "string" && x.suppliedTranslation.source.length <= 1000))
    && (x.translator === null || typeof x.translator === "string")
    && Array.isArray(x.paragraphs) && x.paragraphs.length > 0 && x.paragraphs.length <= 2000
    && x.paragraphs.every(p => p && typeof p.id === "string" && p.id.startsWith(`${x.recordId}:p`) && typeof p.text === "string")
    && new Set(x.paragraphs.map(p => p.id)).size === x.paragraphs.length
    && x.paragraphs.map(p => p.text).join("\n").length <= 150_000
    && Array.isArray(x.paragraphNumbers) && x.paragraphNumbers.length === x.paragraphs.length
    && x.paragraphNumbers.every((n, i) => Number.isInteger(n) && n > 0 && (i === 0 || n > x.paragraphNumbers[i - 1]) && x.paragraphs[i].id === `${x.recordId}:p${n}`)
    && x.recordId.startsWith(`${x.sourceId}:`) && x.id === `${x.recordId}:${x.sourceSha256}:${x.recordSha256}:paragraphs:${x.paragraphNumbers.join(",")}`;
}
export function bookExcerptText(excerpt: BookExcerpt, locale: "ur" | "en"): string {
  return [bookExcerptReference(excerpt, locale), ...excerpt.paragraphs.flatMap((p, i) => i > 0 && excerpt.paragraphNumbers[i] > excerpt.paragraphNumbers[i - 1] + 1 ? ["[…]", p.text] : [p.text]), ...(excerpt.suppliedTranslation ? [locale === "ur" ? "فراہم کردہ ترجمہ" : "Supplied translation", excerpt.suppliedTranslation.text, `${locale === "ur" ? "مترجم" : "Translator"}: ${excerpt.suppliedTranslation.translator}`, ...(excerpt.suppliedTranslation.source ? [excerpt.suppliedTranslation.source] : [])] : []), ...(excerpt.translator ? [`${locale === "ur" ? "مترجم" : "Translator"}: ${excerpt.translator}`] : [])].join("\n");
}
