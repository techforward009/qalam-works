import { describe, expect, it, vi } from "vitest";
import worker from "../infra/cloudflare/tafsir-mirror/src/index";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const base = "https://tafsir-mirror.example.workers.dev";
const token = "private-sample-token";
const env = () => {
  const get = vi.fn(async (key:string) => ({
    size:key==="manifest-v1.json"?100:200,
    body:new Response(new Uint8Array([1,2,3])).body!,
  }));
  return {AUTH_TOKEN:token,TAFSIR_BUCKET:{get}};
};
const request = (path:string,auth = "Bearer "+token) =>
  new Request(base+path,{headers:{authorization:auth}});

describe("V10 private R2 surah shard authorization and boundaries",()=>{
  it("returns manifest only through private fixed path",async()=>{
    const e=env();
    const r=await worker.fetch(request("/shards/manifest-v1.json"),e);
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(e.TAFSIR_BUCKET.get).toHaveBeenCalledWith("manifest-v1.json");
  });
  it("loads only exact three-digit surahs from the intended language",async()=>{
    const e=env();
    expect((await worker.fetch(request("/shards/ur/001.json.br"),e)).status).toBe(200);
    expect((await worker.fetch(request("/shards/en/114.json.br"),e)).status).toBe(200);
    expect(e.TAFSIR_BUCKET.get.mock.calls.map(c=>c[0])).toEqual(["ur/001.json.br","en/114.json.br"]);
  });
  it("rejects path probing and query strings before touching R2",async()=>{
    const e=env();
    for(const path of ["/shards/ur/000.json.br","/shards/ur/115.json.br",
      "/shards/ur/1.json.br","/shards/en/115.json.br","/shards/xx/001.json.br",
      "/shards/ur/001.json.br?token=abc","/shards/ur/001.json.br.bak","/shards/private"])
      expect((await worker.fetch(request(path),e)).status).toBe(404);
    expect(e.TAFSIR_BUCKET.get).not.toHaveBeenCalled();
  });
  it("rejects requests without a token, without exposing bytes or keys",async()=>{
    const e=env();
    expect((await worker.fetch(new Request(base+"/shards/ur/001.json.br"),e)).status).toBe(401);
    expect((await worker.fetch(request("/shards/ur/001.json.br","Bearer wrong"),e)).status).toBe(401);
    expect(e.TAFSIR_BUCKET.get).not.toHaveBeenCalled();
  });
  it("checks manifest 256KB and shard 4MB limits",async()=>{
    const e=env();
    e.TAFSIR_BUCKET.get.mockImplementationOnce(async()=>({size:300000,body:new Response("x").body!}));
    expect((await worker.fetch(request("/shards/manifest-v1.json"),e)).status).toBe(502);
    e.TAFSIR_BUCKET.get.mockImplementationOnce(async()=>({size:5*1024*1024,body:new Response("x").body!}));
    expect((await worker.fetch(request("/shards/ur/002.json.br"),e)).status).toBe(502);
  });
  it("the Quran page route loads any additional surah before looking up page verse keys",()=>{
    const source=readFileSync(resolve("app/api/quran/tafsir-namoona/route.ts"),"utf8");
    expect(source).toContain("const requiredSurahs = [...new Set(requestedPageKeys.map");
    expect(source).toContain("loadTafsirSurahShards(language, requiredSurahs");
    expect(source).toContain("const bySource = new Map");
    expect(source).toContain("checkHash(file, RELEASE[language].digest)");
  });
});
