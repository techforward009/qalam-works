export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { researchBlobClientFromEnv } from "../vercelResearchBlob";
import { loadBookCatalog } from "../../../lib/knowledge/store";
import { readBookSource } from "../../../lib/knowledge/sourceCache";
import { ALL_BOOK_SOURCE_IDS, bookRecordReference, createBookExcerpt, type BookRecord, type BookSource } from "../../../lib/knowledge/bookCorpus";
import { bookContents, bookFind, bookReadingPage, type BookReadingPage } from "../../../lib/knowledge/bookReaderModel";
import { attachCorpusTranslations } from "../../../lib/knowledge/suppliedTranslations";
import { attachBookTranslations } from "../../../lib/knowledge/bookTranslations";
import { bookSearchUnits } from "../../../lib/knowledge/sourceUnits";
import type { KnowledgePassage, KnowledgeResult } from "../../../lib/knowledge/retrieval";

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}
const bad = () => json({ code: "invalid" }, 400);

/** Attach only reviewed translations whose edition, record and paragraph anchors match exactly. */
async function withReviewedTranslations(
  client: Awaited<ReturnType<typeof researchBlobClientFromEnv>>,
  catalog: Awaited<ReturnType<typeof loadBookCatalog>> & {},
  source: BookSource,
  records: readonly BookRecord[],
  page: BookReadingPage,
  language: "ur" | "en",
): Promise<BookReadingPage> {
  if (page.language !== "ar") return page;
  const sources = catalog.manifest.sources;
  const candidateSources = sources.filter(s => s.book === source.book && s.language === language);
  const translationRecords = (await Promise.all(candidateSources.map(s => readBookSource(client, catalog, s.id)))).flat();
  const allRecords = [...records, ...translationRecords];
  const sourceRecord = records.find(r => r.id === page.recordId);
  if (!sourceRecord) return page;

  const passage = (paragraphIds: string[], text: string): KnowledgePassage => ({
    id: paragraphIds.join("|"), collection: source.book, language: "ar",
    referenceUr: bookRecordReference(sourceRecord, "ur", paragraphIds[0]),
    referenceEn: bookRecordReference(sourceRecord, "en", paragraphIds[0]),
    text, sourceSha256: source.sha256, recordId: sourceRecord.id, sourceId: source.id,
    paragraphId: paragraphIds[0],
    excerpt: createBookExcerpt(sourceRecord, source, paragraphIds),
    translator: source.translator,
  });
  const onPage = new Set(page.paragraphs.map(p => p.id));
  const corpusPassages = page.paragraphs.map(p => passage([p.id], p.text));
  let result: KnowledgeResult = {
    question: "", status: "evidence", method: "lexical-topic-expansion",
    passages: corpusPassages, expandedTerms: [], availableCollections: [],
  };
  result = attachCorpusTranslations(result, allRecords, sources, language);
  const translated = new Map<string, {
    value: NonNullable<KnowledgePassage["suppliedTranslation"]>;
    sourceParagraphIds: string[];
  }>();
  for (const p of result.passages) {
    if (p.suppliedTranslation && p.paragraphId) {
      translated.set(p.paragraphId, { value: p.suppliedTranslation, sourceParagraphIds: [p.paragraphId] });
    }
  }

  // Reviewed user translations may cover a verified multi-paragraph unit. Load only units fully present on this part.
  const units = bookSearchUnits(sourceRecord).filter(u => {
    const ids = u.paragraphs.map(p => p.id);
    return ids.length > 0 && ids.every(id => onPage.has(id));
  });
  const dynamicPassages = units.map(u => passage(u.paragraphs.map(p => p.id), u.text));
  if (dynamicPassages.length) {
    const dynamicResult = await attachBookTranslations(client, {
      ...result, passages: dynamicPassages,
    }, language);
    for (const p of dynamicResult.passages) {
      if (p.suppliedTranslation) {
        const ids = p.excerpt?.paragraphs.map(x => x.id) ?? [];
        if (ids.length) {
          for (const id of ids) translated.delete(id);
          translated.set(ids[ids.length - 1], { value: p.suppliedTranslation, sourceParagraphIds: ids });
        }
      }
    }
  }

  const translations = [...translated.values()].map(({ value, sourceParagraphIds }) => ({
    paragraphIds: sourceParagraphIds,
    text: value.text, language: value.language, translator: value.translator,
    source: value.source ?? "",
  }));
  return { ...page, translations };
}

/** Public, bounded read-only library API. Never exposes Blob credentials or write actions. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const op = params.get("op") ?? "catalog";
  const sourceId = params.get("sourceId") ?? "";
  const locale = params.get("locale") ?? "ur";
  const pageText = params.get("page") ?? "1";
  const partText = params.get("part") ?? "1";
  const id = params.get("id") ?? "";
  const query = params.get("query") ?? "";
  if (!["catalog", "contents", "read", "find"].includes(op)
    || !["ur", "en"].includes(locale)
    || !/^[1-9]\d{0,3}$/.test(pageText)
    || !(partText === "last" || /^[1-9]\d{0,3}$/.test(partText))
    || query.length > 120 || id.length > 300
    || (op !== "catalog" && !ALL_BOOK_SOURCE_IDS.includes(sourceId as typeof ALL_BOOK_SOURCE_IDS[number]))
    || (op === "read" && (!id || !id.startsWith(sourceId + ":")))
    || (op === "find" && !query.trim())) return bad();

  const page = Number(pageText);
  const part = partText === "last" ? "last" : Number(partText);
  try {
    const client = await researchBlobClientFromEnv();
    const catalog = await loadBookCatalog(client);
    if (!catalog) return json({ ready: false, sources: [] });
    if (op === "catalog") return json({
      ready: true, revision: catalog.revision,
      sources: catalog.manifest.sources.map(s => ({ id: s.id, book: s.book, language: s.language, translator: s.translator, sha256: s.sha256 })),
    });
    const source = catalog.manifest.sources.find(s => s.id === sourceId);
    if (!source) return json({ code: "not-found" }, 404);
    const records = await readBookSource(client, catalog, sourceId);
    if (op === "contents") return json(bookContents(records, sourceId, locale as "ur" | "en", page));
    if (op === "find") return json(bookFind(records, sourceId, query, locale as "ur" | "en", page));
    const selected = records.find(r => r.id === id);
    const chosenPart = part === "last" && selected ? Math.max(1, Math.ceil(selected.paragraphs.length / 12)) : part;
    const result = typeof chosenPart === "number" ? bookReadingPage(records, source, id, locale as "ur" | "en", chosenPart) : null;
    if (!result) return json({ code: "not-found" }, 404);
    return json(await withReviewedTranslations(client, catalog, source, records, result, locale as "ur" | "en"));
  } catch {
    return json({ code: "unavailable" }, 503);
  }
}


/**
 * Public, stateless excerpt assembly for a user-selected book passage.
 * This never uploads, activates, edits or persists a book or sermon.
 * Selected paragraph IDs are independently validated against original source
 * text/digests before returning an existing validated BookExcerpt.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return bad();
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return bad();
  if (req.headers.has("content-length") && (!/^\d+$/.test(req.headers.get("content-length")!)
    || Number(req.headers.get("content-length")) > 4096)) return bad();
  if (!req.body) return bad();
  let input: unknown;
  try {
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let count = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      count += chunk.value.byteLength;
      if (count > 4096) { await reader.cancel(); return bad(); }
      chunks.push(chunk.value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch { return bad(); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return bad();
  const x = input as Record<string, unknown>;
  const sourceId = x.sourceId, id = x.recordId, selected = x.paragraphIds, part = x.part;
  if (typeof sourceId !== "string" || !ALL_BOOK_SOURCE_IDS.includes(sourceId as typeof ALL_BOOK_SOURCE_IDS[number])
    || typeof id !== "string" || id.length > 300 || !id.startsWith(sourceId + ":")
    || !Number.isInteger(part) || (part as number) < 1 || (part as number) > 10000
    || typeof x.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/.test(x.sourceSha256)
    || typeof x.recordSha256 !== "string" || !/^[a-f0-9]{64}$/.test(x.recordSha256)
    || !Array.isArray(selected) || selected.length < 1 || selected.length > 12
    || !selected.every(p => typeof p === "string" && p.length < 320 && p.startsWith(id + ":p"))
    || new Set(selected).size !== selected.length) return bad();

  try {
    const client = await researchBlobClientFromEnv();
    const catalog = await loadBookCatalog(client);
    if (!catalog) return json({ code: "not-found" }, 404);
    const source = catalog.manifest.sources.find(s => s.id === sourceId);
    if (!source || source.sha256 !== x.sourceSha256) return json({ code: "stale-source" }, 409);
    const records = await readBookSource(client, catalog, sourceId);
    const record = records.find(r => r.id === id);
    if (!record) return json({ code: "not-found" }, 404);
    if (record.textSha256 !== x.recordSha256) return json({ code: "stale-record" }, 409);
    const readerPage = bookReadingPage(records, source, id, "ur", part as number);
    if (!readerPage || !selected.every(p => readerPage.paragraphs.some(q => q.id === p)))
      return bad();
    const excerpt = createBookExcerpt(record, source, selected as string[]);
    return json({ excerpt });
  } catch { return json({ code: "unavailable" }, 503); }
}
