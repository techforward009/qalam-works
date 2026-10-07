import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/knowledge/translations/route";
import { setResearchBlobClientForTests } from "../app/api/research/vercelResearchBlob";
import { useTestResearchAuth, clearTestResearchAuth, testResearchSessionCookie } from "./research/researchAuthFixture";
const objects=new Map<string,string>();
const getObject=vi.fn(async(path:string)=>objects.get(path)??null);
beforeEach(()=>{useTestResearchAuth();objects.clear();getObject.mockClear();setResearchBlobClientForTests({getObject,putObject:async(path,value)=>{objects.set(path,value);},listObjects:async()=>[]});});
afterEach(()=>{clearTestResearchAuth();setResearchBlobClientForTests(null);});
it("rejects unauthenticated and cross-origin translation writes before reading storage",async()=>{
 const body=JSON.stringify({text:"ترجمہ"});
 expect((await POST(new NextRequest("http://localhost:3000/api/knowledge/translations",{method:"POST",body}))).status).toBe(401);
 expect((await POST(new NextRequest("http://localhost:3000/api/knowledge/translations",{method:"POST",body,headers:{cookie:testResearchSessionCookie(),origin:"https://other.invalid"}}))).status).toBe(400);
 expect(getObject).not.toHaveBeenCalled();
});
it("bounds the actual request stream and rejects malformed data",async()=>{
 for(const body of ['not-json','x'.repeat(512001)]) expect((await POST(new NextRequest("http://localhost:3000/api/knowledge/translations",{method:"POST",body,headers:{cookie:testResearchSessionCookie()}}))).status).toBe(400);
 expect(getObject).not.toHaveBeenCalled();
});

it.runIf(Boolean(process.env.QALAM_BOOK_CORPUS_TEST_ZIP))('saves through authenticated API and rejects stale original text',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {parseBookArchive,saveBookArchive}=await import('../app/lib/knowledge/store');
 const {bookSearchUnits}=await import('../app/lib/knowledge/sourceUnits');
 const archive=await parseBookArchive(await readFile(process.env.QALAM_BOOK_CORPUS_TEST_ZIP!));
 const client={getObject,putObject:async(path:string,value:string)=>{objects.set(path,value);},listObjects:async()=>[]};
 await saveBookArchive(client,archive);
 const source=archive.manifest.sources.find(s=>s.book==='nahj'&&s.language==='ar')!;
 const record=archive.records[source.id].find(r=>bookSearchUnits(r).some(u=>u.text.length>20))!;
 const unit=bookSearchUnits(record).find(u=>u.text.length>20)!;
 const input={sourceId:source.id,recordId:record.id,sourceSha256:source.sha256,paragraphIds:unit.paragraphs.map(p=>p.id),originalText:unit.text,language:'ur',text:'آزمائشی ترجمہ',translator:'آزمائشی مترجم',translationSource:'آزمائش کا نسخہ',reviewed:true};
 const req=(body:unknown)=>new NextRequest('http://localhost:3000/api/knowledge/translations',{method:'POST',headers:{cookie:testResearchSessionCookie()},body:JSON.stringify(body)});
 const saved=await POST(req(input));expect(saved.status).toBe(200);expect((await saved.json()).translation.text).toBe(input.text);
 const writes=[...objects.keys()].filter(k=>k.startsWith('khateeb-translations/'));expect(writes).toHaveLength(2);
 expect((await POST(req({...input,originalText:'changed original'}))).status).toBe(409);
 expect([...objects.keys()].filter(k=>k.startsWith('khateeb-translations/'))).toHaveLength(2);
});
