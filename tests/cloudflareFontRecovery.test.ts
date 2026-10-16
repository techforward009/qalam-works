import { describe, expect, it, vi } from "vitest";
import worker from "../infra/cloudflare/font-mirror/index.js";

const origin = "https://qalam-fonts-private-mirror.example.workers.dev";
const request = (name: string, method = "GET") => new Request(origin + name, { method });
function setup() {
  const get = vi.fn(async (_name: string) => ({
    body: new Response(new Uint8Array([119,79,70,50])).body!,
    size: 237008,
    httpEtag: '"safe"',
  }));
  return {
    FONT_BUCKET: { get },
    OFL_PUBLICATION_APPROVED: "false",
    RESTRICTED_DISTRIBUTION_APPROVED: "false",
    RESTRICTED_FONT_ALLOWLIST: "",
  };
}
describe("private-R2 font gateway and redistribution controls", () => {
  it("cannot publish an OFL font without the publication flag", async () => {
    const env = setup();
    expect((await worker.fetch(request("/fonts/Gulzar-Regular.woff2"), env)).status).toBe(403);
    expect(env.FONT_BUCKET.get).not.toHaveBeenCalled();
  });
  it("serves exact filename from private R2 with CORS once OFL notices are approved", async () => {
    const env = setup();
    env.OFL_PUBLICATION_APPROVED = "true";
    const response = await worker.fetch(request("/fonts/Gulzar-Regular.woff2"),env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("font/woff2");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cache-Control")).toContain("max-age=86400");
    expect(env.FONT_BUCKET.get).toHaveBeenCalledWith("Gulzar-Regular.woff2");
  });
  it("restricts Jameel, Nafees, Alvi and Muhammadi despite OFL permission", async () => {
    const env = setup();env.OFL_PUBLICATION_APPROVED = "true";
    for(const font of [
      "jameel-noori-nastaleeq-400.woff2",
      "NafeesNastaleeq.woff2",
      "Alvi_Nastaleeq.woff2",
      "muhammadi-quranic-400.woff2",
    ])expect((await worker.fetch(request("/fonts/"+font),env)).status).toBe(403);
    expect(env.FONT_BUCKET.get).not.toHaveBeenCalled();
  });
  it("requires BOTH per-font permission list and explicit distribution confirmation", async()=>{
    const env = setup();
    env.RESTRICTED_FONT_ALLOWLIST="muhammadi-quranic-400.woff2";
    expect((await worker.fetch(request("/fonts/muhammadi-quranic-400.woff2"),env)).status).toBe(403);
    env.RESTRICTED_DISTRIBUTION_APPROVED = "true";
    env.FONT_BUCKET.get.mockImplementationOnce(async () => ({
      size: 220136,body:new Response(new Uint8Array([119,79,70,50])).body!,httpEtag:'"safe"',
    }));
    expect((await worker.fetch(request("/fonts/muhammadi-quranic-400.woff2"),env)).status).toBe(200);
    expect((await worker.fetch(request("/fonts/Alvi_Nastaleeq.woff2"),env)).status).toBe(403);
  });
  it("rejects probing, query strings, unknown filenames and non-GET requests",async()=>{
    const env=setup();env.OFL_PUBLICATION_APPROVED="true";
    for(const path of [
      "/fonts/../../secret", "/fonts/Jameel.ttf", "/fonts/Gulzar-Regular.woff2?x=1",
      "/fonts/Gulzar-Regular.woff2.backup", "/private/tafsir.json.br",
    ])expect((await worker.fetch(request(path),env)).status).toBe(404);
    expect((await worker.fetch(request("/fonts/Gulzar-Regular.woff2","POST"),env)).status).toBe(405);
    expect(env.FONT_BUCKET.get).not.toHaveBeenCalled();
  });
  it("checks exact original font size and refuses missing objects",async()=>{
    const env=setup();env.OFL_PUBLICATION_APPROVED="true";
    env.FONT_BUCKET.get.mockImplementationOnce(async()=>({
      size:12,body:new Response(new Uint8Array([1,2,3])).body!,httpEtag:"",
    }));
    expect((await worker.fetch(request("/fonts/Gulzar-Regular.woff2"),env)).status).toBe(502);
    env.FONT_BUCKET.get.mockImplementationOnce(async()=>null as never);
    expect((await worker.fetch(request("/fonts/Gulzar-Regular.woff2"),env)).status).toBe(404);
    const head=await worker.fetch(request("/fonts/Gulzar-Regular.woff2","HEAD"),env);
    expect(head.status).toBe(200);
    expect(head.body).toBeNull();
  });
  it("never opens Tafsir archives even with both publication flags",async()=>{
    const env=setup();env.OFL_PUBLICATION_APPROVED="true";env.RESTRICTED_DISTRIBUTION_APPROVED="true";
    expect((await worker.fetch(request("/shards/ur/001.json.br"),env)).status).toBe(404);
    expect(env.FONT_BUCKET.get).not.toHaveBeenCalled();
  });
});
