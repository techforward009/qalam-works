import { NextRequest, NextResponse } from "next/server";
import { researchBlobClientFromEnv } from "../../research/vercelResearchBlob";
import { loadBookCatalog } from "../../../lib/knowledge/store";
import { readBookSource } from "../../../lib/knowledge/sourceCache";
import { ahmedgrafQuranReference } from "../../../tools/arabic-diacritics/quran/ahmedgrafProvider";
import type { BookSource, BookRecord } from "../../../lib/knowledge/bookCorpus";
import { retrieveKnowledgeWithContext, type KnowledgeScope } from "../../../lib/knowledge/retrieval";
import { quranTranslationFor, QURAN_TRANSLATION_SOURCES } from "../../../tools/khateeb-studio/engine/quranTranslationProvider";
import { createCloudflareKnowledgeProvider } from "../../../lib/knowledge/cloudflareAnswerProvider";
import { answerKnowledgeQuestion } from "../../../lib/knowledge/answerService";
import { understandKnowledgeQuestion } from "../../../lib/knowledge/questionUnderstanding";
import { rankKnowledgePassages } from "../../../lib/knowledge/passageRanking";
import { attachBookTranslations } from "../../../lib/knowledge/bookTranslations";
import { attachCorpusTranslations } from "../../../lib/knowledge/suppliedTranslations";
export const runtime = "nodejs";
export const maxDuration = 90;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(req: NextRequest) {
  if (!req.body || Number(req.headers.get("content-length")) > 8192) return json({ code: "invalid" }, 400);
  let input: { question?: unknown; scope?: unknown; locale?: unknown; mode?: unknown; contextQuestion?: unknown };
  try {
    const reader = req.body.getReader();
    let bytes = 0; const chunks: Uint8Array[] = [];
    while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length; if (bytes > 8192) { await reader.cancel(); return json({ code: "invalid" }, 400); } chunks.push(chunk.value); }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({ code: "invalid" }, 400);
  } catch { return json({ code: "invalid" }, 400); }
  const { question, scope = "all", locale = "ur", mode = "sources", contextQuestion } = input;
  if (typeof question !== "string" || question.trim().length < 2 || question.length > 600 || typeof scope !== "string" || !["all", "quran", "nahj", "sahifa", "kafi"].includes(scope) || typeof locale !== "string" || !["ur", "en"].includes(locale) || typeof mode !== "string" || !["sources", "research"].includes(mode) || contextQuestion !== undefined && (typeof contextQuestion !== "string" || !contextQuestion.trim() || contextQuestion.length > 600) || Object.keys(input).some(key => !["question", "scope", "locale", "mode", "contextQuestion"].includes(key))) return json({ code: "invalid" }, 400);
  const origin = req.headers.get("origin");
  if (mode === "research" && origin && origin !== req.nextUrl.origin) return json({ code: "invalid" }, 400);
  try {
    const caller = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const interpretation = mode === "research" ? understandKnowledgeQuestion(question.trim(), { accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_AUTH_TOKEN, caller }) : Promise.resolve([]);
    let sources: BookSource[] = [];
    let records: BookRecord[] = [];
    if (scope !== "quran") {
      const client = await researchBlobClientFromEnv();
      const catalog = await loadBookCatalog(client);
      if (catalog) { sources = catalog.manifest.sources.filter(s => (scope === "all" || s.book === scope) && (s.language === "ar" || s.language === locale)); records = (await Promise.all(sources.map(s => readBookSource(client, catalog, s.id)))).flat(); }
    }
    const inferredTopicIds = await interpretation;
    let result = retrieveKnowledgeWithContext({ candidateLimit: mode === "research" ? 16 : 8, inferredTopicIds, question: question.trim(), ...(typeof contextQuestion === "string" ? { contextQuestion: contextQuestion.trim() } : {}), scope: scope as KnowledgeScope, locale: locale as "ur" | "en", records, sources, quran: ahmedgrafQuranReference.listAyahs().map(ayah => {
      const text = quranTranslationFor(ayah.surah, ayah.ayah, locale as "ur" | "en");
      return { ...ayah, ...(text ? { suppliedTranslation: { text, language: locale as "ur" | "en", translator: locale === "ur" ? QURAN_TRANSLATION_SOURCES.ur.translatorUr : QURAN_TRANSLATION_SOURCES.en.translatorEn } } : {}) };
    }), quranSha256: ahmedgrafQuranReference.getMetadata().sourceSha256! });
    result.questionUnderstanding = inferredTopicIds.length ? "model" : "lexical";
    if (mode === "research") result = await rankKnowledgePassages(result, { accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_AUTH_TOKEN, caller });
    result = attachCorpusTranslations(result, records, sources, locale as "ur" | "en");
    if (scope !== "quran") result = await attachBookTranslations(await researchBlobClientFromEnv(), result, locale as "ur" | "en");
    if (mode === "research") result.research = await answerKnowledgeQuestion(result, locale as "ur" | "en", createCloudflareKnowledgeProvider({ env: { CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AUTH_TOKEN: process.env.CLOUDFLARE_AUTH_TOKEN } }), req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous");
    return json(result);
  } catch { return json({ code: "unavailable" }, 503); }
}
