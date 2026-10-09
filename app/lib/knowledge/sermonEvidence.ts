import type { ResearchBlobClient } from "../../tools/research-studio/engine";
import { completeQuranTranslationFor } from "./completeQuranTranslations";
import { researchBlobClientFromEnv } from "../../api/research/vercelResearchBlob";
import { loadBookCatalog } from "./store";
import { readBookSource } from "./sourceCache";
import { hasSuppliedAnswerText } from "./answerLanguage";
import { normalizeBookSearch } from "./bookCorpus";
import { planKnowledgeQuery } from "./searchConcepts";
import { retrieveKnowledge } from "./retrieval";
import { understandKnowledgeQuestion } from "./questionUnderstanding";
import { rankKnowledgePassages } from "./passageRanking";
import { attachCorpusTranslations } from "./suppliedTranslations";
import { attachBookTranslations } from "./bookTranslations";
import { ahmedgrafQuranReference } from "../../tools/arabic-diacritics/quran/ahmedgrafProvider";
import { QURAN_TRANSLATION_SOURCES } from "../../tools/khateeb-studio/engine/quranTranslationProvider";

export function retrieveSermonSources(input:Parameters<typeof retrieveKnowledge>[0]){
 const originalInput={...input,records:input.records.filter(record=>record.language==="ar")};
 const result=retrieveKnowledge(originalInput);
 if(result.status!=="evidence" || /[0-9۰-۹٠-٩"“«]/u.test(input.question))return result;
 const topics=planKnowledgeQuery(input.question,input.inferredTopicIds).topics.slice(0,3);
 const pools=[result.passages,...topics.map(t=>retrieveKnowledge({...originalInput,question:input.locale==="ur"?t.labelUr:t.labelEn,inferredTopicIds:[t.id]}).passages)];
 const passages:typeof result.passages=[];const seen=new Set<string>();
 for(let i=0;i<16&&passages.length<16;i++)for(const pool of pools){const p=pool[i];if(p&&!seen.has(p.id)&&passages.length<16){seen.add(p.id);passages.push(p);}}
 return {...result,passages};
}

/** Read-only operations for sermon evidence. Never expose a write method to the retrieval pipeline. */
export function readOnlySermonCorpus(client: ResearchBlobClient): ResearchBlobClient {
  return {
    getObject: (path) => client.getObject(path),
    listObjects: (prefix) => client.listObjects(prefix),
    putObject: async () => { throw new Error("sermon-read-only"); },
  };
}

export async function collectSermonEvidence(title: string, locale: "ur" | "en", caller: string) {
  const normalized=normalizeBookSearch(title);
  const scope=/قران|quran/u.test(normalized)&&!/نهج|nahj|صحيف|sahifa|کافي|كافي|kafi/u.test(normalized)?"quran" as const:"all" as const;
  const options = { accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_AUTH_TOKEN, caller };
  const interpretation = understandKnowledgeQuestion(title, options);
  // Quran-only requests require no private book-store access.
  const client = scope === "quran" ? null : readOnlySermonCorpus(await researchBlobClientFromEnv());
  const catalog = client ? await loadBookCatalog(client) : null;
  const sources = scope === "quran" ? [] : catalog?.manifest.sources.filter(s => s.language === "ar" || s.language === locale) ?? [];
  const records = client && catalog ? (await Promise.all(sources.map(s => readBookSource(client, catalog, s.id)))).flat() : [];
  const result = retrieveSermonSources({ question: title, scope, locale, candidateLimit: 16, inferredTopicIds: await interpretation, sources, records,
    quran: ahmedgrafQuranReference.listAyahs().map(ayah => {
      const text = completeQuranTranslationFor(ayah.surah, ayah.ayah, locale);
      return { ...ayah, ...(text ? { suppliedTranslation: { text, language: locale, translator: locale === "ur" ? QURAN_TRANSLATION_SOURCES.ur.translatorUr : QURAN_TRANSLATION_SOURCES.en.translatorEn } } : {}) };
    }), quranSha256: ahmedgrafQuranReference.getMetadata().sourceSha256! });
  const baseTranslated=attachCorpusTranslations(result,records,sources,locale);
  const translated=client ? await attachBookTranslations(client,baseTranslated,locale) : baseTranslated;
  return rankKnowledgePassages({...translated,passages:translated.passages.filter(p=>hasSuppliedAnswerText(p,locale))},options);
}
