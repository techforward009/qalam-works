export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { rejectUnauthenticatedResearch } from "../auth/requireSession";
import { researchBlobClientFromEnv } from "../vercelResearchBlob";
import { loadBookCatalog } from "../../../lib/knowledge/store";
import { readBookSource } from "../../../lib/knowledge/sourceCache";
import { ALL_BOOK_SOURCE_IDS, createBookExcerpt } from "../../../lib/knowledge/bookCorpus";
import { bookContents, bookFind, bookReadingPage } from "../../../lib/knowledge/bookReaderModel";

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}
const bad = () => json({ code: "invalid" }, 400);

/** Entire endpoint is owner-session gated, including even the catalog. */
export async function GET(req: NextRequest) {
  const denied = rejectUnauthenticatedResearch(req);
  if (denied) {
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }

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
    return result ? json(result) : json({ code: "not-found" }, 404);
  } catch {
    return json({ code: "unavailable" }, 503);
  }
}


/**
 * Owner-only, read-only excerpt creation. No private text is sent in a URL,
 * no corpus mutation, and only original paragraph IDs on the displayed reader
 * part can become an existing validated BookExcerpt for "My Sermon".
 */
export async function POST(req: NextRequest) {
  const denied = rejectUnauthenticatedResearch(req);
  if (denied) {
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }
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
