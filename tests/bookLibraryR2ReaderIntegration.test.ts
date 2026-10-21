import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hydrateBookSearchRows, validateStandaloneRecord } from "../app/api/research/bookLibraryR2Reader";
import type { BookRecord, BookSource } from "../app/lib/knowledge/bookCorpus";

const digest = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

describe("private R2 reader: real bundle format", () => {
  it("hydrates search-index rows that omit sourceId, then validates the text", () => {
    const source = { id: "nahj-ur", book: "nahj", language: "ur" } as BookSource;
    const row = {
      id: "nahj-ur:front-matter:0",
      title: "نہج البلاغہ",
      kind: "front-matter",
      number: 0,
      book: "nahj",
      language: "ur",
      reference: { sourceId: "nahj-ur", section: "front-matter", number: 0, locator: "word/document.xml", printPage: null },
      paragraphs: [{ id: "nahj-ur:front-matter:0:p1", text: "نہج البلاغہ" }],
      textSha256: digest("نہج البلاغہ"),
    };
    expect(hydrateBookSearchRows([row] as never, source)[0].sourceId).toBe("nahj-ur");
    expect(() => hydrateBookSearchRows([{ ...row, sourceId: "sahifa-ar" }] as never, source)).toThrow();
  });

  it("validates a Kafi record starting at source paragraph 5 without global predecessor state", () => {
    const source = { id: "kafi-v1-ar", book: "kafi", language: "ar" } as BookSource;
    const record = {
      id: "kafi-v1-ar:chapter:2",
      sourceId: "kafi-v1-ar",
      title: "باب",
      kind: "chapter",
      number: 2,
      book: "kafi",
      language: "ar",
      reference: {
        sourceId: "kafi-v1-ar", section: "chapter", number: 2,
        locator: "word/document.xml paragraphs 5-5", printPage: null,
        kafi: { volume: 1, bookTitle: null, chapterTitle: null, sectionTitle: null, sourceParagraphs: [5] },
      },
      paragraphs: [{ id: "kafi-v1-ar:chapter:2:p1", text: "باب" }],
      textSha256: digest("باب"),
    } as BookRecord;
    expect(() => validateStandaloneRecord(record, source)).not.toThrow();
    expect(() => validateStandaloneRecord({ ...record, textSha256: "0".repeat(64) }, source)).toThrow();
  });
});
