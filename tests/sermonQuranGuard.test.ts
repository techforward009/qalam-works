import { expect,it,vi } from "vitest";
import { verifyCanonicalSermonQuran } from "../app/lib/knowledge/sermonQuranGuard";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { completeQuranTranslationFor } from "../app/lib/knowledge/completeQuranTranslations";
import { QURAN_TRANSLATION_SOURCES } from "../app/tools/khateeb-studio/engine/quranTranslationProvider";
import { composeSermon } from "../app/lib/knowledge/sermonComposer";
import type { AnswerEvidence } from "../app/lib/knowledge/researchAnswer";
import type { KnowledgeResult } from "../app/lib/knowledge/retrieval";
const canon=ahmedgrafQuranReference.listAyahs();
const sha=ahmedgrafQuranReference.getMetadata().sourceSha256!;
function verse(surah:number,ayah:number){
 const original=canon.find(a=>a.surah===surah&&a.ayah===ayah)!;
 const translated=completeQuranTranslationFor(surah,ayah,"ur")!;
 return {id:"quran:"+surah+":"+ayah,collection:"quran" as const,
  language:"ar" as const,referenceUr:"قرآن "+surah+":"+ayah,
  referenceEn:"Quran "+surah+":"+ayah,quranLocation:{surah,ayah},
  sourceSha256:sha,translator:null,text:original.text,
  suppliedTranslation:{language:"ur" as const,translator:QURAN_TRANSLATION_SOURCES.ur.translatorUr,text:translated}};
}
const q=[verse(2,153),verse(103,3)];
const evidence=q.map((p,i)=>({ref:i+1,passage:p})) as AnswerEvidence[];
it("accepts exact Ahmedgraf Indo-Pak Arabic and canonical named Urdu translations",()=>{
 expect(verifyCanonicalSermonQuran(evidence,"ur")).toMatchObject({verifiedAyahs:2});
});
it("refuses any changed Arabic glyph, wrong digest, wrong translator or altered Urdu",()=>{
 const substitutions=[
  {...q[0],text:q[0].text+"۝"},
  {...q[0],sourceSha256:"0".repeat(64)},
  {...q[0],suppliedTranslation:{...q[0].suppliedTranslation,translator:"دیگر مترجم"}},
  {...q[0],suppliedTranslation:{...q[0].suppliedTranslation,text:q[0].suppliedTranslation.text+" اضافہ"}},
  {...q[0],quranLocation:{surah:2,ayah:154}},
 ];
 for(const passage of substitutions){
  expect(()=>verifyCanonicalSermonQuran([{ref:1,passage}],"ur")).toThrow("sermon-quran-mismatch");
 }
 expect(()=>verifyCanonicalSermonQuran([evidence[0],evidence[0]],"ur")).toThrow("sermon-quran-mismatch");
});
it("rejects altered Quran before initiating ANY sermon model generation or independent review",async()=>{
 const fake={...q[0],text:q[0].text+" غلط اضافہ"};
 const book={id:"nahj:test:55",collection:"nahj" as const,language:"ar" as const,referenceUr:"نہج البلاغہ ۵۵",
   referenceEn:"Nahj 55",text:"الصَّبْرُ صَبْرَانِ",sourceSha256:"b".repeat(64),translator:null,
   recordId:"nahj:55",suppliedTranslation:{text:"صبر کی دو قسمیں ہیں۔",language:"ur" as const,translator:"فراہم کردہ ترجمہ"}};
 const result:KnowledgeResult={status:"evidence",question:"صبر",method:"lexical-bm25-topic-expansion",
  expandedTerms:[],availableCollections:["quran","nahj"],passages:[fake,q[1],book]};
 const generate=vi.fn();
 const reviewer={id:"mock",draft:vi.fn(),review:vi.fn()};
 await expect(composeSermon({title:"صبر",duration:20,locale:"ur"},result,{
  env:{},generate,reviewer,requireCanonicalQuran:true
 })).rejects.toThrow("sermon-quran-mismatch");
 expect(generate).not.toHaveBeenCalled();
 expect(reviewer.review).not.toHaveBeenCalled();
});
