export const runtime = "nodejs";
export const maxDuration = 60;
import { NextRequest, NextResponse } from "next/server";
import { rejectUnauthenticatedResearch } from "../../research/auth/requireSession";
import { researchBlobClientFromEnv } from "../../research/vercelResearchBlob";
import { ALL_BOOK_SOURCE_IDS, searchBookRecords } from "../../../tools/khateeb-studio/engine/bookLibrary";
import { loadBookCatalog, MAX_BOOK_UPLOAD_BYTES, parseBookArchive, saveBookArchive } from "./store";

import { resolvePatienceMaterials } from "../../../tools/khateeb-studio/engine/patienceBookGuide";
import { readBookSource } from "./sourceCache";
import { activateBookImport, saveBookImportSource, validateBookImportPlan, MAX_BOOK_PART_BYTES } from "../../../lib/knowledge/store";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
function deny(req: NextRequest) {
  const response = rejectUnauthenticatedResearch(req);
  if (response) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const op = params.get("op") ?? "catalog";
  const query = params.get("query") ?? "";
  const sourceId = params.get("sourceId") ?? "";
  const number = params.get("number") ?? "";
  if (!["catalog", "search", "record", "topic"].includes(op) || query.length > 300 || sourceId && !ALL_BOOK_SOURCE_IDS.includes(sourceId as typeof ALL_BOOK_SOURCE_IDS[number]) || number.length > 5) return json({ code: "invalid" }, 400);
  try {
    const client = await researchBlobClientFromEnv();
    const catalog = await loadBookCatalog(client);
    if (!catalog) return json({ ready: false, sources: [], recordCount: 0 });
    if (op === "catalog") return json({ ready: true, revision: catalog.revision, sources: catalog.manifest.sources, recordCount: catalog.manifest.recordCount });
    if (op === "topic") {
      const locale = params.get("language") ?? "ur";
      if (params.get("topicId") !== "patience" || !["ur", "en"].includes(locale)) return json({ code: "invalid" }, 400);
      const sources = catalog.manifest.sources.filter(s => s.language === "ar" || s.language === locale);
      const records = (await Promise.all(sources.map(s => readBookSource(client, catalog, s.id)))).flat();
      return json(resolvePatienceMaterials(records, sources, locale as "ur" | "en"));
    }
    if (op === "record") {
      const id = params.get("id");
      if (!sourceId || !id || id.length > 300) return json({ code: "invalid" }, 400);
      const records = await readBookSource(client, catalog, sourceId);
      const record = records.find(r => r.id === id);
      return record ? json({ record, source: catalog.manifest.sources.find(s => s.id === sourceId) }) : json({ code: "not-found" }, 404);
    }
    const language = params.get("language") ?? "";
    const book = params.get("book") ?? "";
    const kind = params.get("kind") ?? "";
    const page = Number(params.get("page") ?? 1);
    if (language && !["ar", "ur", "en"].includes(language) || book && !["nahj", "sahifa", "kafi"].includes(book) || kind.length > 40 || !Number.isInteger(page) || page < 1 || page > 1000) return json({ code: "invalid" }, 400);
    const sources = catalog.manifest.sources.filter(s => (!sourceId || s.id === sourceId) && (!book || s.book === book) && (!language || s.language === language));
    const records = (await Promise.all(sources.map(s => readBookSource(client, catalog, s.id)))).flat();
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
  const operation = req.nextUrl.searchParams.get("op");
  if (operation === "source" || operation === "activate") {
    const limit = operation === "source" ? MAX_BOOK_PART_BYTES + 262_144 : 262_144;
    if (Number(req.headers.get("content-length")) > limit || !req.body) return json({ code: "invalid" }, 400);
    let plan: unknown;
    let bytes: Uint8Array | null = null;
    let sourceId = "";
    try {
      const reader = req.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.length;
        if (length > limit) { await reader.cancel(); return json({ code: "invalid" }, 400); }
        chunks.push(chunk.value);
      }
      const body = Buffer.concat(chunks);
      if (operation === "activate") plan = JSON.parse(body.toString("utf8"));
      else {
        const form = await new Response(body, { headers: { "Content-Type": req.headers.get("content-type") ?? "" } }).formData();
        const file = form.get("source");
        const rawPlan = form.get("plan");
        const id = form.get("sourceId");
        if (!(file instanceof File) || typeof rawPlan !== "string" || typeof id !== "string" || [...form.keys()].length !== 3 || file.size > MAX_BOOK_PART_BYTES) throw new Error("invalid");
        plan = JSON.parse(rawPlan); sourceId = id;
        bytes = new Uint8Array(await file.arrayBuffer());
      }
      validateBookImportPlan(plan);
    } catch { return json({ code: "invalid" }, 400); }
    try {
      const client = await researchBlobClientFromEnv();
      if (bytes) {
        const revision = await saveBookImportSource(client, plan, sourceId, bytes);
        return json({ stored: true, revision });
      }
      const catalog = await activateBookImport(client, plan);
      return json({ ready: true, revision: catalog.revision, sources: catalog.manifest.sources, recordCount: catalog.manifest.recordCount });
    } catch { return json({ code: "unavailable" }, 503); }
  }
  if (operation) return json({ code: "invalid" }, 400);
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
