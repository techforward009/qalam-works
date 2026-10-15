import { describe, it, expect } from "vitest";
import {
  anchorForPage, anchorMatchesPage, EMPTY_READER_PROGRESS, parseReaderProgress,
  rememberReaderPosition, readerSavedForSource, toggleReaderBookmark, validReaderAnchor,
  KHATEEB_READER_PROGRESS_KEY,
} from "../app/lib/knowledge/bookReaderProgress";
import type { BookReadingPage } from "../app/lib/knowledge/bookReaderModel";

const page = {
  recordId: "kafi-v8-ar:section:4", sourceId: "kafi-v8-ar", recordOrdinal: 4,
  language: "ar", kind: "section", title: "اصل متن کا حصہ 4", reference: "الکافی، جلد 8", translator: null,
  paragraphCount: 14, paragraphs: [{id:"kafi-v8-ar:section:4:p13", text: "نص تجريبي مُشكَّل"}],
  page: 2, pageCount: 2, previousRecordId: null, nextRecordId: null,
  sourceSha256: "a".repeat(64), recordSha256: "b".repeat(64), screenPartOnly: true,
} satisfies BookReadingPage;
describe("reader resume and bookmarks (identities only)", () => {
  it("saves no original prose, keeps full hash and paragraph anchor", () => {
    const anchor = anchorForPage(page);
    const saved = rememberReaderPosition(EMPTY_READER_PROGRESS, anchor);
    const raw = JSON.stringify(saved);
    expect(KHATEEB_READER_PROGRESS_KEY).toContain("book-reader");
    expect(raw).not.toContain(page.paragraphs[0].text);
    expect(validReaderAnchor(anchor)).toBe(true);
    expect(readerSavedForSource(saved, "kafi-v8-ar", page.sourceSha256)).toEqual(anchor);
    expect(readerSavedForSource(saved, "kafi-v8-ar", "0".repeat(64))).toBeNull();
    expect(anchorMatchesPage(anchor, page)).toBe(true);
    expect(anchorMatchesPage(anchor, {...page,recordSha256:"0".repeat(64)})).toBe(false);
    expect(anchorMatchesPage(anchor, {...page,paragraphs:[]})).toBe(false);
  });
  it("toggles duplicate-free bookmarks and limits list to 30", () => {
    let saved = toggleReaderBookmark(EMPTY_READER_PROGRESS, anchorForPage(page));
    expect(saved.bookmarks).toHaveLength(1);
    saved = toggleReaderBookmark(saved, anchorForPage(page));
    expect(saved.bookmarks).toHaveLength(0);
    for(let i=1;i<=38;i++) saved = toggleReaderBookmark(saved,
      {...anchorForPage(page), paragraphId: `kafi-v8-ar:section:4:p${i}`});
    expect(saved.bookmarks).toHaveLength(30);
    expect(parseReaderProgress(JSON.stringify(saved)).bookmarks).toHaveLength(30);
  });
  it("rejects corrupt or overly large storage and forged record identities", () => {
    expect(parseReaderProgress("{broken")).toEqual(EMPTY_READER_PROGRESS);
    expect(parseReaderProgress("x".repeat(33000))).toEqual(EMPTY_READER_PROGRESS);
    expect(parseReaderProgress(JSON.stringify({version:1,lastRead: {
      ...anchorForPage(page),sourceId:"../evil"
    },bookmarks:[]})).lastRead).toBeNull();
  });
});
