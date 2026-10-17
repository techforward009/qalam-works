import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../infra/cloudflare/book-library-mirror/src/index";

const env = {
  AUTH_TOKEN: "reader-secret",
  BOOK_LIBRARY_BUCKET: { get: vi.fn() },
};
const cacheStore = new Map<string, Response>();

beforeEach(() => {
  env.BOOK_LIBRARY_BUCKET.get.mockReset();
  cacheStore.clear();
  vi.stubGlobal("caches", {
    default: {
      match: vi.fn(async (request: Request) => cacheStore.get(request.url)?.clone() ?? undefined),
      put: vi.fn(async (request: Request, response: Response) => { cacheStore.set(request.url, response.clone()); }),
    },
  });
});

const context = { waitUntil: (promise: Promise<unknown>) => { void promise; } } as never;
const request = (url: string, token = "reader-secret") => new Request(url, { headers: { Authorization: `Bearer ${token}` } });

describe("private Book Library R2 Worker", () => {
  it("checks authorization before touching the private bucket", async () => {
    const response = await worker.fetch(request("https://mirror.example/v1/current.json", "wrong"), env, context);
    expect(response.status).toBe(401);
    expect(env.BOOK_LIBRARY_BUCKET.get).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("allows only known source keys and rejects query strings", async () => {
    const badKey = await worker.fetch(request(`https://mirror.example/v1/${"a".repeat(64)}/sources/private-ar/manifest.json.br`), env, context);
    const query = await worker.fetch(request("https://mirror.example/v1/current.json?source=nahj-ar"), env, context);
    expect(badKey.status).toBe(404);
    expect(query.status).toBe(404);
    expect(env.BOOK_LIBRARY_BUCKET.get).not.toHaveBeenCalled();
  });

  it("bounds object size and caches authorized immutable objects", async () => {
    const revision = "b".repeat(64);
    const url = `https://mirror.example/v1/${revision}/sources/nahj-ar/records/${"c".repeat(64)}.json.br`;
    env.BOOK_LIBRARY_BUCKET.get.mockResolvedValue({ size: 3, body: new Response("abc").body, httpEtag: "etag-1" });
    const first = await worker.fetch(request(url), env, context);
    const second = await worker.fetch(request(url), env, context);
    expect(first.status).toBe(200);
    expect(first.headers.get("x-book-cache")).toBe("MISS");
    expect(second.status).toBe(200);
    expect(second.headers.get("x-book-cache")).toBe("HIT");
    expect(await second.text()).toBe("abc");
    expect(env.BOOK_LIBRARY_BUCKET.get).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized objects instead of streaming them", async () => {
    const revision = "d".repeat(64);
    const url = `https://mirror.example/v1/${revision}/sources/nahj-ar/records/${"e".repeat(64)}.json.br`;
    env.BOOK_LIBRARY_BUCKET.get.mockResolvedValue({ size: 1024 * 1024 + 1, body: new Response("x").body });
    const response = await worker.fetch(request(url), env, context);
    expect(response.status).toBe(502);
  });
});
