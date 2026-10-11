import {expect,it} from "vitest";
import {applyPassageRanking,rankKnowledgePassages} from "../app/lib/knowledge/passageRanking";
import type {KnowledgePassage,KnowledgeResult} from "../app/lib/knowledge/retrieval";
const quran=Array.from({length:8},(_,i)=>({
 id:"quran:"+i,collection:"quran",language:"ar",text:"الصبر",referenceUr:"قرآن",referenceEn:"Quran",sourceSha256:"a".repeat(64),translator:null
} as KnowledgePassage));
const nahj={id:"nahj:patience",collection:"nahj",language:"ar",text:"الصبر صبران",referenceUr:"نہج البلاغہ، حکمت ۵۵",referenceEn:"Nahj al-Balagha saying 55",sourceSha256:"b".repeat(64),translator:null} as KnowledgePassage;
it("reserves one relevant non-Quran original inside the eight-passage reranked limit",()=>{
 const passages=[...quran,nahj];
 const ranking=passages.map((_,i)=>({ref:i+1,relevance:i===8?2:3}));
 expect(applyPassageRanking(passages,ranking).some(p=>p.collection==="nahj")).toBe(false);
 const chosen=applyPassageRanking(passages,ranking,true);
 expect(chosen).toHaveLength(8);
 expect(chosen[7].id).toBe(nahj.id);
 expect(new Set(chosen.map(x=>x.id)).size).toBe(8);
 expect(passages).toHaveLength(9);
});
it("does not force an irrelevant non-Quran passage into a sourced sermon",()=>{
 const passages=[...quran,nahj];
 const ranking=passages.map((_,i)=>({ref:i+1,relevance:i===8?1:3}));
 expect(applyPassageRanking(passages,ranking,true).some(p=>p.collection==="nahj")).toBe(false);
});
it("preserves book coverage in sermon-only lexical fallback",async()=>{
 const result:KnowledgeResult={
  question:"صبر",method:"lexical-bm25-topic-expansion",status:"evidence",
  passages:[...quran,nahj],expandedTerms:[],availableCollections:["quran","nahj"]
 };
 const sermon=await rankKnowledgePassages(result,{caller:"staged-sermon",preserveNonQuran:true});
 expect(sermon.passages).toHaveLength(8);
 expect(sermon.passages.some(p=>p.collection==="nahj")).toBe(true);
 const general=await rankKnowledgePassages(result,{caller:"normal-search"});
 expect(general.passages.some(p=>p.collection==="nahj")).toBe(false);
});
