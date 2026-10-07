import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { attachBookTranslations, prepareBookTranslation, saveBookTranslation } from "../app/lib/knowledge/bookTranslations";
import { createBookExcerpt, isBookExcerpt, bookExcerptText, type BookRecord, type BookSource } from "../app/lib/knowledge/bookCorpus";
import type { KnowledgeResult } from "../app/lib/knowledge/retrieval";
import type { ResearchBlobClient } from "../app/tools/research-studio/engine";
import { createKnowledgeDraft } from "../app/tools/khateeb-studio/engine/knowledgeDraft";
const source: BookSource = { id:"kafi-v1-ar",book:"kafi",language:"ar",filename:"original.docx",sha256:"a".repeat(64),translator:null };
const paragraphs=[{id:"kafi-v1-ar:chapter:1:p1",text:"1- قال أبو عبد الله ع: الحلم خير."},{id:"kafi-v1-ar:chapter:1:p2",text:"وهذا تمام الخبر."},{id:"kafi-v1-ar:chapter:1:p3",text:"2- حديث مستقل."}];
const originalText=paragraphs.slice(0,2).map(p=>p.text).join("\n");
const record: BookRecord={id:"kafi-v1-ar:chapter:1",sourceId:source.id,book:"kafi",language:"ar",kind:"chapter",number:1,title:"باب الحلم",paragraphs,textSha256:createHash("sha256").update(paragraphs.map(p=>p.text).join("\n")).digest("hex"),reference:{sourceId:source.id,section:"chapter",number:1,locator:"original",printPage:null}};
const input={sourceId:source.id,recordId:record.id,sourceSha256:source.sha256,paragraphIds:paragraphs.slice(0,2).map(p=>p.id),originalText,language:"ur",text:"بردباری بہتر ہے۔ یہ روایت کا باقی حصہ ہے۔",translator:"مترجم",translationSource:"فراہم کردہ ترجمہ، صفحہ 1",reviewed:true};
const excerpt=createBookExcerpt(record,source,input.paragraphIds);
const result:KnowledgeResult={question:"بردباری",status:"evidence",method:"lexical-bm25-topic-expansion",expandedTerms:[],availableCollections:["kafi"],passages:[{id:excerpt.id,collection:"kafi",language:"ar",referenceUr:"الکافی، جلد 1، باب الحلم، حدیث 1",referenceEn:"Al-Kafi",text:originalText,sourceSha256:source.sha256,sourceId:source.id,recordId:record.id,paragraphId:paragraphs[0].id,excerpt,translator:null}]};
it("binds reviewed translations to complete source units and rejects partial or changed sources",()=>{
 expect(prepareBookTranslation(input,record,source).originalTextSha256).toBe(createHash("sha256").update(originalText).digest("hex"));
 for(const changed of [{reviewed:false},{sourceSha256:"b".repeat(64)},{originalText:originalText+" altered"},{paragraphIds:[paragraphs[0].id],originalText:paragraphs[0].text},{translator:""},{translationSource:""}]) expect(()=>prepareBookTranslation({...input,...changed},record,source)).toThrow();
});
it("saves immutable history and attaches exact supplied text with attribution",async()=>{
 const storage=new Map<string,string>();
 const client={putObject:vi.fn(async(path:string,value:string)=>{storage.set(path,value);}),getObject:vi.fn(async(path:string)=>storage.get(path)??null)} as unknown as ResearchBlobClient;
 await saveBookTranslation(client,prepareBookTranslation(input,record,source));
 expect(storage.size).toBe(2);
 const attached=await attachBookTranslations(client,result,"ur");
 expect(attached.passages[0].text).toBe(originalText);
 expect(attached.passages[0].suppliedTranslation).toEqual({text:input.text,language:"ur",translator:input.translator,source:input.translationSource});
 const stale=await attachBookTranslations(client,{...result,passages:[{...result.passages[0],sourceSha256:"c".repeat(64)}]},"ur");
 expect(stale.passages[0].suppliedTranslation).toBeUndefined();
 const draft=createKnowledgeDraft(attached,[excerpt.id],"ur",30);
 expect(isBookExcerpt(draft.bookExcerpts![0])).toBe(true);
 const exported=bookExcerptText(draft.bookExcerpts![0],"ur");
 expect(exported).toContain(input.text);expect(exported).toContain(input.translationSource);
 expect(JSON.parse(JSON.stringify(draft)).bookExcerpts[0].suppliedTranslation.text).toBe(input.text);
});
it("preserves sources when translation storage is unavailable",async()=>{
 const client={getObject:vi.fn().mockRejectedValue(new Error("offline"))} as unknown as ResearchBlobClient;
 const unique={...result,passages:[{...result.passages[0],sourceSha256:"d".repeat(64)}]};
 expect((await attachBookTranslations(client,unique,"ur")).passages[0]).toBe(unique.passages[0]);
});
