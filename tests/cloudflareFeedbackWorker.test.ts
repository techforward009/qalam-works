import { describe, expect, it, vi } from "vitest";
import worker from "../infra/cloudflare/feedback-mirror/src/index";

const origin="https://qalam-feedback-private-mirror.example.workers.dev";
const secret="long-random-worker-secret-for-test-only-2026";
const key="contact-inquiries/v1/1792670000000-12345678-1234-1234-1234-123456789abc.json";
function mockEnv() {
  const values=new Map<string,Uint8Array>();
  return {
    AUTH_TOKEN:secret,
    FEEDBACK_BUCKET:{
      get:vi.fn(async (name:string)=>{
        const v=values.get(name);
        return v?{size:v.byteLength,body:new Response(v).body!}:null;
      }),
      put:vi.fn(async (name:string,bytes:Uint8Array)=>{values.set(name,bytes);}),
      list:vi.fn(async ({prefix}:{prefix:string})=>({
        objects:[...values.keys()].filter(name=>name.startsWith(prefix)).map(key=>({key})),
        truncated:false
      }))
    }
  };
}
const request=(path:string,method="GET",authorized=true,body?:string) =>
  new Request(origin+path,{method,headers:{
    ...(authorized?{Authorization:"Bearer "+secret}:{}),
    ...(body?{"Content-Type":"application/json"}:{})
  },...(body?{body}:{})});

describe("Cloudflare private feedback Worker",()=>{
  it("requires the Worker secret on every read, write and listing",async()=>{
    const env=mockEnv();
    for(const method of ["GET","PUT"]){
      expect((await worker.fetch(request("/v1/objects/"+key,method,false,method==="PUT"?'{"type":"contact"}':undefined),env)).status).toBe(401);
    }
    expect((await worker.fetch(request("/v1/objects?prefix=contact-inquiries%2Fv1%2F","GET",false),env)).status).toBe(401);
    expect(env.FEEDBACK_BUCKET.get).not.toHaveBeenCalled();
    expect(env.FEEDBACK_BUCKET.put).not.toHaveBeenCalled();
  });
  it("persists exactly the original JSON bytes, reads back and lists private keys",async()=>{
    const env=mockEnv();
    const original='{"type":"contact","message":"سلام"}';
    const put=await worker.fetch(request("/v1/objects/"+key,"PUT",true,original),env);
    expect(put.status).toBe(201);
    const got=await worker.fetch(request("/v1/objects/"+key),env);
    expect(got.status).toBe(200);
    expect(await got.text()).toBe(original);
    expect(got.headers.get("Cache-Control")).toBe("private, no-store");
    const list=await worker.fetch(request("/v1/objects?prefix=contact-inquiries%2Fv1%2F"),env);
    expect((await list.json()).paths).toEqual([key]);
  });
  it("rejects invalid namespaces, oversized payloads and query-based bypasses",async()=>{
    const env=mockEnv();
    expect((await worker.fetch(request("/v1/objects/secret.txt","PUT",true,'{"a":1}'),env)).status).toBe(404);
    expect((await worker.fetch(request("/v1/objects/"+key+"?download=1"),env)).status).toBe(404);
    expect((await worker.fetch(request("/v1/objects?prefix=research%2Fv1%2F"),env)).status).toBe(400);
    expect((await worker.fetch(request("/v1/objects/"+key,"PUT",true,JSON.stringify({data:"x".repeat(8300)})),env)).status).toBe(413);
    expect(env.FEEDBACK_BUCKET.put).not.toHaveBeenCalled();
  });
});
