import { describe, expect, it, vi } from "vitest";
import worker from "../infra/cloudflare/tafsir-mirror/src/index";

const baseUrl = "https://qalam-tafsir-private-mirror.example.workers.dev";
const urPath = "/archives/urdu-v10-reviewed-first20-20261015.json.br";
const enPath = "/archives/english-v10-release-20261015.json.br";
const token = "private-test-token";

function mockEnv() {
  const get = vi.fn(async (key: string) => {
    if (key === "urdu-v10-reviewed-first20-20261015.json.br") {
      return {size: 3, body: new Response(new Uint8Array([1, 2, 3])).body!};
    }
    if (key === "english-v10-release-20261015.json.br") {
      return {size: 2, body: new Response(new Uint8Array([4, 5])).body!};
    }
    return null;
  });
  return {AUTH_TOKEN: token, TAFSIR_BUCKET: {get}};
}
function request(path: string, authorization = `Bearer ${token}`, method = "GET"): Request {
  return new Request(baseUrl + path, {method, headers: {authorization}});
}

describe("independent Cloudflare R2 Tafsir Worker (mocked, no network)", () => {
  it("blocks missing or wrong authorization before accessing R2", async () => {
    const env = mockEnv();
    expect((await worker.fetch(new Request(baseUrl + urPath), env)).status).toBe(401);
    expect((await worker.fetch(request(urPath, "Bearer wrong"), env)).status).toBe(401);
    expect(env.TAFSIR_BUCKET.get).not.toHaveBeenCalled();
  });
  it("serves verified-path private Urdu bytes with private no-store headers", async () => {
    const env = mockEnv();
    const res = await worker.fetch(request(urPath), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(Array.from(new Uint8Array(await res.arrayBuffer()))).toEqual([1, 2, 3]);
    expect(env.TAFSIR_BUCKET.get).toHaveBeenCalledWith("urdu-v10-reviewed-first20-20261015.json.br");
  });
  it("serves only the requested English archive", async () => {
    const env = mockEnv();
    const res = await worker.fetch(request(enPath), env);
    expect(res.status).toBe(200);
    expect(Array.from(new Uint8Array(await res.arrayBuffer()))).toEqual([4, 5]);
    expect(env.TAFSIR_BUCKET.get).toHaveBeenCalledTimes(1);
    expect(env.TAFSIR_BUCKET.get).toHaveBeenCalledWith("english-v10-release-20261015.json.br");
  });
  it("rejects unlisted paths and query strings", async () => {
    const env = mockEnv();
    expect((await worker.fetch(request("/archives/private-book.json"), env)).status).toBe(404);
    expect((await worker.fetch(request(urPath + "?download=1"), env)).status).toBe(404);
    expect(env.TAFSIR_BUCKET.get).not.toHaveBeenCalled();
  });
  it("rejects non-GET and missing secret or missing R2 object", async () => {
    const env = mockEnv();
    expect((await worker.fetch(request(urPath, `Bearer ${token}`, "HEAD"), env)).status).toBe(405);
    expect((await worker.fetch(request(urPath), {...env, AUTH_TOKEN: ""})).status).toBe(503);
    const missing = {...env, TAFSIR_BUCKET: {get: vi.fn(async (_key: string) => null)}};
    expect((await worker.fetch(request(urPath), missing)).status).toBe(404);
  });
  it("does not serve oversized source objects", async () => {
    const env = mockEnv();
    const big = {...env, TAFSIR_BUCKET: {get: vi.fn(async (_key: string) =>
      ({size: 17*1024*1024, body: new Response(new Uint8Array([1])).body!}))}};
    expect((await worker.fetch(request(urPath), big)).status).toBe(502);
  });
});
