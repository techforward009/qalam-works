import { describe, expect, it, vi } from "vitest";
import worker from "../infra/cloudflare/font-mirror/index.js";

const origin = "https://qalam-fonts-private-mirror.example.workers.dev";
const req = (path: string, method = "GET") => new Request(origin + path, { method });
const ALL_TEN: Record<string, { size: number; sha256: string }> = {
  "AlFars9Badr.woff2": { size: 30340, sha256: "c9e108d6c962ef2f18b7b939f7a5ebf74ce65192a85249cb571554c18f3e9ab8" },
  "Alvi_Nastaleeq.woff2": { size: 5228460, sha256: "0e60d92fbf7a86dad972b7e75dfbb85dd94ffe3ee8fbba0c14115fc977efb466" },
  "BNazanin.woff2": { size: 20076, sha256: "2e9bfe82c0e631244e5729408fee76778b04edc716bed9da054c7c286de6f368" },
  "Gulzar-Regular.woff2": { size: 237008, sha256: "cf6b33bd971d65eef3eedafcae62ee8e88bdfe30ef6a23f9ab627a2f24e376d6" },
  "MehrNastaliqWeb.woff2": { size: 55884, sha256: "a3c651455e754cb1e20e8bba05e449dfd12fa778870a79f11bca3108dbe41457" },
  "NafeesNastaleeq-Web.woff2": { size: 23692, sha256: "3b2219947cbd4704b4534198005f8e3818182ded24cac774c1fa0f625a955f82" },
  "NafeesNastaleeq-v1.02.woff2": { size: 147664, sha256: "0ded94076db53a8be209e5f2745a58eb244ead9a79ebc0e98a15750b2ca1feaf" },
  "NafeesNastaleeq.woff2": { size: 129624, sha256: "7e83325ff08842b011d6d70060ea055a992318e1cc5997bd66ccf1e13e35aac0" },
  "Sahel.woff2": { size: 35460, sha256: "25e4a066c637948e01e12b7c8bf9e13afa188fad6949affedc6ddf2d307b31b0" },
  "ScheherazadeNew-Medium.woff2": { size: 147916, sha256: "67c5c24a178e7e3e1c1c6ca7095448e70da6f882bf7f41783a8085e7ba87269e" },
  "jameel-noori-nastaleeq-400.woff2": { size: 5554728, sha256: "d12978f4398f1f788d65fa7ccb872cf0e1c43aef89166816243e94487d9cee27" },
  "muhammadi-quranic-400.woff2": { size: 220136, sha256: "ddcce6d3bd7dd026f6a0035040e71da3ddac669a470336459dc08045a43dd7fe" },
};
const BY_SIZE = new Map(Object.values(ALL_TEN).map(file => [file.size, file.sha256]));

function stubDigest(override?: (size: number) => string) {
  const digest = vi.fn(async (_algorithm: AlgorithmIdentifier, data: BufferSource) => {
    const size = data instanceof ArrayBuffer ? data.byteLength : data.byteLength;
    const hex = override?.(size) ?? BY_SIZE.get(size);
    if (!hex) throw new Error("unexpected test payload size");
    return Uint8Array.from(hex.match(/.{2}/g)!, pair => parseInt(pair, 16)).buffer;
  });
  vi.stubGlobal("crypto", { subtle: { digest } });
  return digest;
}
function env() {
  const get = vi.fn(async (key: string) => {
    const file = ALL_TEN[key];
    return {
      size: file?.size ?? 0,
      body: new Response(new Uint8Array(file?.size ?? 0)).body!,
      httpEtag: '"pinned"',
    };
  });
  return { FONT_BUCKET: { get } };
}

describe("Cloudflare owner-authorized original font Worker", () => {
  it("maps each allowlisted font, including Mehr Nastaliq Web, with proper font CORS", async () => {
    stubDigest();
    try {
      const context = env();
      for (const [name, file] of Object.entries(ALL_TEN)) {
        const response = await worker.fetch(req("/fonts/" + name), context);
        expect(response.status, name).toBe(200);
        expect(response.headers.get("Content-Length"), name).toBe(String(file.size));
        expect(response.headers.get("Content-Type")).toBe("font/woff2");
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(response.headers.get("Cache-Control")).toContain("max-age=86400");
        expect(response.headers.get("X-Qalam-Font-SHA256")).toBe(file.sha256);
        expect(context.FONT_BUCKET.get).toHaveBeenLastCalledWith(name);
      }
      expect(context.FONT_BUCKET.get).toHaveBeenCalledTimes(12);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("requires private R2 and rejects unknown names or query strings", async () => {
    stubDigest();
    try {
      expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"), {})).status).toBe(503);
      const context = env();
      for (const path of [
        "/shards/ur/001.json.br", "/fonts/DigitalKhattIndoPakRegular.woff2",
        "/fonts/AdobeArabic-Regular.woff2", "/fonts/../private.json",
        "/fonts/Alvi_Nastaleeq.woff2?download=1", "/fonts/jameel-noori-nastaleeq-400.woff2/anything",
      ]) expect((await worker.fetch(req(path), context)).status).toBe(404);
      expect(context.FONT_BUCKET.get).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("reuses verified edge-cached bytes for GET and HEAD", async () => {
    stubDigest();
    const stored = new Map<string, Response>();
    const cache = {
      match: vi.fn(async (request: Request) => stored.get(request.url)?.clone()),
      put: vi.fn(async (request: Request, response: Response) => { stored.set(request.url, response.clone()); }),
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
  it("ignores malformed cached metadata and reloads the approved R2 font", async () => {
    stubDigest();
    const cache = {
      match: vi.fn(async () => new Response("wrong", { status: 200, headers: { "Content-Type": "text/html", "Content-Length": "5" } })),
      put: vi.fn(async () => {}),
    };
    vi.stubGlobal("caches", { default: cache });
    try {
      const context = env();
      const response = await worker.fetch(req("/fonts/Gulzar-Regular.woff2"), context);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("font/woff2");
      expect(response.headers.get("Content-Length")).toBe(String(ALL_TEN["Gulzar-Regular.woff2"].size));
      expect(context.FONT_BUCKET.get).toHaveBeenCalledTimes(1);
      expect(cache.put).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("rejects same-length R2 bytes whose SHA-256 does not match the pinned original", async () => {
    const badDigest = "0".repeat(64);
    const digest = stubDigest(() => badDigest);
    const cache = { match: vi.fn(async () => undefined), put: vi.fn(async () => {}) };
    vi.stubGlobal("caches", { default: cache });
    try {
      const context = env();
      const response = await worker.fetch(req("/fonts/Gulzar-Regular.woff2"), context);
      expect(response.status).toBe(502);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(context.FONT_BUCKET.get).toHaveBeenCalledTimes(1);
      expect(digest).toHaveBeenCalledTimes(1);
      expect(cache.put).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("serves verified originals if edge cache throws", async () => {
    stubDigest();
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
  it("disallows POST and verifies HEAD object integrity without returning bytes", async () => {
    stubDigest();
    try {
      const context = env();
      expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2", "POST"), context)).status).toBe(405);
      const head = await worker.fetch(req("/fonts/Gulzar-Regular.woff2", "HEAD"), context);
      expect(head.status).toBe(200);
      expect(head.body).toBeNull();
      expect(context.FONT_BUCKET.get).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("fails closed on missing object, wrong size or R2 exception", async () => {
    stubDigest();
    try {
      const context = env();
      context.FONT_BUCKET.get.mockImplementationOnce(async () => null as never);
      expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"), context)).status).toBe(404);
      context.FONT_BUCKET.get.mockImplementationOnce(async () => ({ size: 2, body: new Response("x").body!, httpEtag: "" }));
      expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"), context)).status).toBe(502);
      context.FONT_BUCKET.get.mockImplementationOnce(async () => { throw Error("R2 down"); });
      expect((await worker.fetch(req("/fonts/Gulzar-Regular.woff2"), context)).status).toBe(503);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
