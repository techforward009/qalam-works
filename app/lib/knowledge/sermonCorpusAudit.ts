import type { ResearchBlobClient } from "../../tools/research-studio/engine";
import { BOOK_POINTER_PATH, loadBookCatalog } from "./store";
import { readBookSource } from "./sourceCache";
import { readOnlySermonCorpus } from "./sermonEvidence";

const books = ["nahj", "sahifa", "kafi"] as const;
export type SermonCorpusAudit = {
  status: "passed" | "incomplete";
  pointer: typeof BOOK_POINTER_PATH;
  sources: { book: typeof books[number]; arabicRecords: number; hasUrduEdition: boolean; sourceCount: number; missingLocator: number }[];
  missingBooks: string[];
};
/**
 * Inspect the actual private corpus in memory, never download or disclose passages.
 * This is an internal verification routine, NOT a public route.
 * No object writes are possible even if the underlying auth grants them.
 * Urdu edition presence is not proof of aligned hadith-level translations.
 */
export async function auditSermonCorpus(client: ResearchBlobClient): Promise<SermonCorpusAudit> {
  const reader = readOnlySermonCorpus(client);
  const catalog = await loadBookCatalog(reader);
  if (!catalog) throw new Error("missing-catalog");
  const sources = await Promise.all(books.map(async book => {
    const entries = catalog.manifest.sources.filter(source => source.book === book);
    const originals = entries.filter(source => source.language === "ar");
    let arabicRecords = 0;
    let missingLocator = 0;
    for (const source of originals) {
      const records = await readBookSource(reader, catalog, source.id);
      arabicRecords += records.length;
      missingLocator += records.filter(record => !record.reference?.locator?.trim()).length;
    }
    return { book, arabicRecords, hasUrduEdition: entries.some(source => source.language === "ur"), sourceCount: entries.length, missingLocator };
  }));
  const missingBooks = sources.filter(source => !source.arabicRecords || source.missingLocator).map(source => source.book);
  return { status: missingBooks.length ? "incomplete" : "passed", pointer: BOOK_POINTER_PATH, sources, missingBooks };
}
