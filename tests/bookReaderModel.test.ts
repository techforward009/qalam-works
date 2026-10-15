import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  bookContents, bookReadingPage, bookFind, copyReadingPage, originalBookQuerySpan, BOOK_TOC_PAGE_SIZE,
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
  it("reads complete unchanged paragraphs in 12-paragraph screen parts, not fake printed pages", () => {
    const p1 = bookReadingPage(records, src, records[0].id, "ur", 1)!;
    const p2 = bookReadingPage(records, src, records[0].id, "ur", 2)!;
    const p3 = bookReadingPage(records, src, records[0].id, "ur", 3)!;
    expect([p1.paragraphs.length, p2.paragraphs.length, p3.paragraphs.length]).toEqual([12, 12, 2]);
    expect(p2.paragraphs[8].text).toBe(records[0].paragraphs[20].text);
    expect(p1.nextRecordId).toBe(records[1].id);
    expect(p1.previousRecordId).toBeNull();
    expect(p1.screenPartOnly).toBe(true);
    expect(p1.reference).not.toMatch(/صفحہ/);
    expect(bookReadingPage(records, src, records[0].id, "ur", 4)).toBeNull();
  });
  it("finds vowel-insensitive text within same edition and returns a paragraph anchor", () => {
    const hits = bookFind(records, src.id, "صبر", "ur");
    expect(hits.total).toBe(1);
    expect(hits.hits[0].paragraphId).toBe(records[0].paragraphs[20].id);
    expect(hits.hits[0].recordId).toBe(records[0].id);
    expect(bookFind(records, "nahj-ar", "صبر", "ur").total).toBe(0);
  });
  it("copies original diacritics unchanged, optionally adding only existing source reference", () => {
    const page = bookReadingPage(records, src, records[0].id, "ur", 2)!;
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
