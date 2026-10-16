import { describe, expect, it, vi } from "vitest";
import { readTafsirMirror, tafsirMirrorConfig } from "../app/api/quran/tafsir-namoona/tafsirMirror";

describe("Tafsir V10 independent mirror (no real network)", () => {
  const urUrl = "https://tafsir.example.org/archives/urdu-v10.json.br";
  const enUrl = "https://tafsir.example.org/archives/english-v10.json.br";

  it("does not perform a request when the mirror is not configured", async () => {
    const mock = vi.fn<typeof fetch>();
    expect(await readTafsirMirror("ur", {}, mock)).toBeNull();
    expect(mock).not.toHaveBeenCalled();
  });

  it("reads only the language-specific private URL with a server-side token and no redirects", async () => {
    const seen: Array<{url: string; init: RequestInit}> = [];
    const mock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      seen.push({url: String(url), init: init ?? {}});
      return new Response(new Uint8Array([1,2,3,4]), {status: 200});
    }) as typeof fetch;
    expect(await readTafsirMirror("ur", {urUrl, enUrl, bearerToken:"test-secret"}, mock)).toEqual(Buffer.from([1,2,3,4]));
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe(urUrl);
    expect(seen[0].init.redirect).toBe("error");
    expect(seen[0].init.headers).toEqual({Authorization:"Bearer test-secret"});
    expect(seen[0].init.cache).toBe("no-store");
  });

  it("separately selects English without requesting Urdu", async () => {
    const mock = vi.fn(async (_url: RequestInfo | URL) => new Response(new Uint8Array([5])));
    expect(await readTafsirMirror("en", {urUrl,enUrl}, mock as typeof fetch)).toEqual(Buffer.from([5]));
    expect(mock.mock.calls[0][0]).toBe(enUrl);
  });

  it.each(["http://example.org/file", "https://user:pass@example.org/file",
    "https://localhost/file", "https://example.local/file", "not a url",
    "https://example.org/archive#fragment"])("rejects unsafe mirror URL %s", async (url) => {
      const mock = vi.fn<typeof fetch>();
      await expect(readTafsirMirror("ur", {urUrl:url}, mock)).rejects.toThrow("Invalid Tafsir mirror URL");
      expect(mock).not.toHaveBeenCalled();
    });

  it("rejects private mirror errors without silently falling back to the suspended store", async () => {
    const mock = vi.fn(async () => new Response(null, {status:503})) as typeof fetch;
    await expect(readTafsirMirror("ur", {urUrl}, mock)).rejects.toThrow("Tafsir mirror unavailable");
  });

  it("rejects a declared oversize archive before reading it", async () => {
    const mock = vi.fn(async () => new Response(new Uint8Array([1,2,3]), {
      status:200, headers:{"content-length":String(17*1024*1024)}
    })) as typeof fetch;
    await expect(readTafsirMirror("ur", {urUrl}, mock)).rejects.toThrow("Tafsir mirror archive too large");
  });

  it("does not read authorization from URL query or browser and accepts only server-side variables", () => {
    expect(tafsirMirrorConfig({
      QALAM_TAFSIR_V10_MIRROR_UR_URL: urUrl,
      QALAM_TAFSIR_V10_MIRROR_EN_URL: enUrl,
      QALAM_TAFSIR_V10_MIRROR_BEARER_TOKEN: "test-token",
    })).toEqual({urUrl,enUrl,bearerToken:"test-token"});
  });
});
