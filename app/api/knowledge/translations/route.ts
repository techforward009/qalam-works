import { NextRequest, NextResponse } from "next/server";
import { rejectUnauthenticatedResearch } from "../../research/auth/requireSession";
import { researchBlobClientFromEnv } from "../../research/vercelResearchBlob";
import { loadBookCatalog } from "../../../lib/knowledge/store";
import { readBookSource } from "../../../lib/knowledge/sourceCache";
import { prepareBookTranslation, saveBookTranslation } from "../../../lib/knowledge/bookTranslations";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(req: NextRequest) {
  const denied = rejectUnauthenticatedResearch(req); if (denied) return denied;
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin || !req.body || Number(req.headers.get("content-length")) > 512000) return json({ code: "invalid" }, 400);
  let input: unknown;
  try {
    const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length; if (bytes > 512000) { await reader.cancel(); return json({ code: "invalid" }, 400); } chunks.push(chunk.value); }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return json({ code: "invalid" }, 400); }
  try {
    const client = await researchBlobClientFromEnv(); const catalog = await loadBookCatalog(client);
    if (!catalog) return json({ code: "not-ready" }, 409);
    const v = input as { sourceId?: unknown; recordId?: unknown };
    if (!v || typeof v.sourceId !== "string" || typeof v.recordId !== "string") return json({ code: "invalid" }, 400);
    const source = catalog.manifest.sources.find(s=>s.id===v.sourceId && s.language === "ar");
    if (!source) return json({ code: "invalid" }, 400);
    const record = (await readBookSource(client,catalog,source.id)).find(r=>r.id===v.recordId);
    if (!record) return json({ code: "source-mismatch" }, 409);
    let translation;
    try { translation = prepareBookTranslation(input,record,source); } catch { return json({ code: "source-mismatch" }, 409); }
    await saveBookTranslation(client,translation);
    return json({ saved: true, translation: { text: translation.text, language: translation.language, translator: translation.translator, source: translation.translationSource } });
  } catch { return json({ code: "unavailable" }, 503); }
}
