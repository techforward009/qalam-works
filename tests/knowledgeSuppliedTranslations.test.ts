import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import bindings from "../app/lib/knowledge/suppliedTranslationBindings.json";
import { attachCorpusTranslations } from "../app/lib/knowledge/suppliedTranslations";
import { retrieveKnowledge, knowledgeResultText } from "../app/lib/knowledge/retrieval";
import { createBookExcerpt, type BookRecord, type BookSource } from "../app/lib/knowledge/bookCorpus";
import { createKnowledgeDraft } from "../app/tools/khateeb-studio/engine/knowledgeDraft";
import { serializeCustomSermonProject, parseCustomSermonProject, buildCustomSermonText } from "../app/tools/khateeb-studio/engine/customSermonProject";
const corpus=process.env.QALAM_BOOK_CORPUS_DIR;
const sources:BookSource[]=corpus?JSON.parse(readFileSync(`${corpus}/manifest.json`,"utf8")).sources:[];
const records:BookRecord[]=sources.flatMap(s=>JSON.parse(readFileSync(`${corpus}/${s.id}.json`,"utf8")));
const ask=(question:string,scope:"nahj"|"sahifa")=>retrieveKnowledge({question,scope,locale:"ur",sources,records,quran:[],quranSha256:""});
it("has unique edition-bound paragraph correspondences without private text",()=>{
 expect(bindings).toHaveLength(311);
 expect(new Set(bindings.map(b=>b.originalParagraphId)).size).toBe(bindings.length);
 for(const b of bindings){expect(b.originalRecordSha256).toMatch(/^[a-f0-9]{64}$/);expect(b.translationSourceSha256).toMatch(/^[a-f0-9]{64}$/);expect(b.canonicalNumber).toBeGreaterThan(0);}
});
it.runIf(Boolean(corpus))("attaches the actual supplied Urdu of canonical saying 55, preserving attribution and draft restore",()=>{
 const result=attachCorpusTranslations(ask("نہج البلاغہ حکمت 55","nahj"),records,sources,"ur");
 const p=result.passages.find(p=>p.language==="ar")!;
 expect(p.suppliedTranslation?.text).toBe("صبر دو طرح کا ہوتا ہے: ایک ناگوار باتوں پر صبر اور دوسرے پسندیدہ چیزوں سے صبر۔");
 expect(p.suppliedTranslation?.translator).toBe("علامہ مفتی جعفر حسین");
 expect(p.suppliedTranslation?.recordId).toBe("nahj-ur:saying:109");
 expect(knowledgeResultText(result,"ur")).toContain(p.suppliedTranslation!.text);
 const draft=createKnowledgeDraft(result,[p.id],"ur",30);
 expect(parseCustomSermonProject(serializeCustomSermonProject(draft))).toEqual(draft);
 expect(buildCustomSermonText(draft,"ur")).toContain(p.suppliedTranslation!.text);
});
it.runIf(Boolean(corpus))("pairs all four prayer 28 paragraphs while excluding commentary and invented translator names",()=>{
 const raw=ask("دعا 28","sahifa");
 const base=raw.passages.find(p=>p.language==="ar")!;
 const record=records.find(r=>r.id===base.recordId)!;const source=sources.find(s=>s.id===base.sourceId)!;
 const passages=bindings.filter(b=>b.originalRecordId===record.id).map(b=>{const paragraph=record.paragraphs.find(p=>p.id===b.originalParagraphId)!;const excerpt=createBookExcerpt(record,source,[paragraph.id]);return {...base,id:excerpt.id,paragraphId:paragraph.id,text:paragraph.text,excerpt};});
 const result=attachCorpusTranslations({...raw,passages},records,sources,"ur");
 const originals=result.passages.filter(p=>p.language==="ar"&&p.suppliedTranslation);
 expect(originals).toHaveLength(4);
 for(const p of originals){
  const t=p.suppliedTranslation!; const r=records.find(r=>r.id===t.recordId)!;
  expect(t.text).toBe(r.paragraphs.find(x=>x.id===t.paragraphIds![0])!.text);
  expect(t.paragraphIds![0]).not.toMatch(/:p(?:7|8|9|10)$/);
  expect(t.translator).toContain("مترجم کا نام درج نہیں");
 }
});
it.runIf(Boolean(corpus))("refuses changed editions, source text, record digests, and unsupported language",()=>{
 const raw=ask("نہج البلاغہ حکمت 55","nahj");
 const p=raw.passages.find(p=>p.language==="ar")!;
 const assertMissing=(rs:BookRecord[],ss:BookSource[],text?:string)=>{
  const result=attachCorpusTranslations({...raw,passages:[{...p,...(text?{text}:{})}]},rs,ss,"ur");
  expect(result.passages[0].suppliedTranslation).toBeUndefined();
 };
 assertMissing(records,sources.map(s=>s.id==="nahj-ur"?{...s,sha256:"f".repeat(64)}:s));
 assertMissing(records.map(r=>r.id==="nahj-ur:saying:109"?{...r,textSha256:"e".repeat(64)}:r),sources);
 assertMissing(records,sources,p.text+" changed");
 expect(attachCorpusTranslations(raw,records,sources,"en")).toBe(raw);
});
it.runIf(Boolean(corpus))("every binding points to existing canonical source and supplied translation paragraphs",()=>{
 const passages: ReturnType<typeof ask>["passages"]=[];
 for(const b of bindings){
  const a=records.find(r=>r.id===b.originalRecordId)!;const u=records.find(r=>r.id===b.translationRecordId)!;
  expect(a.textSha256).toBe(b.originalRecordSha256);expect(u.textSha256).toBe(b.translationRecordSha256);
  expect(a.paragraphs.some(p=>p.id===b.originalParagraphId&&p.text.length>0)).toBe(true);
  expect(u.paragraphs.some(p=>p.id===b.translationParagraphId&&p.text.length>0)).toBe(true);
  const source=sources.find(s=>s.id===a.sourceId)!;const paragraph=a.paragraphs.find(p=>p.id===b.originalParagraphId)!;const excerpt=createBookExcerpt(a,source,[paragraph.id]);
  passages.push({id:excerpt.id,collection:a.book,language:"ar",referenceUr:"اصل حوالہ",referenceEn:"Original",sourceSha256:source.sha256,sourceId:source.id,recordId:a.id,paragraphId:paragraph.id,text:paragraph.text,translator:null,excerpt});
 }
 const result=attachCorpusTranslations({question:"موضوع",status:"evidence",method:"lexical-bm25-topic-expansion",passages,expandedTerms:[],availableCollections:["nahj","sahifa"]},records,sources,"ur");
 expect(result.passages.filter(p=>p.suppliedTranslation)).toHaveLength(311);
});

it("includes reviewed complete prayer portions without fragmented sentences or commentary",()=>{
 const prayer=(n:number)=>bindings.filter(b=>b.originalSourceId==="sahifa-ar"&&b.canonicalNumber===n);
 expect(prayer(29).map(b=>b.translationParagraphId.split(":").at(-1))).toEqual(["p2","p3"]);
 expect(prayer(35)).toHaveLength(4);
 expect(prayer(31)).toHaveLength(20);
 expect(prayer(31).some(b=>/:p(?:18|19)$/.test(b.originalParagraphId))).toBe(false);
 expect(prayer(31).some(b=>Number(b.translationParagraphId.split(":p")[1])>=24)).toBe(false);
});

it.runIf(Boolean(corpus))("numbered prayer searches start with the prayer body and its supplied translation",()=>{
 for(const n of [29,31,35]){
  const result=attachCorpusTranslations(ask(`دعا ${n}`,"sahifa"),records,sources,"ur");
  const p=result.passages.find(p=>p.language==="ar")!;
  expect(p.paragraphId).toBe(`sahifa-ar:supplication:${n}:p3`);
  expect(p.suppliedTranslation?.paragraphIds).toEqual([`sahifa-ur:supplication:${n}:p2`]);
 }
 const result=attachCorpusTranslations(ask("دعا 28","sahifa"),records,sources,"ur");
 expect(result.passages.find(p=>p.language==="ar")?.suppliedTranslation).toBeDefined();
});

it.runIf(Boolean(corpus))("returns each short prayer body paragraph in canonical order within the result budget",()=>{
 for(const [n,first,count] of [[28,2,4],[29,3,2],[35,3,4]]){
  const result=attachCorpusTranslations(ask(`دعا ${n}`,"sahifa"),records,sources,"ur");
  const originals=result.passages.filter(p=>p.language==="ar");
  expect(originals.map(p=>p.paragraphId)).toEqual(Array.from({length:count},(_,i)=>`sahifa-ar:supplication:${n}:p${first+i}`));
  expect(originals.every(p=>p.suppliedTranslation)).toBe(true);
  expect(result.passages.length).toBeLessThanOrEqual(8);
 }
 const long=ask("دعا 31","sahifa");
 expect(long.passages.length).toBeLessThanOrEqual(8);
 expect(long.passages.filter(p=>p.language==="ar").length).toBeGreaterThan(1);
});
