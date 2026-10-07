import { expect, it, vi } from "vitest";
vi.mock("../app/api/research/vercelResearchBlob",()=>({researchBlobClientFromEnv:vi.fn()}));
import { retrieveSermonSources } from "../app/lib/knowledge/sermonEvidence";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { completeQuranTranslationFor } from "../app/lib/knowledge/completeQuranTranslations";
const base={scope:"quran" as const,locale:"ur" as const,candidateLimit:16,records:[],sources:[],quranSha256:ahmedgrafQuranReference.getMetadata().sourceSha256!,quran:ahmedgrafQuranReference.listAyahs().map(a=>({...a,suppliedTranslation:{text:completeQuranTranslationFor(a.surah,a.ayah,"ur")!,language:"ur" as const,translator:"علامہ شیخ محسن علی نجفی"}}))};
it("collects evidence for each topic of a sermon without requiring every verse to mention every topic",()=>{
 const result=retrieveSermonSources({...base,question:"قرآن میں صبر اور نماز",inferredTopicIds:["patience","prayer-ritual"]});
 expect(result.passages.length).toBeGreaterThan(2);expect(result.passages.length).toBeLessThanOrEqual(16);
 expect(new Set(result.passages.map(p=>p.id)).size).toBe(result.passages.length);
 expect(result.passages.every(p=>p.collection==="quran"&&p.suppliedTranslation?.language==="ur")).toBe(true);
});
it("preserves exact numbered references rather than expanding them into unrelated topics",()=>{
 const result=retrieveSermonSources({...base,question:"2:153"});expect(result.passages).toHaveLength(1);expect(result.passages[0].quranLocation).toEqual({surah:2,ayah:153});
});
