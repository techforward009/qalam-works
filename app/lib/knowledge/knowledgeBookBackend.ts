import type { BookRecord, BookSource } from "./bookCorpus";
import { researchBlobClientFromEnv } from "../../api/research/vercelResearchBlob";
import { loadBookCatalog } from "./store";
import { readBookSource } from "./sourceCache";
import {
  BookLibraryR2Unavailable,
  bookLibraryR2IsSelected,
  loadBookLibraryR2Catalog,
  readBookSourceFromR2,
} from "../../api/research/bookLibraryR2Reader";

/** The same verified book corpus used by the public Khateeb reader.
 * Never fall back to Blob after R2 has been selected.
 */
export async function loadKnowledgeBooks(
  scope: "all" | "quran" | "nahj" | "sahifa" | "kafi",
  locale: "ur" | "en",
  options: { requireR2?: boolean } = {},
): Promise<{ sources: BookSource[]; records: BookRecord[]; backend: "none" | "r2" | "blob" }> {
  if (scope === "quran") return { sources: [], records: [], backend: "none" };
  if (await bookLibraryR2IsSelected()) {
    const catalog = await loadBookLibraryR2Catalog();
    const sources = catalog.sources.filter(source =>
      (scope === "all" || source.book === scope) &&
      (source.language === "ar" || source.language === locale)
    );
    const records = (await Promise.all(sources.map(source => readBookSourceFromR2(source.id))))
      .flatMap(result => result.records);
    return { sources, records, backend: "r2" };
  }
  if (options.requireR2) throw new BookLibraryR2Unavailable();
  const client = await researchBlobClientFromEnv();
  const catalog = await loadBookCatalog(client);
  if (!catalog) return { sources: [], records: [], backend: "blob" };
  const sources = catalog.manifest.sources.filter(source =>
    (scope === "all" || source.book === scope) &&
    (source.language === "ar" || source.language === locale)
  );
  const records = (await Promise.all(sources.map(source => readBookSource(client, catalog, source.id)))).flat();
  return { sources, records, backend: "blob" };
}
