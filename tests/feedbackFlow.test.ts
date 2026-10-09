import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const store = new Map<string,string>();
vi.mock("../app/api/research/vercelResearchBlob",()=>({
 researchBlobClientFromEnv:async()=>({
  putObject:async(path:string,body:string)=>{store.set(path,body);},
  getObject:async(path:string)=>store.get(path)??null,
  listObjects:async(prefix:string)=>Array.from(store.keys()).filter(x=>x.startsWith(prefix)),
 })
}));
import { POST } from "../app/api/feedback/route";
import { GET } from "../app/api/feedback/report/route";

const adminSecret="this-is-a-test-only-admin-secret-123456";
const endpoint="https://example.test/api/feedback";
const submit=(body:unknown,origin="https://example.test")=>POST(new NextRequest(endpoint,{method:"POST",headers:{"origin":origin,"content-type":"application/json"},body:JSON.stringify(body)}));
const sample={tool:"khateeb-studio",rating:"partial",comment:"متن کا سائز بڑھائیں",page:"/tools/khateeb-studio"};

describe("feedback submit to private storage and report retrieval",()=>{
 beforeEach(()=>{store.clear();process.env.QALAM_FEEDBACK_ADMIN_SECRET=adminSecret;});
 afterEach(()=>{delete process.env.QALAM_FEEDBACK_ADMIN_SECRET;});
 it("writes only one private namespaced feedback record and reads it with admin auth",async()=>{
  const submitted=await submit(sample);
  expect(submitted.status).toBe(200);
  expect(await submitted.json()).toEqual({ok:true});
  const paths=[...store.keys()];
  expect(paths).toHaveLength(1);
  expect(paths[0]).toMatch(/^user-feedback\/v1\/khateeb-studio\/\d+-[\w-]+\.json$/);
  const stored=JSON.parse(store.get(paths[0])!);
  expect(stored).toMatchObject(sample);
  expect(stored.createdAt).toBeTruthy();
  const anonymous=await GET(new NextRequest("https://example.test/api/feedback/report"));
  expect(anonymous.status).toBe(401);
  const response=await GET(new NextRequest("https://example.test/api/feedback/report",{headers:{authorization:"Bearer "+adminSecret}}));
  expect(response.status).toBe(200);
  const report=await response.json();
  expect(report.total).toBe(1);
  expect(report.counts["khateeb-studio"]).toEqual({total:1,helpful:0,partial:1,notHelpful:0});
  expect(report.recent[0]).toMatchObject(sample);
 });
 it("rejects external origins and invalid payloads without writing",async()=>{
  expect((await submit(sample,"https://other.test")).status).toBe(403);
  expect((await submit({...sample,tool:"unknown"})).status).toBe(400);
  expect(store.size).toBe(0);
 });
});
