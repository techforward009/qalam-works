export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { rejectUnauthenticatedResearch } from "../auth/requireSession";
import { researchBlobClientFromEnv } from "../vercelResearchBlob";
import { loadBookCatalog } from "../../../lib/knowledge/store";
import { readBookSource } from "../../../lib/knowledge/sourceCache";
import { ALL_BOOK_SOURCE_IDS } from "../../../lib/knowledge/bookCorpus";
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
    || !/^[1-9]\d{0,3}$/.test(partText)
    || query.length > 120 || id.length > 300
    || (op !== "catalog" && !ALL_BOOK_SOURCE_IDS.includes(sourceId as typeof ALL_BOOK_SOURCE_IDS[number]))
    || (op === "read" && (!id || !id.startsWith(sourceId + ":")))
    || (op === "find" && !query.trim())) return bad();

  const page = Number(pageText);
  const part = Number(partText);
  try {
    const client = await researchBlobClientFromEnv();
    const catalog = await loadBookCatalog(client);
    if (!catalog) return json({ ready: false, sources: [] });
    if (op === "catalog") return json({
      ready: true, revision: catalog.revision,
      sources: catalog.manifest.sources.map(s => ({ id: s.id, book: s.book, language: s.language, translator: s.translator })),
    });
    const source = catalog.manifest.sources.find(s => s.id === sourceId);
    if (!source) return json({ code: "not-found" }, 404);
    const records = await readBookSource(client, catalog, sourceId);
    if (op === "contents") return json(bookContents(records, sourceId, locale as "ur" | "en", page));
    if (op === "find") return json(bookFind(records, sourceId, query, locale as "ur" | "en", page));
    const result = bookReadingPage(records, source, id, locale as "ur" | "en", part);
    return result ? json(result) : json({ code: "not-found" }, 404);
  } catch {
    return json({ code: "unavailable" }, 503);
  }
}
