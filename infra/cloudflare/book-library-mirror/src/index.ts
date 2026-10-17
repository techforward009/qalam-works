/** Private, read-only Book Library mirror. Keep the R2 bucket private. */
interface BookObject {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag?: string;
}

interface Env {
  BOOK_LIBRARY_BUCKET: { get(key: string): Promise<BookObject | null> };
  AUTH_TOKEN: string;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

const SOURCE_IDS = new Set([
  "nahj-ar", "nahj-ur", "sahifa-ar", "sahifa-ur", "sahifa-en",
  "nahj-sermons-en", "nahj-letters-sayings-en",
  "kafi-v1-ar", "kafi-v2-ar", "kafi-v3-ar", "kafi-v4-ar",
  "kafi-v5-ar", "kafi-v6-ar", "kafi-v7-ar", "kafi-v8-ar",
]);
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
const MAX_POINTER_BYTES = 256 * 1024;
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;
const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const MAX_RECORD_BYTES = 1024 * 1024;

function empty(status: number): Response {
  return new Response(null, { status, headers: PRIVATE_HEADERS });
}

async function authorized(header: string | null, token: string): Promise<boolean> {
  if (!token || !header?.startsWith("Bearer ")) return false;
  const supplied = new TextEncoder().encode(header.slice(7));
  const expected = new TextEncoder().encode(token);
  if (supplied.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < supplied.length; i++) difference |= supplied[i] ^ expected[i];
  return difference === 0;
}

function route(path: string): { key: string; max: number; ttl: number } | null {
  if (path === "/v1/current.json") return { key: "current.json", max: MAX_POINTER_BYTES, ttl: 5 };
  let match = /^\/v1\/([a-f0-9]{64})\/manifest\.json\.br$/.exec(path);
  if (match) return { key: `v1/${match[1]}/manifest.json.br`, max: MAX_MANIFEST_BYTES, ttl: 31536000 };
  match = /^\/v1\/([a-f0-9]{64})\/sources\/([a-z0-9-]+)\/(manifest\.json\.br|source\.json\.br|search-index\.json\.br)$/.exec(path);
  if (match && SOURCE_IDS.has(match[2])) {
    const leaf = match[3];
    return {
      key: `v1/${match[1]}/sources/${match[2]}/${leaf}`,
      max: leaf === "source.json.br" ? MAX_SOURCE_BYTES : MAX_MANIFEST_BYTES,
      ttl: leaf === "manifest.json.br" ? 31536000 : 86400,
    };
  }
  match = /^\/v1\/([a-f0-9]{64})\/sources\/([a-z0-9-]+)\/records\/([a-f0-9]{64})\.json\.br$/.exec(path);
  if (match && SOURCE_IDS.has(match[2])) {
    return {
      key: `v1/${match[1]}/sources/${match[2]}/records/${match[3]}.json.br`,
      max: MAX_RECORD_BYTES,
      ttl: 31536000,
    };
  }
  return null;
}

function cacheRequest(url: URL): Request {
  // Cache key intentionally omits the bearer token; authorization is checked first.
  return new Request(`https://book-library-cache.invalid${url.pathname}`);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
    if (request.method !== "GET") return empty(405);
    if (!env?.AUTH_TOKEN || !env.BOOK_LIBRARY_BUCKET) return empty(503);
    if (!await authorized(request.headers.get("authorization"), env.AUTH_TOKEN)) return empty(401);

    const url = new URL(request.url);
    if (url.search || url.hash) return empty(404);
    const target = route(url.pathname);
    if (!target) return empty(404);

    const cache = (caches as unknown as { default: Cache }).default;
    const key = cacheRequest(url);
    const cached = await cache.match(key);
    if (cached) {
      const headers = new Headers(PRIVATE_HEADERS);
      const etag = cached.headers.get("ETag");
      if (etag) headers.set("ETag", etag);
      headers.set("Content-Length", cached.headers.get("Content-Length") ?? "0");
      headers.set("X-Book-Cache", "HIT");
      return new Response(cached.body, { status: 200, headers });
    }

    const object = await env.BOOK_LIBRARY_BUCKET.get(target.key);
    if (!object) return empty(404);
    if (object.size <= 0 || object.size > target.max) return empty(502);

    const internalHeaders = new Headers({
      "Cache-Control": `public, max-age=${target.ttl}, immutable`,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(object.size),
    });
    if (object.httpEtag) internalHeaders.set("ETag", object.httpEtag);
    const internal = new Response(object.body, { status: 200, headers: internalHeaders });
    ctx.waitUntil(cache.put(key, internal.clone()).catch(() => undefined));

    const responseHeaders = new Headers(PRIVATE_HEADERS);
    responseHeaders.set("Content-Type", "application/octet-stream");
    responseHeaders.set("Content-Length", String(object.size));
    responseHeaders.set("X-Book-Cache", "MISS");
    if (object.httpEtag) responseHeaders.set("ETag", object.httpEtag);
    return new Response(internal.body, { status: 200, headers: responseHeaders });
  },
};
