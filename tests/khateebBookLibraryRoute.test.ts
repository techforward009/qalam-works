import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { clearBookSourceCache } from "../app/api/khateeb/library/sourceCache";
import { GET, POST } from "../app/api/khateeb/library/route";
import { createSessionToken } from "../app/api/research/auth/session";
import { setResearchBlobClientForTests } from "../app/api/research/vercelResearchBlob";
import { BOOK_SOURCE_IDS } from "../app/tools/khateeb-studio/engine/bookLibrary";
import { parseBookArchive, BOOK_POINTER_PATH } from "../app/api/khateeb/library/store";
const objects=new Map<string,string>();let reads=0;
const client={putObject:async(p:string,b:string)=>{objects.set(p,b)},getObject:async(p:string)=>{reads++;return objects.get(p)??null},listObjects:async()=>[]};
const secret="test-session-secret-at-least-32-characters-long";
const cookie=()=>`qalam_research_session=${createSessionToken(secret)}`;
const request=(suffix="", authenticated=false)=>new NextRequest(`http://localhost:3000/api/khateeb/library${suffix}`,{headers:authenticated?{cookie:cookie()}:{}});
beforeEach(()=>{vi.stubEnv('QALAM_RESEARCH_ACCESS_PASSWORD','private-test');vi.stubEnv('QALAM_RESEARCH_SESSION_SECRET',secret);objects.clear();reads=0;clearBookSourceCache();setResearchBlobClientForTests(client)});
afterEach(()=>{setResearchBlobClientForTests(null);vi.unstubAllEnvs()});
async function fixture(){
 const zip=new JSZip();const sources=BOOK_SOURCE_IDS.map(id=>({id,book:id.startsWith('nahj')?'nahj':'sahifa',language:id.endsWith('ar')?'ar':id.endsWith('ur')?'ur':'en',filename:`${id}.docx`,sha256:'a'.repeat(64),translator:null}));
 zip.file('manifest.json',JSON.stringify({format:'qalam-foundational-corpus',version:1,sources,recordCount:7}));
 for(const s of sources){const id=`${s.id}:supplication:28`;const text='صَبْرٌ امید';zip.file(`${s.id}.json.gz`,gzipSync(JSON.stringify([{id,sourceId:s.id,book:s.book,language:s.language,kind:'supplication',number:28,title:'دعا 28',reference:{sourceId:s.id,section:'supplication',number:28,locator:'word/document.xml paragraph 3',printPage:null},paragraphs:[{id:`${id}:p1`,text}],textSha256:createHash('sha256').update(text).digest('hex')}])))}
 return await zip.generateAsync({type:'nodebuffer'});
}
async function upload(bytes:Uint8Array, origin='http://localhost:3000'){
 const form=new FormData();form.set('archive',new File([Buffer.from(bytes)],'corpus.zip',{type:'application/zip'}));
 return POST(new NextRequest('http://localhost:3000/api/khateeb/library',{method:'POST',headers:{cookie:cookie(),origin},body:form}));
}
it('allows public catalog reads while denying unauthenticated uploads before touching storage',async()=>{
 expect((await GET(request('',false))).status).toBe(200);
 expect(reads).toBe(1);reads=0;
 expect((await POST(new NextRequest('http://localhost:3000/api/khateeb/library',{method:'POST',body:'anything'}))).status).toBe(401);expect(reads).toBe(0);expect(objects.size).toBe(0);
});
it('catalog, validated upload, source-specific search and full passage survive new requests',async()=>{
 expect(await (await GET(request())).json()).toMatchObject({ready:false});
 const imported=await upload(await fixture());expect(imported.status).toBe(200);expect(await imported.json()).toMatchObject({recordCount:7});
 expect(await (await GET(request())).json()).toMatchObject({ready:true,recordCount:7});
 const response=await GET(request('?op=search&sourceId=sahifa-ar&query=صبر&number=۲۸'));
 expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(await response.json()).toMatchObject({total:1,hits:[{sourceId:'sahifa-ar',number:28}]});
 const detail=await GET(request('?op=record&sourceId=sahifa-ar&id=sahifa-ar:supplication:28'));expect(await detail.json()).toMatchObject({record:{paragraphs:[{text:'صَبْرٌ امید'}],reference:{printPage:null}}});
 expect((await GET(request('?op=record&sourceId=sahifa-en&id=sahifa-ar:supplication:28'))).status).toBe(404);
});
it('rejects invalid filters, cross-origin imports, malformed archives and preserves active data',async()=>{
 await upload(await fixture());const old=objects.get(BOOK_POINTER_PATH);
 expect((await GET(request('?op=search&sourceId=../../private'))).status).toBe(400);
 expect((await GET(request('?op=search&page=NaN'))).status).toBe(400);
 expect((await upload(await fixture(),'https://foreign.invalid')).status).toBe(400);
 expect((await upload(new Uint8Array([1,2,3]))).status).toBe(400);expect(objects.get(BOOK_POINTER_PATH)).toBe(old);
});
it.runIf(Boolean(process.env.QALAM_BOOK_CORPUS_TEST_ZIP))('imports the actual seven-source corpus and retrieves complete Arabic and Urdu dua 28',async()=>{
 const bytes=await readFile(process.env.QALAM_BOOK_CORPUS_TEST_ZIP!);const parsed=await parseBookArchive(bytes);const response=await upload(bytes);expect(response.status).toBe(200);expect(await response.json()).toMatchObject({recordCount:2676});
 for(const id of ['sahifa-ar','sahifa-ur']){const result=await GET(request(`?op=record&sourceId=${id}&id=${id}:supplication:28`));const body=await result.json();expect(body.record.number).toBe(28);expect(body.record).toEqual(parsed.records[id].find(r=>r.number===28));expect(body.record.reference.printPage).toBeNull();}
});

it.runIf(Boolean(process.env.QALAM_BOOK_CORPUS_TEST_ZIP))('public curated patience uses all six verified Arabic and translated passages and rejects arbitrary topics',async()=>{
 await upload(await readFile(process.env.QALAM_BOOK_CORPUS_TEST_ZIP!));
 for (const language of ['ur','en']) {
  const response=await GET(request(`?op=topic&topicId=patience&language=${language}`));
  expect(response.status).toBe(200);const data=await response.json();expect(data.unavailable).toBe(0);expect(data.materials).toHaveLength(12);
  expect(new Set(data.materials.map((m:{angleId:string})=>m.angleId)).size).toBe(6);
  const meaning=data.materials.find((m:{angleId:string;excerpt:{language:string}})=>m.angleId==='meaning'&&m.excerpt.language==='ar');
  expect(meaning.excerpt.referenceLabelUr).toContain('حکمت 55');expect(meaning.excerpt.referenceLabelUr).toContain('109');expect(meaning.excerpt.paragraphNumbers).toEqual([2]);
  const hope=data.materials.find((m:{angleId:string;excerpt:{language:string}})=>m.angleId==='hope'&&m.excerpt.language===language);expect(hope.excerpt.recordId).toBe(`sahifa-${language}:supplication:28`);
 }
 expect((await GET(request('?op=topic&topicId=other'))).status).toBe(400);
 expect((await GET(request('?op=topic&topicId=patience&language=ar'))).status).toBe(400);
});
it('skips mismatched editions instead of fabricating curated quotations',async()=>{
 await upload(await fixture());const data=await (await GET(request('?op=topic&topicId=patience&language=ur'))).json();expect(data.materials).toEqual([]);expect(data.unavailable).toBe(12);
});
