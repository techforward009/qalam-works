/** Private Qalam feedback and contact inquiry storage. No public read access.
 * Cloudflare Worker AUTH_TOKEN is a secret and FEEDBACK_BUCKET is private R2. */
interface StoredObject { body: ReadableStream<Uint8Array>; size: number }
interface ListedObjects {
  objects: { key: string }[];
  truncated: boolean;
  cursor?: string;
}
interface Environment {
  FEEDBACK_BUCKET: {
    get(key: string): Promise<StoredObject | null>;
    put(key: string, bytes: Uint8Array, options?: { httpMetadata: { contentType: string } }): Promise<unknown>;
    list(options: { prefix: string; limit: number; cursor?: string }): Promise<ListedObjects>;
  };
  AUTH_TOKEN: string;
}
const MAX_BODY = 8192;
const KEY = /^(?:contact-inquiries\/v1\/[0-9]{13}-[0-9a-f-]{36}\.json|user-feedback\/v1\/[a-z][a-z0-9-]{0,63}\/[0-9]{13}-[0-9a-f-]{36}\.json)$/;
const PREFIXES = new Set(["contact-inquiries/v1/", "user-feedback/v1/"]);
const HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

const empty = (status: number) => new Response(null, { status, headers: HEADERS });
function bearerMatches(value: string | null, expected: string): boolean {
  if (!expected || expected.length < 32 || !value?.startsWith("Bearer ")) return false;
  const supplied = new TextEncoder().encode(value.slice(7));
  const desired = new TextEncoder().encode(expected);
  if (supplied.length !== desired.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) diff |= supplied[i] ^ desired[i];
  return diff === 0;
}
async function cappedBody(request: Request): Promise<Uint8Array | null> {
  if (Number(request.headers.get("content-length")) > MAX_BODY || !request.body) return null;
  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let size = 0;
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); return null; }
    chunks.push(next.value);
  }
  if (size < 2) return null;
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    if (!env?.FEEDBACK_BUCKET || !env.AUTH_TOKEN) return empty(503);
    if (!bearerMatches(request.headers.get("authorization"), env.AUTH_TOKEN)) return empty(401);
    const url = new URL(request.url);
    if (url.hash) return empty(404);
    const prefix = "/v1/objects/";
    if (url.pathname === "/v1/objects" && request.method === "GET") {
      const params = url.searchParams;
      const target = params.get("prefix");
      if (params.size > 2 || !target || !PREFIXES.has(target) || [...params.keys()].some(k => !["prefix","cursor"].includes(k))) return empty(400);
      const cursor = params.get("cursor") || undefined;
      if (cursor && cursor.length > 300) return empty(400);
      try {
        const page = await env.FEEDBACK_BUCKET.list({ prefix: target, limit: 1000, ...(cursor ? {cursor} : {}) });
        return Response.json({ paths: page.objects.map(x => x.key), cursor: page.cursor, truncated: page.truncated }, { status: 200, headers: HEADERS });
      } catch { return empty(503); }
    }
    if (!url.pathname.startsWith(prefix) || url.search) return empty(404);
    const key = url.pathname.slice(prefix.length);
    if (!KEY.test(key) || key.includes("..")) return empty(404);
    if (request.method === "PUT") {
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return empty(415);
      const bytes = await cappedBody(request);
      if (!bytes) return empty(413);
      let record: unknown;
      try { record = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
      catch { return empty(400); }
      if (!record || typeof record !== "object" || Array.isArray(record)) return empty(400);
      try {
        await env.FEEDBACK_BUCKET.put(key, bytes, { httpMetadata: { contentType: "application/json" } });
        return empty(201);
      } catch { return empty(503); }
    }
    if (request.method === "GET") {
      try {
        const object = await env.FEEDBACK_BUCKET.get(key);
        if (!object) return empty(404);
        if (!Number.isInteger(object.size) || object.size < 2 || object.size > MAX_BODY) return empty(502);
        return new Response(object.body, {
          status: 200,
          headers: { ...HEADERS, "Content-Type": "application/json; charset=utf-8", "Content-Length": String(object.size) },
        });
      } catch { return empty(503); }
    }
    return empty(405);
  },
};
