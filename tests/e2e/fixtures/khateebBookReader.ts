import type { Page } from "@playwright/test";
import type { BookRecord, BookSource } from "../../../app/lib/knowledge/bookCorpus";
import { bookContents, bookReadingPage } from "../../../app/lib/knowledge/bookReaderModel";

// The same small Arabic passage used by the Noorehuda regression, served
// through the public reader contract without requiring a live R2 corpus.
export const readerSource: BookSource = {
  id: "sahifa-ar", book: "sahifa", language: "ar",
  filename: "sahifa-ar.docx", translator: null, sha256: "a".repeat(64),
};
const id = "sahifa-ar:supplication:1";
export const readerRecord: BookRecord = {
  id, sourceId: readerSource.id, book: "sahifa", language: "ar",
  kind: "supplication", number: 1, title: "دعاء ١",
  reference: { sourceId: readerSource.id, section: "supplication", number: 1, locator: "fixture", printPage: null },
  paragraphs: [{ id: `${id}:p1`, text: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ وَقَالَ عَلَيْهِ السَّلَامُ" }],
  textSha256: "b".repeat(64),
};

export async function mockKhateebBookReader(page: Page) {
  await page.route("**/api/khateeb/book-reader**", route => {
    const params = new URL(route.request().url()).searchParams;
    const locale = params.get("locale") === "en" ? "en" : "ur";
    switch (params.get("op")) {
      case "catalog":
        return route.fulfill({ json: { ready: true, sources: [readerSource] } });
      case "contents":
        return route.fulfill({ json: bookContents([readerRecord], readerSource.id, locale) });
      case "read":
        return route.fulfill({ json: bookReadingPage([readerRecord], readerSource, params.get("id")!, locale) });
      default:
        return route.fulfill({ status: 400, json: { code: "unexpected-fixture-request" } });
    }
  });
}
