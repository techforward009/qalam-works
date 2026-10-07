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

it("keeps commentary in translation editions out of primary sermon retrieval",()=>{
 const source={id:"sahifa-ur",book:"sahifa" as const,language:"ur" as const,filename:"edition.docx",sha256:"a".repeat(64),translator:null};
 const id="sahifa-ur:supplication:50";
 const record={id,sourceId:source.id,book:source.book,language:source.language,kind:"supplication",number:50,title:"دعا 50",reference:{sourceId:source.id,section:"supplication",number:50,locator:"test",printPage:null},textSha256:"b".repeat(64),paragraphs:[{id:id+":p1",text:"دعا کے بعد شرح میں صبر کے بارے میں دوسری عبارت نقل کی گئی ہے۔"}]};
 const result=retrieveSermonSources({...base,scope:"all",question:"صبر",sources:[source],records:[record]});
 expect(result.passages.length).toBeGreaterThan(0);
 expect(result.passages.some(p=>p.sourceId==="sahifa-ur")).toBe(false);
});
