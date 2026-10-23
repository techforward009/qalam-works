import { publicBookGetCacheControl } from "../cacheControl";
export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import {
  bookLibraryR2IsSelected, loadBookLibraryR2Catalog,
  readBookSourceFromR2, readBookRecordFromR2,
} from "../../research/bookLibraryR2Reader";
import {
  ALL_BOOK_SOURCE_IDS, bookRecordReference, createBookExcerpt,
  type BookRecord, type BookSource,
} from "../../../lib/knowledge/bookCorpus";
import {
  bookContents, bookFind, bookReadingPage, type BookReadingPage,
} from "../../../lib/knowledge/bookReaderModel";
import { attachCorpusTranslations } from "../../../lib/knowledge/suppliedTranslations";
import type { KnowledgePassage, KnowledgeResult } from "../../../lib/knowledge/retrieval";

const json = (body: unknown, status = 200, cacheControl = "private, no-store") =>
  NextResponse.json(body, { status, headers: { "Cache-Control": cacheControl } });
const invalid = () => json({ code: "invalid" }, 400);

/** Attach only SHA/paragraph-bound supplied translations already reviewed.
 * Owner-private edited sidecars in Vercel Blob are deliberately unavailable here.
 * No generated translations or hidden legacy Blob fallback.
 */
async function verifiedTranslations(
  page: BookReadingPage, original: BookRecord, source: BookSource,
  allSources: readonly BookSource[], locale: "ur" | "en",
): Promise<BookReadingPage> {
  if (source.language !== "ar" || locale !== "ur") return page;
  const translatedEditions = allSources.filter(s => s.book === source.book && s.language === "ur");
  if (!translatedEditions.length) return page;
  const translated = (await Promise.all(translatedEditions.map(async s => {
    try { return (await readBookSourceFromR2(s.id)).records; }
    catch { return []; }
  }))).flat();
  const passages: KnowledgePassage[] = page.paragraphs.map(p => ({
    id: p.id, collection: source.book, language: "ar",
    referenceUr: bookRecordReference(original, "ur", p.id),
    referenceEn: bookRecordReference(original, "en", p.id),
    text: p.text, sourceSha256: source.sha256,
    sourceId: source.id, recordId: original.id, paragraphId: p.id,
    translator: source.translator,
    excerpt: createBookExcerpt(original, source, [p.id]),
  }));
  const result: KnowledgeResult = {
    question: "", status: "evidence", method: "lexical-topic-expansion",
    passages, expandedTerms: [], availableCollections: [],
  };
  const aligned = attachCorpusTranslations(result, [original, ...translated], allSources, locale);
  const translations = aligned.passages.flatMap(p => p.suppliedTranslation && p.paragraphId ? [{
    paragraphIds: [p.paragraphId], text: p.suppliedTranslation.text,
    language: p.suppliedTranslation.language, translator: p.suppliedTranslation.translator,
    source: p.suppliedTranslation.source ?? "",
  }] : []);
  return translations.length ? { ...page, translations } : page;
}

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams;
  const op = qs.get("op") ?? "catalog";
  const reply = (body: unknown, status = 200) => json(body, status, publicBookGetCacheControl(req, status, op));
  const sourceId = qs.get("sourceId") ?? "";
  const locale = qs.get("locale") ?? "ur";
  const id = qs.get("id") ?? "";
  const query = qs.get("query") ?? "";
  const pageRaw = qs.get("page") ?? "1";
  const partRaw = qs.get("part") ?? "1";
  if (!["catalog", "contents", "read", "find"].includes(op) ||
    !["ur", "en"].includes(locale) ||
    !/^[1-9]\d{0,3}$/.test(pageRaw) ||
    !(partRaw === "last" || /^[1-9]\d{0,3}$/.test(partRaw)) ||
    query.length > 120 || id.length > 300 ||
    (op !== "catalog" && !ALL_BOOK_SOURCE_IDS.includes(sourceId as typeof ALL_BOOK_SOURCE_IDS[number])) ||
    (op === "read" && (!id || !id.startsWith(sourceId + ":"))) ||
    (op === "find" && !query.trim())) return invalid();
  const pageNumber = Number(pageRaw);
  // One fetched record is laid out as many *visually measured* pages in the
  // browser. Never invent printed page numbers from paragraph counts.
  if (op === "read" && !["1", "last"].includes(partRaw)) return reply({ code: "not-found" }, 404);
  try {
    if (!(await bookLibraryR2IsSelected())) return reply({ code: "unavailable" }, 503);
    const catalog = await loadBookLibraryR2Catalog();
    if (op === "catalog") return reply({
      ready: true, revision: catalog.revision,
      sources: catalog.sources.map(s => ({
        id: s.id, book: s.book, language: s.language,
        translator: s.translator, sha256: s.sha256,
      })),
    });
    const source = catalog.sources.find(s => s.id === sourceId);
    if (!source) return reply({ code: "not-found" }, 404);
    const indexed = await readBookSourceFromR2(sourceId);
    if (op === "contents") return reply(bookContents(indexed.records, sourceId, locale as "ur" | "en", pageNumber));
    if (op === "find") return reply(bookFind(indexed.records, sourceId, query, locale as "ur" | "en", pageNumber));

    // Search-index paragraphs may be abbreviated. Fetch the complete immutable
    // R2 record by its verified SHA and substitute it at the same ordinal.
    const full = await readBookRecordFromR2(sourceId, id);
    if (!full || full.source.sha256 !== source.sha256) return reply({ code: "not-found" }, 404);
    const exactRecords = indexed.records.map(r => r.id === id ? full.record : r);
    const reading = bookReadingPage(exactRecords, source, id, locale as "ur" | "en", 1);
    if (!reading) return reply({ code: "not-found" }, 404);
    if (reading.paragraphs.reduce((n, p) => n + Buffer.byteLength(p.text, "utf8"), 0) > 1_000_000) {
      return reply({ code: "record-too-large" }, 413);
    }
    return reply(await verifiedTranslations(reading, full.record, source, catalog.sources, locale as "ur" | "en"));
  } catch {
    return reply({ code: "unavailable" }, 503);
  }
}

/** Public stateless excerpt assembly with exact source/record digests.
 * No book import, mutation, activation, or server-side saved material.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return invalid();
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return invalid();
  if (req.headers.has("content-length") &&
    (!/^\d+$/.test(req.headers.get("content-length")!) || Number(req.headers.get("content-length")) > 4096)) return invalid();
  if (!req.body) return invalid();
  let input: unknown;
  try {
    const reader = req.body.getReader(), chunks: Uint8Array[] = [];
    let count = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      count += chunk.value.byteLength;
      if (count > 4096) { await reader.cancel(); return invalid(); }
      chunks.push(chunk.value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return invalid(); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid();
  const x = input as Record<string, unknown>;
  const sourceId = x.sourceId, id = x.recordId, selected = x.paragraphIds;
  if (typeof sourceId !== "string" || !ALL_BOOK_SOURCE_IDS.includes(sourceId as typeof ALL_BOOK_SOURCE_IDS[number]) ||
    typeof id !== "string" || id.length > 300 || !id.startsWith(sourceId + ":") ||
    x.part !== 1 ||
    typeof x.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/.test(x.sourceSha256) ||
    typeof x.recordSha256 !== "string" || !/^[a-f0-9]{64}$/.test(x.recordSha256) ||
    !Array.isArray(selected) || selected.length < 1 || selected.length > 12 ||
    !selected.every(p => typeof p === "string" && p.length < 320 && p.startsWith(id + ":p")) ||
    new Set(selected).size !== selected.length) return invalid();

  try {
    if (!(await bookLibraryR2IsSelected())) return json({ code: "unavailable" }, 503);
    const catalog = await loadBookLibraryR2Catalog();
    const source = catalog.sources.find(s => s.id === sourceId);
    if (!source || source.sha256 !== x.sourceSha256) return json({ code: "stale-source" }, 409);
    const full = await readBookRecordFromR2(sourceId, id);
    if (!full) return json({ code: "not-found" }, 404);
    if (full.record.textSha256 !== x.recordSha256 || full.source.sha256 !== x.sourceSha256)
      return json({ code: "stale-record" }, 409);
    if (!selected.every(p => full.record.paragraphs.some(q => q.id === p))) return invalid();
    const excerpt = createBookExcerpt(full.record, source, selected as string[]);
    return json({ excerpt });
  } catch {
    return json({ code: "unavailable" }, 503);
  }
}
