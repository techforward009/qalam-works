export const runtime = "nodejs";
export const maxDuration = 60;
import { NextRequest, NextResponse } from "next/server";
import { rejectUnauthenticatedResearch } from "../../research/auth/requireSession";
import { researchBlobClientFromEnv } from "../../research/vercelResearchBlob";
import { BOOK_SOURCE_IDS, searchBookRecords } from "../../../tools/khateeb-studio/engine/bookLibrary";
import { loadBookCatalog, loadBookSource, MAX_BOOK_UPLOAD_BYTES, parseBookArchive, saveBookArchive } from "./store";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
function deny(req: NextRequest) {
  const response = rejectUnauthenticatedResearch(req);
  if (response) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export async function GET(req: NextRequest) {
  const denied = deny(req);
  if (denied) return denied;
  const params = req.nextUrl.searchParams;
  const op = params.get("op") ?? "catalog";
  const query = params.get("query") ?? "";
  const sourceId = params.get("sourceId") ?? "";
  const number = params.get("number") ?? "";
  if (!["catalog", "search", "record"].includes(op) || query.length > 300 || sourceId && !BOOK_SOURCE_IDS.includes(sourceId as typeof BOOK_SOURCE_IDS[number]) || number.length > 5) return json({ code: "invalid" }, 400);
  try {
    const client = await researchBlobClientFromEnv();
    const catalog = await loadBookCatalog(client);
    if (!catalog) return json({ ready: false, sources: [], recordCount: 0 });
    if (op === "catalog") return json({ ready: true, revision: catalog.revision, sources: catalog.manifest.sources, recordCount: catalog.manifest.recordCount });
    if (op === "record") {
      const id = params.get("id");
      if (!sourceId || !id || id.length > 300) return json({ code: "invalid" }, 400);
      const records = await loadBookSource(client, catalog, sourceId);
      const record = records.find(r => r.id === id);
      return record ? json({ record, source: catalog.manifest.sources.find(s => s.id === sourceId) }) : json({ code: "not-found" }, 404);
    }
    const language = params.get("language") ?? "";
    const book = params.get("book") ?? "";
    const kind = params.get("kind") ?? "";
    const page = Number(params.get("page") ?? 1);
    if (language && !["ar", "ur", "en"].includes(language) || book && !["nahj", "sahifa"].includes(book) || kind.length > 40 || !Number.isInteger(page) || page < 1 || page > 1000) return json({ code: "invalid" }, 400);
    const sources = catalog.manifest.sources.filter(s => (!sourceId || s.id === sourceId) && (!book || s.book === book) && (!language || s.language === language));
    const records = (await Promise.all(sources.map(s => loadBookSource(client, catalog, s.id)))).flat();
    return json(searchBookRecords(records, { query, sourceId, language, book, kind, number, page }));
  } catch {
    return json({ code: "unavailable" }, 503);
  }
}
export async function POST(req: NextRequest) {
  const denied = deny(req);
  if (denied) return denied;
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return json({ code: "invalid" }, 400);
  const maxBody = MAX_BOOK_UPLOAD_BYTES + 32_768;
  if (Number(req.headers.get("content-length")) > maxBody || !req.body) return json({ code: "invalid" }, 400);
  let archive: Awaited<ReturnType<typeof parseBookArchive>>;
  try {
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      if (length > maxBody) { await reader.cancel(); return json({ code: "invalid" }, 400); }
      chunks.push(chunk.value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": req.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("archive");
    if (!(file instanceof File) || [...form.keys()].length !== 1 || file.size > MAX_BOOK_UPLOAD_BYTES) return json({ code: "invalid" }, 400);
    archive = await parseBookArchive(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return json({ code: "invalid" }, 400);
  }
  try {
    const client = await researchBlobClientFromEnv();
    await saveBookArchive(client, archive);
    return json({ ready: true, revision: archive.revision, sources: archive.manifest.sources, recordCount: archive.manifest.recordCount });
  } catch {
    return json({ code: "unavailable" }, 503);
  }
}
