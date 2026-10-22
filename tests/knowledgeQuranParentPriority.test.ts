import { describe, expect, it } from "vitest";
import { digitalKhattKnowledgeAyahs, DIGITAL_KHATT_KNOWLEDGE_SHA256 } from "../app/lib/knowledge/digitalKhattKnowledge";
import { parentRespectQuranGuidanceStrength, isParentRespectVerseContinuation } from "../app/lib/knowledge/knowledgeRelevance";
import { retrieveKnowledge } from "../app/lib/knowledge/retrieval";

const ayahs = digitalKhattKnowledgeAyahs("ur");
const find=(surah:number,ayah:number)=>ayahs.find(a=>a.surah===surah&&a.ayah===ayah)!;
describe("parental respect: meaningful Quran references outrank mere keyword frequency",()=>{
  it("recognizes direct speech/behavior instructions and linked 17:24 without fabricated text",()=>{
    const main = find(17,23), next=find(17,24), gratitude=find(31,14);
    expect(main.text).toBeTruthy();
    expect(next.text).toBeTruthy();
    expect(parentRespectQuranGuidanceStrength(main.text)).toBeGreaterThan(parentRespectQuranGuidanceStrength(gratitude.text));
    expect(parentRespectQuranGuidanceStrength(next.text)).toBeGreaterThan(parentRespectQuranGuidanceStrength(gratitude.text));
    expect(isParentRespectVerseContinuation(next.text, main.text)).toBe(true);
    expect(isParentRespectVerseContinuation(next.text, undefined)).toBe(false);
    expect(isParentRespectVerseContinuation(find(31,33).text,find(31,32).text)).toBe(false);
  });
  it("retrieves strongest complete Quran commands first from the real 6236-verse Digital Khatt corpus",()=>{
    const result=retrieveKnowledge({question:"والدین کا احترام",scope:"quran",locale:"ur",candidateLimit:8,
      records:[],sources:[],quran:ayahs,quranSha256:DIGITAL_KHATT_KNOWLEDGE_SHA256});
    const loc=result.passages.map(p=>p.quranLocation);
    expect(result.status).toBe("evidence");
    expect(loc.slice(0,2)).toEqual([{surah:17,ayah:23},{surah:17,ayah:24}]);
    expect(loc).toContainEqual({surah:31,ayah:14});
    expect(loc).not.toContainEqual({surah:31,ayah:33});
    for(const p of result.passages){
      expect(p.text).toBe(find(p.quranLocation!.surah,p.quranLocation!.ayah).text);
      expect(p.quranEdition).toBe("digital-khatt");
      expect(p.sourceSha256).toBe(DIGITAL_KHATT_KNOWLEDGE_SHA256);
    }
  });
  it("honors an explicit verse reference instead of applying parental-topic ranking",()=>{
    const quran=[find(17,23),find(17,24),find(31,14)];
    const result=retrieveKnowledge({question:"قرآن 31:14",scope:"quran",locale:"ur",records:[],sources:[],quran,quranSha256:DIGITAL_KHATT_KNOWLEDGE_SHA256});
    expect(result.passages.map(p=>p.quranLocation)).toEqual([{surah:31,ayah:14}]);
  });
});
