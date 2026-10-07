import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { planKnowledgeQuery } from '../app/lib/knowledge/searchConcepts';
import { bookSearchUnits } from '../app/lib/knowledge/sourceUnits';
import { retrieveKnowledge } from '../app/lib/knowledge/retrieval';
import type { BookRecord, BookSource } from '../app/lib/knowledge/bookCorpus';
const source: BookSource = {id:'kafi-v6-ar',book:'kafi',language:'ar',filename:'source.docx',sha256:'a'.repeat(64),translator:null};
const record: BookRecord = {id:'chapter',sourceId:source.id,book:'kafi',language:'ar',kind:'chapter',number:1,title:'باب الرفق بالولد',reference:{sourceId:source.id,section:'chapter',number:1,locator:'original',printPage:null,kafi:{volume:6,bookTitle:'كتاب العقيقة',chapterTitle:'باب الرفق بالولد',sectionTitle:null,sourceParagraphs:[1,2,3,4]}},paragraphs:[{id:'p1',text:'1- قال في شأن الولد كلاما طويلا محفوظا في المصدر'},{id:'p2',text:'ومن تمام الخبر الرفق بالولد والرحمة به.'},{id:'p3',text:'2- هذا حديث آخر عن فضل الولد ولا يضم الحديث السابق.'}],textSha256:'b'.repeat(64)};
const ask=(question:string)=>retrieveKnowledge({question,scope:'kafi',locale:'ur',records:[record],sources:[source],quran:[],quranSha256:''});
it('recognizes natural Urdu phrases and Roman Urdu without literal Arabic in the question',()=>{
 expect(planKnowledgeQuery('ماں باپ کی خدمت کیسے کریں؟').topics.map(t=>t.id)).toEqual(expect.arrayContaining(['parents','service']));
 expect(planKnowledgeQuery('bachon').topics.map(t=>t.id)).toContain('children');
 expect(planKnowledgeQuery('walidain aur tarbiyat').topics.map(t=>t.id)).toEqual(expect.arrayContaining(['parents','upbringing']));
 expect(planKnowledgeQuery('بچوں کے ساتھ نرمی کیسے کریں؟').topics.map(t=>t.id)).toEqual(expect.arrayContaining(['children','kindness']));
});
it('finds an Arabic concept in a continuation and returns the whole numbered hadith',()=>{
 const result=ask('نرمی');
 expect(result.passages).toHaveLength(1);
 expect(result.passages[0].text).toBe(record.paragraphs.slice(0,2).map(p=>p.text).join('\n'));
 expect(result.passages[0].paragraphId).toBe('p1');
 expect(result.passages[0].referenceUr).toContain('حدیث 1');
 expect(result.passages[0].excerpt?.paragraphs.map(p=>p.id)).toEqual(['p1','p2']);
});
it('keeps quotation searches strict but attaches a matching continuation to its original number',()=>{
 expect(ask('"الرفق بالولد"').passages[0].text).toContain('1- قال');
 expect(ask('"عبارة غير موجودة"').status).toBe('not-found');
 expect(ask('جلد 6 حدیث 2').passages[0].text).toBe(record.paragraphs[2].text);
});
it('does not cross a chapter heading or mutate source paragraphs',()=>{
 const before=JSON.stringify(record);
 const withHeading={...record,paragraphs:[...record.paragraphs.slice(0,2),{id:'heading',text:'باب الرفق بالولد'},{id:'new',text:'هذا كلام مستقل بعد عنوان الباب.'}]};
 expect(bookSearchUnits(withHeading)[0].paragraphs).toHaveLength(2);
 expect(JSON.stringify(record)).toBe(before);
});
const corpus=process.env.QALAM_BOOK_CORPUS_DIR;
it.runIf(Boolean(corpus))('retrieves new concept questions against the full imported corpus with verifiable units',()=>{
 const manifest=JSON.parse(readFileSync(`${corpus}/manifest.json`,'utf8'));
 const sources:BookSource[]=manifest.sources;
 const records:BookRecord[]=sources.flatMap(s=>JSON.parse(readFileSync(`${corpus}/${s.id}.json`,'utf8')));
 for(const question of ['نرمی','تکبر','حسد','پڑوسی','صلۂ رحمی','سخاوت','بچوں کی تربیت']){
  const result=retrieveKnowledge({question,scope:'all',locale:'ur',sources,records,quran:[],quranSha256:''});
  expect(result.status,question).toBe('evidence');
  for(const p of result.passages){
   const r=records.find(r=>r.id===p.recordId)!;
   expect(p.excerpt?.paragraphs.every(x=>r.paragraphs.some(y=>x.id===y.id&&x.text===y.text))).toBe(true);
   expect(p.text).toBe(p.excerpt!.paragraphs.map(x=>x.text).join('\n'));
  }
 }
},30000);

it.runIf(Boolean(corpus))('retrieves source-bound evidence from interpreted colloquial questions',()=>{
 const manifest=JSON.parse(readFileSync(`${corpus}/manifest.json`,'utf8'));
 const sources:BookSource[]=manifest.sources;
 const records:BookRecord[]=sources.flatMap(s=>JSON.parse(readFileSync(`${corpus}/${s.id}.json`,'utf8')));
 for(const [question,inferredTopicIds] of [['بچہ بات نہیں مانتا',['children','upbringing']],['فوراً جواب دے کر بعد میں پچھتاتا ہوں',['anger','self-restraint']]] as const){
  const result=retrieveKnowledge({question,inferredTopicIds,scope:'kafi',locale:'ur',sources,records,quran:[],quranSha256:''});
  expect(result.status,question).toBe('evidence');
  for(const p of result.passages){
   const r=records.find(r=>r.id===p.recordId)!;
   expect(p.excerpt?.paragraphs.every(x=>r.paragraphs.some(y=>x.id===y.id&&x.text===y.text))).toBe(true);
  }
 }
},30000);

it('offers separate complete narrations from one chapter for relevance selection',()=>{
 const result=retrieveKnowledge({question:'اولاد',candidateLimit:16,scope:'kafi',locale:'ur',records:[record],sources:[source],quran:[],quranSha256:''});
 expect(result.passages).toHaveLength(2);
 expect(result.passages.map(p=>p.paragraphId)).toEqual(expect.arrayContaining(['p1','p3']));
 expect(result.passages.find(p=>p.paragraphId==='p1')?.text).toContain('ومن تمام الخبر');
});
