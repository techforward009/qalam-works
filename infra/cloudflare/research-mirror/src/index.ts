/** Private research documents in R2. This Worker is NOT public storage. */
interface Env {
  RESEARCH_BUCKET: {\n    get(key: string): Promise<{ body: ReadableStream<Uint8Array>; size: number } | null>;\n    put(key: string, bytes: Uint8Array, options: { httpMetadata: { contentType: string } }): Promise<unknown>;\n    list(options: { prefix: string; limit: number; cursor?: string }): Promise<{ objects: { key: string }[]; cursor?: string; truncated: boolean }>;\n  };
  AUTH_TOKEN: string;
}
const MAX_BYTES = 25 * 1024 * 1024;
const KEY = /^research\/v1\/documents\/[A-Za-z0-9_-]{1,128}\.json$/;
const PREFIX = "research/v1/documents/";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const empty = (status: number) => new Response(null, { status, headers });
function authorized(header: string | null, token: string): boolean {
  if (!token || token.length < 32 || !header?.startsWith("Bearer ")) return false;
  const a = new TextEncoder().encode(header.slice(7));
  const b = new TextEncoder().encode(token);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env?.RESEARCH_BUCKET || !env.AUTH_TOKEN) return empty(503);
    if (!authorized(request.headers.get("authorization"), env.AUTH_TOKEN)) return empty(401);
    const url = new URL(request.url);
    if (url.pathname === "/v1/objects" && request.method === "GET") {
      if (url.searchParams.get("prefix") !== PREFIX ||
          [...url.searchParams.keys()].some(k => !["prefix", "cursor"].includes(k))) return empty(400);
      const cursor = url.searchParams.get("cursor") || undefined;
      if (cursor && cursor.length > 300) return empty(400);
      try {
        const page = await env.RESEARCH_BUCKET.list({ prefix: PREFIX, limit: 1000, ...(cursor ? { cursor } : {}) });
        return Response.json({ paths: page.objects.map(x => x.key), cursor: page.cursor, truncated: page.truncated }, { headers });
      } catch { return empty(503); }
    }
    const base = "/v1/objects/";
    if (!url.pathname.startsWith(base) || url.search || url.hash) return empty(404);
    const key = url.pathname.slice(base.length);
    if (!KEY.test(key)) return empty(404);
    if (request.method === "GET") {
      try {
        const item = await env.RESEARCH_BUCKET.get(key);
        if (!item) return empty(404);
        if (item.size > MAX_BYTES) return empty(502);
        return new Response(item.body, { headers: { ...headers, "Content-Type": "application/json", "Content-Length": String(item.size) } });
      } catch { return empty(503); }
    }
    if (request.method === "PUT") {
      if (!request.headers.get("content-type")?.startsWith("application/json")) return empty(415);
      const length = Number(request.headers.get("content-length"));
      if (!Number.isInteger(length) || length < 2 || length > MAX_BYTES) return empty(413);
      try {
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (bytes.byteLength !== length || bytes.byteLength > MAX_BYTES) return empty(413);
        JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        await env.RESEARCH_BUCKET.put(key, bytes, { httpMetadata: { contentType: "application/json" } });
        return empty(201);
      } catch { return empty(503); }
    }
    return empty(405);
  },
};
