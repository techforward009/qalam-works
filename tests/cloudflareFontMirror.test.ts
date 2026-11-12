import { describe, expect, it, vi } from "vitest";
import worker from "../infra/cloudflare/public-font-mirror/src/index";
import manifest from "../infra/cloudflare/migration-source-manifest.json";

const hostname = "https://qalam-font-test.workers.dev";
const fontKey = "Gulzar-Regular.woff2";
const validBytes = new Uint8Array([0x77,0x4f,0x46,0x32]);
const env = () => {
  const get = vi.fn(async (_key:string) => ({
    size:237008,
    body:new Response(validBytes).body!,
    httpEtag:'"valid"',
  }));
  return {PUBLICATION_APPROVED:"true",FONT_BUCKET:{get}};
};
const req = (path:string,method="GET") => new Request(hostname+path,{method});

describe("Cloudflare R2 font recovery: no live uploads or external requests", () => {
  it("refuses to serve anything before explicit publication approval", async () => {
    const b = env();
    b.PUBLICATION_APPROVED="false";
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"),b)).status).toBe(503);
    expect(b.FONT_BUCKET.get).not.toHaveBeenCalled();
  });
  it("serves exact OFL font with CORS and protective cache headers", async () => {
    const b = env();
    const r = await worker.fetch(req("/fonts/Gulzar-Regular.woff2"),b);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("font/woff2");
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
    expect(r.headers.get("cache-control")).toContain("s-maxage=86400");
    expect(b.FONT_BUCKET.get).toHaveBeenCalledWith(fontKey);
    expect(Array.from(new Uint8Array(await r.arrayBuffer()))).toEqual([...validBytes]);
  });
  it("allows HEAD but rejects POST and refuses unknown/restricted fonts", async () => {
    const b=env();
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2","HEAD"),b)).status).toBe(200);
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2","POST"),b)).status).toBe(405);
    expect((await worker.fetch(req("/fonts/jameel-noori-nastaleeq-400.woff2"),b)).status).toBe(404);
    expect((await worker.fetch(req("/fonts/muhammadi-quranic-400.woff2"),b)).status).toBe(404);
    expect((await worker.fetch(req("/fonts/Alvi_Nastaleeq.woff2"),b)).status).toBe(404);
    expect((await worker.fetch(req("/fonts/NafeesNastaleeq.woff2"),b)).status).toBe(404);
    expect((await worker.fetch(req("/fonts/../secrets"),b)).status).toBe(404);
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2?bypass=1"),b)).status).toBe(404);
    expect(b.FONT_BUCKET.get).toHaveBeenCalledTimes(1);
  });
  it("fails closed on wrong-size/missing content", async () => {
    const b=env();
    b.FONT_BUCKET.get.mockImplementationOnce(async()=>({size:11,body:new Response(validBytes).body!,httpEtag:""}));
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"),b)).status).toBe(502);
    b.FONT_BUCKET.get.mockImplementationOnce(async()=>null as never);
    expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"),b)).status).toBe(404);
  });
  it("records original private Tafsir hashes and prevents accidental publication of fonts with review-required rights", () => {
    expect(manifest.tafsir).toHaveLength(2);
    expect(manifest.tafsir.every(x=>x.visibility==="private")).toBe(true);
    expect(manifest.fonts.find(x=>x.path==="jameel-noori-nastaleeq-400.woff2")?.sha256)
      .toBe("d12978f4398f1f788d65fa7ccb872cf0e1c43aef89166816243e94487d9cee27");
    expect(manifest.fonts.filter(x=>x.publication==="ofl-license-review").map(x=>x.path).sort())
      .toEqual(["Gulzar-Regular.woff2","Sahel.woff2","ScheherazadeNew-Medium.woff2"].sort());
  });
});
