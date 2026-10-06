import patienceBindings from "./patienceBookBindings.json";
export const BOOK_SOURCE_IDS = ["nahj-ar", "nahj-ur", "sahifa-ar", "sahifa-ur", "sahifa-en", "nahj-sermons-en", "nahj-letters-sayings-en"] as const;
export type BookSource = {
  id: string; book: "nahj" | "sahifa"; language: "ar" | "ur" | "en";
  filename: string; sha256: string; translator: string | null;
};
export type BookRecord = {
  id: string; sourceId: string; book: BookSource["book"]; language: BookSource["language"];
  kind: string; number: number | string; title: string;
  reference: { sourceId: string; section: string; number: number | string; locator: string; printPage: number | null };
  paragraphs: { id: string; text: string }[]; textSha256: string;
};
export type BookManifest = { format: "qalam-foundational-corpus"; version: 1; sources: BookSource[]; recordCount: number };
export type BookExcerpt = {
  id: string; recordId: string; sourceId: string; sourceSha256: string; recordSha256: string;
  title: string; language: BookSource["language"]; filename: string; translator: string | null;
  referenceLabelUr?: string; referenceLabelEn?: string;
  locator: string; paragraphNumbers: number[]; paragraphs: { id: string; text: string }[];
};
export type BookSearchHit = { id: string; sourceId: string; title: string; kind: string; number: number | string; language: BookSource["language"]; snippet: string; referenceLabelUr?: string; referenceLabelEn?: string };
export type BookSearchResult = { hits: BookSearchHit[]; total: number; page: number; pageSize: number };
export type BookSearchOptions = { query?: string; book?: string; language?: string; sourceId?: string; kind?: string; number?: string; page?: number };

export function bookSourceLabel(source: Pick<BookSource, "id" | "book" | "language">, locale: "ur" | "en"): string {
  const book = source.book === "nahj" ? (locale === "ur" ? "نہج البلاغہ" : "Nahj al-Balagha") : (locale === "ur" ? "صحیفہ کاملہ سجادیہ" : "Sahifa Kamilah Sajjadiyya");
  const language = locale === "ur" ? { ar: "عربی", ur: "اردو ترجمہ", en: "انگریزی ترجمہ" } : { ar: "Arabic", ur: "Urdu translation", en: "English translation" };
  const part = source.id === "nahj-sermons-en" ? (locale === "ur" ? " — خطبات" : " — sermons") : source.id === "nahj-letters-sayings-en" ? (locale === "ur" ? " — مکتوبات و حکمتیں" : " — letters and sayings") : "";
  return `${book} — ${language[source.language]}${part}`;
}
export function cleanBookTitle(title: string): string {
  return title.replace(/^\s*[0-9۰-۹٠-٩]+\s*[.．۔]\s*/u, "").trim();
}
function sayingNumber(text: string): number | null {
  const match = text.match(/^\s*[(（]\s*([0-9۰-۹٠-٩]+)\s*[)）]/u);
  return match ? Number(normalizeBookSearch(match[1])) : null;
}
export function bookRecordNumber(record: BookRecord): number | string | null {
  if (record.book === "nahj" && record.language !== "en" && ["saying", "sermon", "letter"].includes(record.kind)) {
    const internal = sayingNumber(record.paragraphs[0]?.text ?? "");
    if (internal !== null) return internal;
    if (record.kind === "saying") return null;
  }
  return record.number;
}
export function bookRecordReference(record: BookRecord, locale: "ur" | "en"): string {
  const book = record.book === "nahj" ? (locale === "ur" ? "نہج البلاغہ" : "Nahj al-Balagha") : (locale === "ur" ? "صحیفہ کاملہ سجادیہ" : "Sahifa Kamilah Sajjadiyya");
  const number = bookRecordNumber(record);
  const kind = record.kind === "saying" ? (locale === "ur" ? "حکمت" : "Saying") : bookKindLabel(record.kind, locale);
  return `${book}${locale === "ur" ? "،" : ","} ${kind}${number !== null && number !== 0 ? ` ${number}` : ` — ${cleanBookTitle(record.title)}`}`;
}
export function bookExcerptReference(excerpt: BookExcerpt, locale: "ur" | "en"): string {
  const binding = patienceBindings.find(b => b.recordId === excerpt.recordId && b.sourceSha256 === excerpt.sourceSha256 && b.recordSha256 === excerpt.recordSha256);
  const label = locale === "ur" ? excerpt.referenceLabelUr ?? binding?.referenceLabelUr : excerpt.referenceLabelEn ?? binding?.referenceLabelEn;
  if (label) return label.split(/؛|; file entry/)[0].trim();
  const [sourceId, kind, rawNumber] = excerpt.recordId.split(":");
  const record = { sourceId, book: sourceId.startsWith("nahj") ? "nahj" : "sahifa", kind, number: Number(rawNumber) || rawNumber, language: excerpt.language, title: excerpt.title, paragraphs: excerpt.paragraphNumbers[0] === 1 ? excerpt.paragraphs : [] } as BookRecord;
  return bookRecordReference(record, locale);
}

export function normalizeBookSearch(value: string): string {
  return value.normalize("NFKC").replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/[ىی]/g, "ي").replace(/ک/g, "ك").replace(/[ۀة]/g, "ه")
    .replace(/[۰-۹٠-٩]/g, char => String(char.charCodeAt(0) - (char >= "۰" ? 0x06f0 : 0x0660)))
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
export function bookKindLabel(kind: string, locale: "ur" | "en"): string {
  const names: Record<string, [string, string]> = { sermon: ["خطبہ", "Sermon"], letter: ["مکتوب", "Letter"], saying: ["کلمۂ قصار", "Saying"], supplication: ["دعا", "Supplication"], "weekday-supplication": ["روزانہ کی دعا", "Weekday prayer"], right: ["حق", "Right"], "front-matter": ["مقدمہ", "Front matter"] };
  return names[kind]?.[locale === "ur" ? 0 : 1] ?? (locale === "ur" ? "اضافی مواد" : "Supplement");
}
export function searchBookRecords(records: readonly BookRecord[], options: BookSearchOptions): BookSearchResult {
  const terms = normalizeBookSearch(options.query ?? "").split(" ").filter(Boolean);
  const pageSize = 20;
  const page = Math.max(1, Math.min(1000, Math.floor(options.page ?? 1)));
  const number = options.number ? Number(normalizeBookSearch(options.number)) : null;
  const matches = records.filter(record => {
    if (options.book && record.book !== options.book || options.language && record.language !== options.language || options.sourceId && record.sourceId !== options.sourceId || options.kind && record.kind !== options.kind || number !== null && bookRecordNumber(record) !== number) return false;
    const text = normalizeBookSearch(record.title + "\n" + record.paragraphs.map(p => p.text).join("\n"));
    return terms.every(term => text.includes(term));
  });
  return { page, pageSize, total: matches.length, hits: matches.slice((page - 1) * pageSize, page * pageSize).map(record => {
    const paragraph = record.paragraphs.find(p => terms.some(term => normalizeBookSearch(p.text).includes(term))) ?? record.paragraphs[0];
    return { id: record.id, sourceId: record.sourceId, title: record.title, kind: record.kind, number: record.number, language: record.language, referenceLabelUr: bookRecordReference(record, "ur"), referenceLabelEn: bookRecordReference(record, "en"), snippet: (paragraph?.text ?? "").slice(0, 350) };
  }) };
}
export function createBookExcerpt(record: BookRecord, source: BookSource, selectedIds: readonly string[]): BookExcerpt {
  if (record.sourceId !== source.id) throw new Error("source-mismatch");
  const selected = new Set(selectedIds);
  if (!selected.size || [...selected].some(id => !record.paragraphs.some(p => p.id === id))) throw new Error("invalid-selection");
  const paragraphs = record.paragraphs.filter(p => selected.has(p.id)).map(p => ({ ...p }));
  if (paragraphs.map(p => p.text).join("\n").length > 150_000) throw new Error("excerpt-too-large");
  const paragraphNumbers = record.paragraphs.flatMap((p, i) => selected.has(p.id) ? [i + 1] : []);
  return { id: `${record.id}:${source.sha256}:${record.textSha256}:paragraphs:${paragraphNumbers.join(",")}`, recordId: record.id, sourceId: source.id, sourceSha256: source.sha256, recordSha256: record.textSha256, title: record.title, referenceLabelUr: bookRecordReference(record, "ur"), referenceLabelEn: bookRecordReference(record, "en"), language: record.language, filename: source.filename, translator: source.translator, locator: record.reference.locator, paragraphNumbers, paragraphs };
}
export function isBookExcerpt(value: unknown): value is BookExcerpt {
  if (!value || typeof value !== "object") return false;
  const x = value as BookExcerpt;
  return [x.id, x.recordId, x.sourceId, x.title, x.filename, x.locator].every(s => typeof s === "string" && s.length > 0 && s.length < 4000)
    && [x.referenceLabelUr, x.referenceLabelEn].every(s => s === undefined || typeof s === "string" && s.length > 0 && s.length < 1000)
    && BOOK_SOURCE_IDS.includes(x.sourceId as typeof BOOK_SOURCE_IDS[number]) && ["ar", "ur", "en"].includes(x.language)
    && [x.sourceSha256, x.recordSha256].every(s => typeof s === "string" && /^[a-f0-9]{64}$/.test(s))
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
  return [bookExcerptReference(excerpt, locale), ...excerpt.paragraphs.flatMap((p, i) => i > 0 && excerpt.paragraphNumbers[i] > excerpt.paragraphNumbers[i - 1] + 1 ? ["[…]", p.text] : [p.text]), ...(excerpt.translator ? [`${locale === "ur" ? "مترجم" : "Translator"}: ${excerpt.translator}`] : [])].join("\n");
}
