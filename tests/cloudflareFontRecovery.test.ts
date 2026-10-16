import { describe, expect, it, vi } from "vitest";
import worker from "../infra/cloudflare/font-mirror/index.js";

const origin = "https://qalam-fonts-private-mirror.example.workers.dev";
const req = (path: string, method = "GET") => new Request(origin + path, { method });
const ALL_TEN: Record<string,number> = {
  "AlFars9Badr.woff2": 30340,
  "Alvi_Nastaleeq.woff2": 5228460,
  "BNazanin.woff2": 20076,
  "Gulzar-Regular.woff2": 237008,
  "NafeesNastaleeq-Web.woff2": 23692,
  "NafeesNastaleeq.woff2": 129624,
  "Sahel.woff2": 35460,
  "ScheherazadeNew-Medium.woff2": 147916,
  "jameel-noori-nastaleeq-400.woff2": 5554728,
  "muhammadi-quranic-400.woff2": 220136,
};
function env() {
  const get = vi.fn(async (key: string) => ({
    size: ALL_TEN[key] ?? 0,
    body: new Response(new Uint8Array([119,79,70,50])).body!,
    httpEtag: '"pinned"',
  }));
  return { FONT_BUCKET: { get } };
}
describe("Cloudflare owner-authorized original font Worker", () => {
  it("maps each of ten exact uploaded object names, with proper font CORS", async () => {
    const context = env();
    for (const [name,size] of Object.entries(ALL_TEN)) {
      const response = await worker.fetch(req("/fonts/"+name),context);
      expect(response.status, name).toBe(200);
      expect(response.headers.get("Content-Length"), name).toBe(String(size));
      expect(response.headers.get("Content-Type")).toBe("font/woff2");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Cache-Control")).toContain("max-age=86400");
      expect(context.FONT_BUCKET.get).toHaveBeenLastCalledWith(name);
    }
    expect(context.FONT_BUCKET.get).toHaveBeenCalledTimes(10);
  });
  it("requires the actual private R2 binding and cannot accidentally return other bucket objects", async () => {
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"),{})).status).toBe(503);
    const context=env();
    for (const path of [
      "/shards/ur/001.json.br","/fonts/DigitalKhattIndoPakRegular.woff2",
      "/fonts/AdobeArabic-Regular.woff2","/fonts/../private.json",
      "/fonts/Alvi_Nastaleeq.woff2?download=1",
      "/fonts/jameel-noori-nastaleeq-400.woff2/anything",
    ])expect((await worker.fetch(req(path),context)).status).toBe(404);
    expect(context.FONT_BUCKET.get).not.toHaveBeenCalled();
  });
  it("reuses edge-cached originals instead of rereading R2", async () => {
    const stored = new Map<string, Response>();
    const cache = {
      match: vi.fn(async (request: Request) => stored.get(request.url)?.clone()),
      put: vi.fn(async (request: Request, response: Response) => {
        stored.set(request.url, response.clone());
      }),
    };
    vi.stubGlobal("caches", { default: cache });
    try {
      const context = env();
      const first = await worker.fetch(req("/fonts/Gulzar-Regular.woff2"), context);
      const second = await worker.fetch(req("/fonts/Gulzar-Regular.woff2"), context);
      const head = await worker.fetch(req("/fonts/Gulzar-Regular.woff2", "HEAD"), context);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(head.status).toBe(200);
      expect(head.body).toBeNull();
      expect(context.FONT_BUCKET.get).toHaveBeenCalledTimes(1);
      expect(cache.put).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("still serves verified originals if edge cache throws", async () => {
    vi.stubGlobal("caches", { default: {
      match: vi.fn(async () => { throw Error("cache unavailable"); }),
      put: vi.fn(async () => { throw Error("cache unavailable"); }),
    } });
    try {
      const context = env();
      expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"), context)).status).toBe(200);
      expect(context.FONT_BUCKET.get).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("disallows POST and lets HEAD report metadata without bytes",async()=>{
    const context=env();
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2","POST"),context)).status).toBe(405);
    const head=await worker.fetch(req("/fonts/Gulzar-Regular.woff2","HEAD"),context);
    expect(head.status).toBe(200);
    expect(head.body).toBeNull();
  });
  it("fails closed on missing object, wrong file size or R2 exception",async()=>{
    const context=env();
    context.FONT_BUCKET.get.mockImplementationOnce(async()=>null as never);
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"),context)).status).toBe(404);
    context.FONT_BUCKET.get.mockImplementationOnce(async()=>({size:2,body:new Response("x").body!,httpEtag:""}));
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"),context)).status).toBe(502);
    context.FONT_BUCKET.get.mockImplementationOnce(async()=>{throw Error("R2 down");});
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"),context)).status).toBe(503);
  });
});
