import type { BookReadingPage } from "./bookReaderModel";
import { ALL_BOOK_SOURCE_IDS } from "./bookCorpus";

export const KHATEEB_READER_PROGRESS_KEY = "qalam-khateeb-book-reader-progress-v1";
export type ReaderAnchor = {
  sourceId: string; sourceSha256: string; recordId: string; recordSha256: string;
  paragraphId: string; part: number;
  /** Half-open UTF-16 code-unit position in the original source paragraph. */
  offsetUtf16?: number;
};
export type ReaderProgress = {
  version: 2;
  lastRead: ReaderAnchor | null;
  bookmarks: ReaderAnchor[];
};
export const EMPTY_READER_PROGRESS: ReaderProgress = { version: 2, lastRead: null, bookmarks: [] };
const digest = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{64}$/.test(s);
const matchesSource = (s: string): boolean => ALL_BOOK_SOURCE_IDS.includes(s as typeof ALL_BOOK_SOURCE_IDS[number]);

export function validReaderAnchor(value: unknown): value is ReaderAnchor {
  if (!value || typeof value !== "object") return false;
  const x = value as ReaderAnchor;
  return typeof x.sourceId === "string" && matchesSource(x.sourceId)
    && typeof x.recordId === "string" && x.recordId.startsWith(x.sourceId + ":") && x.recordId.length < 300
    && typeof x.paragraphId === "string" && /^:p[1-9]\d{0,5}$/.test(x.paragraphId.slice(x.recordId.length))
    && x.paragraphId.startsWith(x.recordId + ":")
    && digest(x.sourceSha256) && digest(x.recordSha256)
    && Number.isInteger(x.part) && x.part >= 1 && x.part <= 10000
    && (x.offsetUtf16 === undefined || (Number.isInteger(x.offsetUtf16) && x.offsetUtf16 >= 0 && x.offsetUtf16 <= 1_000_000));
}
/** A source revision change invalidates positions, never silently remaps them. */
export function anchorForPage(page: BookReadingPage, paragraphId?: string, offsetUtf16 = 0): ReaderAnchor {
  const first = page.paragraphs[0]?.id;
  const valid = paragraphId && page.paragraphs.some(p => p.id === paragraphId);
  return {
    sourceId: page.sourceId, sourceSha256: page.sourceSha256,
    recordId: page.recordId, recordSha256: page.recordSha256,
    paragraphId: valid ? paragraphId! : first ?? page.recordId + ":p1",
    part: 1, offsetUtf16: valid ? offsetUtf16 : 0,
  };
}
export function sameReaderAnchor(a: ReaderAnchor, b: ReaderAnchor) {
  return a.sourceId === b.sourceId && a.sourceSha256 === b.sourceSha256
    && a.recordId === b.recordId && a.recordSha256 === b.recordSha256
    && a.paragraphId === b.paragraphId && (a.offsetUtf16 ?? 0) === (b.offsetUtf16 ?? 0);
}
export function anchorMatchesPage(anchor: ReaderAnchor, page: BookReadingPage): boolean {
  if (anchor.sourceId !== page.sourceId || anchor.sourceSha256 !== page.sourceSha256
    || anchor.recordId !== page.recordId || anchor.recordSha256 !== page.recordSha256) return false;
  const paragraph = page.paragraphs.find(p => p.id === anchor.paragraphId);
  return !!paragraph && (anchor.offsetUtf16 === undefined || anchor.offsetUtf16 <= paragraph.text.length);
}

export function parseReaderProgress(raw: unknown): ReaderProgress {
  if (typeof raw !== "string" || raw.length > 32000) return { ...EMPTY_READER_PROGRESS, bookmarks: [] };
  try {
    const data = JSON.parse(raw) as Partial<ReaderProgress>;
    const version = (data as { version?: number } | null)?.version;
    if (version !== 1 && version !== 2) return { ...EMPTY_READER_PROGRESS, bookmarks: [] };
    // Version 1 stored a visual part. Paragraph identity remains valid; its old
    // page number is retained only as a harmless compatibility field.
    const lastRead = validReaderAnchor(data.lastRead) ? data.lastRead : null;
    const bookmarks: ReaderAnchor[] = [];
    if (Array.isArray(data.bookmarks)) {
      for (const value of data.bookmarks.slice(0, 60)) {
        if (validReaderAnchor(value) && !bookmarks.some(old => sameReaderAnchor(old, value)))
          bookmarks.push({ ...value, offsetUtf16: value.offsetUtf16 ?? 0 });
      }
    }
    return { version: 2, lastRead: lastRead ? { ...lastRead, offsetUtf16: lastRead.offsetUtf16 ?? 0 } : null,
      bookmarks: bookmarks.slice(0, 30) };
  } catch { return { ...EMPTY_READER_PROGRESS, bookmarks: [] }; }
}
export function rememberReaderPosition(previous: ReaderProgress, next: ReaderAnchor): ReaderProgress {
  return { ...previous, version: 2, lastRead: next };
}
export function toggleReaderBookmark(previous: ReaderProgress, next: ReaderAnchor): ReaderProgress {
  const present = previous.bookmarks.some(b => sameReaderAnchor(b, next));
  return {
    ...previous, version: 2,
    bookmarks: present ? previous.bookmarks.filter(b => !sameReaderAnchor(b, next))
      : [next, ...previous.bookmarks].slice(0, 30),
  };
}
export function readerSavedForSource(progress: ReaderProgress, sourceId: string, sha256: string): ReaderAnchor | null {
  const a = progress.lastRead;
  return a && a.sourceId === sourceId && a.sourceSha256 === sha256 ? a : null;
}
