import { researchBlobClientFromEnv } from "../../api/research/vercelResearchBlob";
import { loadBookCatalog } from "./store";
import { readBookSource } from "./sourceCache";
import { retrieveKnowledge } from "./retrieval";
import { understandKnowledgeQuestion } from "./questionUnderstanding";
import { rankKnowledgePassages } from "./passageRanking";
import { attachCorpusTranslations } from "./suppliedTranslations";
import { attachBookTranslations } from "./bookTranslations";
import { ahmedgrafQuranReference } from "../../tools/arabic-diacritics/quran/ahmedgrafProvider";
import { quranTranslationFor, QURAN_TRANSLATION_SOURCES } from "../../tools/khateeb-studio/engine/quranTranslationProvider";

export async function collectSermonEvidence(title: string, locale: "ur" | "en", caller: string) {
  const options = { accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_AUTH_TOKEN, caller };
  const interpretation = understandKnowledgeQuestion(title, options);
  const client = await researchBlobClientFromEnv();
  const catalog = await loadBookCatalog(client);
  const sources = catalog?.manifest.sources.filter(s => s.language === "ar" || s.language === locale) ?? [];
  const records = catalog ? (await Promise.all(sources.map(s => readBookSource(client, catalog, s.id)))).flat() : [];
  const result = retrieveKnowledge({ question: title, scope: "all", locale, candidateLimit: 16, inferredTopicIds: await interpretation, sources, records,
    quran: ahmedgrafQuranReference.listAyahs().map(ayah => {
      const text = quranTranslationFor(ayah.surah, ayah.ayah, locale);
      return { ...ayah, ...(text ? { suppliedTranslation: { text, language: locale, translator: locale === "ur" ? QURAN_TRANSLATION_SOURCES.ur.translatorUr : QURAN_TRANSLATION_SOURCES.en.translatorEn } } : {}) };
    }), quranSha256: ahmedgrafQuranReference.getMetadata().sourceSha256! });
  return attachBookTranslations(client, attachCorpusTranslations(await rankKnowledgePassages(result, options), records, sources, locale), locale);
}
