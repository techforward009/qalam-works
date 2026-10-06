import type { ResearchBlobClient } from "../../../tools/research-studio/engine";
import type { BookRecord } from "../../../tools/khateeb-studio/engine/bookLibrary";
import { loadBookSource, type BookCatalog } from "./store";

const entries = new Map<string, { expires: number; value: Promise<BookRecord[]> }>();
const MAX_SOURCES = 7;
const TTL = 5 * 60_000;

export function clearBookSourceCache(): void {
  entries.clear();
}

export function readBookSource(client: ResearchBlobClient, catalog: BookCatalog, sourceId: string): Promise<BookRecord[]> {
  const key = `${catalog.revision}:${sourceId}`;
  const cached = entries.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (entries.size >= MAX_SOURCES) entries.delete(entries.keys().next().value!);
  const value = loadBookSource(client, catalog, sourceId).catch(error => {
    if (entries.get(key)?.value === value) entries.delete(key);
    throw error;
  });
  entries.set(key, { expires: Date.now() + TTL, value });
  return value;
}
