import { expect, it } from "vitest";
import { copyReadingPage, type BookReadingPage } from "../app/lib/knowledge/bookReaderModel";

const page: BookReadingPage = {
  recordId: "nahj-ar:saying:1", sourceId: "nahj-ar", recordOrdinal: 1,
  language: "ar", kind: "saying", title: "اصل متن کا حصہ 1", reference: "نہج البلاغہ، حکمت 1",
  translator: null, paragraphCount: 1,
  paragraphs: [{ id: "nahj-ar:saying:1:p1", text: "عَرَبِيٌّ محفوظ" }],
  page: 1, pageCount: 1, previousRecordId: null, nextRecordId: null,
  recordSha256: "a".repeat(64), sourceSha256: "b".repeat(64), screenPartOnly: true,
  translations: [{ paragraphIds: ["nahj-ar:saying:1:p1"], text: "اردو ترجمہ", language: "ur", translator: "مترجم", source: "نسخہ ۱" }],
};
it("copies original, translation and combined text without changing source strings", () => {
  expect(copyReadingPage(page, false, "original")).toBe("عَرَبِيٌّ محفوظ");
  expect(copyReadingPage(page, false, "translation")).toBe("اردو ترجمہ");
  expect(copyReadingPage(page, false, "combined")).toBe("عَرَبِيٌّ محفوظ\n\nاردو ترجمہ");
  expect(page.paragraphs[0].text).toBe("عَرَبِيٌّ محفوظ");
});
it("keeps translated text attribution separate from the source reference", () => {
  expect(copyReadingPage(page, true, "combined")).toBe(
    "نہج البلاغہ، حکمت 1\n\nمترجم — نسخہ ۱\n\nعَرَبِيٌّ محفوظ\n\nاردو ترجمہ",
  );
  expect(copyReadingPage({ ...page, translations: [] }, false, "translation")).toBe("");
});
