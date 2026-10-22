import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  bookContents, bookReadingPage, bookFind, copyReadingPage, originalBookQuerySpan, bookReaderRunningHeading, BOOK_TOC_PAGE_SIZE,
} from "../app/lib/knowledge/bookReaderModel";
import type { BookRecord, BookSource } from "../app/lib/knowledge/bookCorpus";

const src: BookSource = {
  id: "kafi-v8-ar", language: "ar", book: "kafi", filename: "private.docx",
  sha256: "a".repeat(64), translator: null,
};
const records: BookRecord[] = Array.from({length: 29}, (_, i) => {
  const id = `kafi-v8-ar:section:${i + 1}`;
  const paragraphs = Array.from({length: i === 0 ? 26 : 1}, (__, p) => ({
    id: `${id}:p${p + 1}`,
    text: p === 20 ? "صَبْرٌ ى اَلسَّلَام" : `${p + 1}- هذا نص عربي اختباري ${i + 1}`,
  }));
  return {
    id, sourceId: src.id, book: "kafi", language: "ar", kind: "section",
    number: i + 1, title: `القسم ${i + 1}`,
    reference: { sourceId: src.id, section: "section", number: i + 1,
      locator: "source paragraph", printPage: null,
      kafi: { volume: 8, bookTitle: null, chapterTitle: null, sectionTitle: null, sourceParagraphs: paragraphs.map((_, p) => p + 1) },
    },
    paragraphs,
    textSha256: createHash("sha256").update(paragraphs.map(p => p.text).join("\n")).digest("hex"),
  };
});

describe("source-faithful book reader model", () => {
  it("runs a concise source-number heading instead of a long editorial chapter title", () => {
    expect(bookReaderRunningHeading({ sourceId: "nahj-ar", kind: "sermon", reference: "نہج البلاغہ، خطبہ 2" }, "ur")).toBe("نہج البلاغہ خطبہ نمبر 2");
    expect(bookReaderRunningHeading({ sourceId: "nahj-ur", kind: "letter", reference: "نہج البلاغہ، مکتوب 31" }, "ur")).toBe("نہج البلاغہ مکتوب نمبر 31");
    expect(bookReaderRunningHeading({ sourceId: "sahifa-ar", kind: "supplication", reference: "صحیفہ کاملہ سجادیہ، دعا 3" }, "ur")).toBe("صحیفہ کاملہ سجادیہ دعا نمبر 3");
    expect(bookReaderRunningHeading({ sourceId: "kafi-v8-ar", kind: "section", reference: "الکافی، جلد 8، ایک طویل عنوان" }, "ur")).toBe("الکافی، جلد 8");
  });

  it("can omit the duplicated book name from the English page header", () => {
    expect(bookReaderRunningHeading({ sourceId: "nahj-ar", kind: "sermon", reference: "Nahj al-Balagha, Sermon 1" }, "en", false)).toBe("Sermon No. 1");
    expect(bookReaderRunningHeading({ sourceId: "nahj-ur", kind: "letter", reference: "Nahj al-Balagha, Letter 31" }, "en", false)).toBe("Letter No. 31");
  });

  it("highlights exactly the original grapheme and full Arabic diacritics", () => {
    expect(originalBookQuerySpan("وَقَالَ: صَبْرٌ جَمِيلٌ", "صبر")).toBe("صَبْرٌ");
    expect(originalBookQuerySpan("دعا: الصَّبْرُ والإيمان", "الصبر")).toBe("الصَّبْرُ");
    expect(originalBookQuerySpan("دعاء — صَبْرٌ", "صَبْرٌ")).toBe("صَبْرٌ");
    expect(originalBookQuerySpan("وَقَالَ الصَّبْرُ", "غير")).toBeNull();
    expect(originalBookQuerySpan("أَمَلٌ و عَمَلٌ", "امل")).toBe("أَمَلٌ");
  });

  it("paginates contents in immutable source order without inventing Al-Kafi chapters", () => {
    const first = bookContents(records, src.id, "ur");
    const next = bookContents(records, src.id, "ur", 2);
    expect(first.pageSize).toBe(BOOK_TOC_PAGE_SIZE);
    expect(first.total).toBe(29);
    expect(first.entries).toHaveLength(24);
    expect(next.entries).toHaveLength(5);
    expect(next.entries[0].id).toBe(records[24].id);
    expect(first.entries[0].headingStatus).toBe("source-division");
    expect(first.entries[0].title).toContain("اصل متن کا حصہ");
    expect(first.entries[0].title).not.toContain("القسم");
  });
  it("returns one complete source record for browser-measured visual pagination", () => {
    const p1 = bookReadingPage(records, src, records[0].id, "ur", 1)!;
    expect(p1.paragraphs).toEqual(records[0].paragraphs);
    expect(p1.paragraphs).toHaveLength(26);
    expect(p1.paragraphs[20].text).toBe(records[0].paragraphs[20].text);
    expect(p1.page).toBe(1);
    expect(p1.pageCount).toBe(1);
    expect(p1.nextRecordId).toBe(records[1].id);
    expect(p1.previousRecordId).toBeNull();
    expect(p1.screenPartOnly).toBe(true);
    expect(p1.reference).not.toMatch(/صفحہ/);
    expect(bookReadingPage(records, src, records[0].id, "ur", 2)).toBeNull();
  });
  it("finds vowel-insensitive text within same edition and returns a paragraph anchor", () => {
    const hits = bookFind(records, src.id, "صبر", "ur");
    expect(hits.total).toBe(1);
    expect(hits.hits[0].paragraphId).toBe(records[0].paragraphs[20].id);
    expect(hits.hits[0].offsetUtf16).toBe(0);
    expect(hits.hits[0].recordId).toBe(records[0].id);
    expect(bookFind(records, "nahj-ar", "صبر", "ur").total).toBe(0);
  });
  it("copies original diacritics unchanged, optionally adding only existing source reference", () => {
    const page = bookReadingPage(records, src, records[0].id, "ur", 1)!;
    const only = copyReadingPage(page, false);
    expect(only).toContain("صَبْرٌ ى اَلسَّلَام");
    expect(only).not.toContain(page.reference);
    const cited = copyReadingPage(page, true);
    expect(cited).toContain(page.reference);
    expect(cited).toContain("صَبْرٌ ى اَلسَّلَام");
    expect(cited).not.toContain("صفحہ");
    expect(records[0].paragraphs[20].text).toBe("صَبْرٌ ى اَلسَّلَام");
  });
});
