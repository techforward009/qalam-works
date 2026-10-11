import { expect, it } from "vitest";
import { assessSermonSpeakingTime } from "../app/lib/knowledge/sermonSpeakingTime";
import type { CustomSermonProject } from "../app/tools/khateeb-studio/engine/customSermonProject";

function sample(): Pick<CustomSermonProject,"sections"|"evidence"|"selectedEvidenceIds"> {
 const recite={id:"one",kind:"quran" as const,status:"verified" as const,titleUr:"آیت",titleEn:"Ayah",detailUr:"اللہ صبر والوں کے ساتھ ہے۔\nمترجم: آزمائش",detailEn:"",citationUr:"قرآن",citationEn:"",arabic:"إِنَّ اللَّهَ مَعَ الصَّابِرِينَ"};
 return {
  selectedEvidenceIds:["one","two","unused"],
  sections:[
   {id:"a",kind:"opening",headingUr:"تمہید",headingEn:"Opening",minutes:10,provenance:"editorial",evidenceIds:["one"],userText:"یہ ایک مختصر تمہید ہے۔\n\nحوالہ: قرآن ۲:۱۵۳"},
   {id:"b",kind:"closing",headingUr:"اختتام",headingEn:"Closing",minutes:10,provenance:"editorial",evidenceIds:["one","two"],userText:"یہ اختتامی گفتگو ہے۔\n\nحوالہ: قرآن ۲:۱۵۳\n\nحوالہ: قرآن ۱۰۳:۳"},
  ],
  evidence:[recite,{...recite,id:"two"},{...recite,id:"unused",arabic:"غیر مستعمل عربی"}]
 };
}
it("counts each cited original reading once without counting citation lines",()=>{
 const r=assessSermonSpeakingTime(sample());
 expect(r.distinctSourceRecords).toBe(2);
 expect(r.distinctReadings).toBe(1);
 expect(r.arabicWords).toBe(4);
 expect(r.translationWords).toBe(6);
 expect(r.sectionWords).toEqual([5,4]);
 expect(r.isEstimate).toBe(true);
 expect(r.estimatedMinutes).toBeLessThan(1);
});
it("measures prose and not the nominal minutes on section labels",()=>{
 const s=sample();
 const long=Array.from({length:1900},()=>"صبر").join(" ");
 const project={...s,sections:s.sections.map((section,i)=>i?section:{...section,userText:long})};
 const r=assessSermonSpeakingTime(project);
 expect(r.estimatedMinutes).toBeGreaterThan(18);
 expect(r.estimatedMinutes).toBeLessThan(22);
});
it("rejects invalid delivery speeds",()=>{
 expect(()=>assessSermonSpeakingTime(sample(),{urduWordsPerMinute:0})).toThrow("invalid-speaking-rates");
});
