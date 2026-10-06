import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import JSZip from "jszip";
import { BOOK_SOURCE_IDS, normalizeBookSearch, createBookExcerpt, searchBookRecords, isBookExcerpt, type BookRecord, type BookSource } from "../app/tools/khateeb-studio/engine/bookLibrary";
import { addCustomBookExcerpt, removeCustomBookExcerpt, createCustomSermonProject, updateCustomProjectBasics, applyResearchToCustomProject, parseCustomSermonProject, serializeCustomSermonProject, buildCustomSermonText } from "../app/tools/khateeb-studio/engine/customSermonProject";
import { buildCustomBackup, prepareCustomRestore } from "../app/tools/khateeb-studio/engine/customSermonStorage";
import { parseBookArchive, saveBookArchive, loadBookCatalog, loadBookSource, BOOK_POINTER_PATH } from "../app/api/khateeb/library/store";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function sourceFor(id = "sahifa-ar"): BookSource { return { id, book: id.startsWith("nahj") ? "nahj" : "sahifa", language: id.endsWith("ar") ? "ar" : id.endsWith("ur") ? "ur" : "en", filename: `${id}.docx`, sha256: "a".repeat(64), translator: null }; }
export function recordFor(source = sourceFor(), number = 28): BookRecord {
 const id = `${source.id}:supplication:${number}`; const texts = ["اَللّٰهُمَّ إِنِّي صَبْرٌ", "دعا اور امید", "حاشیہ — یہ شرح ہے"];
 return { id, sourceId: source.id, book: source.book, language: source.language, kind: "supplication", number, title: `دعا ${number}`, reference: { sourceId: source.id, section: "supplication", number, locator: "word/document.xml paragraph 100", printPage: null }, paragraphs: texts.map((text,i)=>({id:`${id}:p${i+1}`,text})), textSha256: hash(texts.join("\n")) };
}
const project = () => createCustomSermonProject({kind:"majlis",title:"دعا",objective:"امید",duration:30,ownMaterial:"میرے نوٹس"});
async function archive(corrupt = false) {
 const zip = new JSZip(); const sources = BOOK_SOURCE_IDS.map(id => sourceFor(id));
 zip.file("manifest.json", JSON.stringify({ format:"qalam-foundational-corpus",version:1,sources,recordCount:sources.length }));
 for(const s of sources) { const r=recordFor(s); if(corrupt && s.id === "sahifa-ar") r.paragraphs[0].text="changed"; zip.file(`${s.id}.json.gz`,gzipSync(JSON.stringify([r]))); }
 return new Uint8Array(await zip.generateAsync({type:"nodebuffer"}));
}
describe("source-preserving book search and sermon snapshots",()=>{
 it("normalizes marks, Urdu/Arabic variants and numerals only for search",()=>{
  const r=recordFor(); const before=JSON.stringify(r);
  expect(normalizeBookSearch("صَبْرٌ ۲۸ ک ی")).toBe("صبر 28 ك ي");
  expect(searchBookRecords([r],{query:"اللهم صبر",number:"۲۸"}).total).toBe(1);
  expect(searchBookRecords([r],{query:"صبر غائب"}).total).toBe(0);
  expect(JSON.stringify(r)).toBe(before);
 });
 it("filters source editions and paginates without translating numbers",()=>{
  const records=Array.from({length:45},(_,i)=>recordFor(sourceFor(),i+1));
  expect(searchBookRecords(records,{page:2}).hits[0].number).toBe(21);
  expect(searchBookRecords(records,{sourceId:"sahifa-en"}).total).toBe(0);
  expect(searchBookRecords(records,{language:"en"}).total).toBe(0);
 });
 it("stores selected paragraphs in source order, including commentary and exact text",()=>{
  const r=recordFor();const excerpt=createBookExcerpt(r,sourceFor(),[r.paragraphs[2].id,r.paragraphs[0].id]);
  expect(excerpt.paragraphNumbers).toEqual([1,3]);expect(excerpt.paragraphs[1].text).toContain("شرح");expect(isBookExcerpt(excerpt)).toBe(true);
  expect(()=>createBookExcerpt(r,sourceFor("sahifa-en"),[r.paragraphs[0].id])).toThrow();
  expect(()=>createBookExcerpt(r,sourceFor(),["unknown"])).toThrow();
 });
 it("preserves excerpts and personal notes through duration changes, research, backup, and reload",()=>{
  const r=recordFor(); const excerpt=createBookExcerpt(r,sourceFor(),[r.paragraphs[0].id,r.paragraphs[2].id]);
  let p=addCustomBookExcerpt(project(),excerpt);expect(addCustomBookExcerpt(p,excerpt)).toBe(p);
  p=updateCustomProjectBasics(p,{duration:45});
  p=applyResearchToCustomProject(p,{evidence:[]} as any);
  expect(p.ownMaterial).toBe("میرے نوٹس");expect(p.bookExcerpts).toEqual([excerpt]);
  expect(parseCustomSermonProject(serializeCustomSermonProject(p))?.bookExcerpts).toEqual([excerpt]);
  expect(prepareCustomRestore(buildCustomBackup([p]),[]).projects[0].bookExcerpts).toEqual([excerpt]);
  for(const locale of ["ur","en"] as const) {const text=buildCustomSermonText(p,locale);expect(text).toContain(r.paragraphs[0].text);expect(text).toContain(r.paragraphs[2].text);expect(text).not.toContain(r.paragraphs[1].text);expect(text).not.toContain("word/document.xml");expect(text).not.toContain(".docx");}
  const revisedSource = { ...sourceFor(), sha256: "b".repeat(64) };
  const revisedExcerpt = createBookExcerpt(r,revisedSource,[r.paragraphs[0].id,r.paragraphs[2].id]);
  expect(addCustomBookExcerpt(p,revisedExcerpt).bookExcerpts).toHaveLength(2);
  expect(buildCustomSermonText(p,"en")).toContain("[…]");
  expect(removeCustomBookExcerpt(p,excerpt.id).bookExcerpts).toEqual([]);
 });
 it("accepts old backups and rejects corrupt excerpt snapshots atomically",()=>{
  expect(parseCustomSermonProject(serializeCustomSermonProject(project()))).not.toBeNull();
  const r=recordFor(); const p=addCustomBookExcerpt(project(),createBookExcerpt(r,sourceFor(),[r.paragraphs[0].id]));
  const malformed={...p,bookExcerpts:[{...p.bookExcerpts![0],paragraphNumbers:[99]}]};
  expect(parseCustomSermonProject(JSON.stringify(malformed))).toBeNull();expect(()=>prepareCustomRestore(buildCustomBackup([malformed]),[])).toThrow();
 });
});
describe("private corpus ingestion and durable version activation",()=>{
 it("round trips all sources with compression and refuses modified source paragraphs",async()=>{
  const parsed=await parseBookArchive(await archive());
  const objects=new Map<string,string>(); const client={putObject:async(p:string,b:string)=>{objects.set(p,b)},getObject:async(p:string)=>objects.get(p)??null,listObjects:async()=>[]};
  await saveBookArchive(client,parsed); const catalog=(await loadBookCatalog(client))!;
  expect(catalog.manifest.recordCount).toBe(7); expect(JSON.parse(objects.get(catalog.paths['sahifa-ar'])!).encoding).toBe('gzip-base64');
  expect(await loadBookSource(client,catalog,'sahifa-ar')).toEqual(parsed.records['sahifa-ar']);
  await expect(parseBookArchive(await archive(true))).rejects.toThrow("invalid-record");
 });
 it("keeps the old active pointer after an interrupted replacement",async()=>{
  const parsed=await parseBookArchive(await archive()); const objects=new Map([[BOOK_POINTER_PATH,'old pointer']]);
  const client={putObject:async(p:string,b:string)=>{if(p.endsWith('/sahifa-ar.json'))throw Error('quota');objects.set(p,b)},getObject:async(p:string)=>objects.get(p)??null,listObjects:async()=>[]};
  await expect(saveBookArchive(client,parsed)).rejects.toThrow();expect(objects.get(BOOK_POINTER_PATH)).toBe('old pointer');
 });
 it("refuses empty, missing, oversized and malformed archive input",async()=>{
  await expect(parseBookArchive(new Uint8Array())).rejects.toThrow();
  await expect(parseBookArchive(new Uint8Array(4*1024*1024+1))).rejects.toThrow();
  const zip=new JSZip();zip.file('wrong.json','{}');await expect(parseBookArchive(await zip.generateAsync({type:'uint8array'}))).rejects.toThrow('missing-manifest');
 });
});
