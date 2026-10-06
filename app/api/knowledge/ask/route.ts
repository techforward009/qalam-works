import { NextRequest, NextResponse } from "next/server";
import { researchBlobClientFromEnv } from "../../research/vercelResearchBlob";
import { loadBookCatalog } from "../../../lib/knowledge/store";
import { readBookSource } from "../../../lib/knowledge/sourceCache";
import { ahmedgrafQuranReference } from "../../../tools/arabic-diacritics/quran/ahmedgrafProvider";
import type { BookSource, BookRecord } from "../../../lib/knowledge/bookCorpus";
import { retrieveKnowledge, type KnowledgeScope } from "../../../lib/knowledge/retrieval";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(req: NextRequest) {
  if (!req.body || Number(req.headers.get("content-length")) > 4096) return json({ code: "invalid" }, 400);
  let input: { question?: unknown; scope?: unknown; locale?: unknown };
  try {
    const reader = req.body.getReader();
    let bytes = 0; const chunks: Uint8Array[] = [];
    while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length; if (bytes > 4096) { await reader.cancel(); return json({ code: "invalid" }, 400); } chunks.push(chunk.value); }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({ code: "invalid" }, 400);
  } catch { return json({ code: "invalid" }, 400); }
  const { question, scope = "all", locale = "ur" } = input;
  if (typeof question !== "string" || question.trim().length < 2 || question.length > 600 || !["all", "quran", "nahj", "sahifa"].includes(String(scope)) || !["ur", "en"].includes(String(locale))) return json({ code: "invalid" }, 400);
  try {
    let sources: BookSource[] = [];
    let records: BookRecord[] = [];
    if (scope !== "quran") {
      const client = await researchBlobClientFromEnv();
      const catalog = await loadBookCatalog(client);
      if (catalog) { sources = catalog.manifest.sources.filter(s => (scope === "all" || s.book === scope) && (s.language === "ar" || s.language === locale)); records = (await Promise.all(sources.map(s => readBookSource(client, catalog, s.id)))).flat(); }
    }
    return json(retrieveKnowledge({ question: question.trim(), scope: scope as KnowledgeScope, locale: locale as "ur" | "en", records, sources, quran: ahmedgrafQuranReference.listAyahs(), quranSha256: ahmedgrafQuranReference.getMetadata().sourceSha256! }));
  } catch { return json({ code: "unavailable" }, 503); }
}
