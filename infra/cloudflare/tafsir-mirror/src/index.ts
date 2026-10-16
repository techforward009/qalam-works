/**
 * Qalam Works — read-only, authenticated private Tafsir V10 R2 mirror.
 * Deploy independently on Cloudflare Workers, NOT on Vercel.
 * Never expose the bucket through r2.dev or a public bucket domain.
 *
 * AUTH_TOKEN must be a Cloudflare Worker *secret*, set separately from
 * QALAM_TAFSIR_V10_MIRROR_BEARER_TOKEN in the Vercel server environment.
 * Neither secret nor archives belong in Git.
 */
interface R2Body {
  body: ReadableStream<Uint8Array>;
  size: number;
}
interface MirrorEnv {
  TAFSIR_BUCKET: { get(key: string): Promise<R2Body | null> };
  AUTH_TOKEN: string;
}

const ALLOWED_ARCHIVES: Record<string, string> = {
  "/archives/urdu-v10-reviewed-first20-20261015.json.br":
    "archives/urdu-v10-reviewed-first20-20261015.json.br",
  "/archives/english-v10-release-20261015.json.br":
    "archives/english-v10-release-20261015.json.br",
};
const MAX_BYTES = 16 * 1024 * 1024;
const BASE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
function reply(status: number): Response {
  return new Response(null, {status, headers: BASE_HEADERS});
}
/** Compare token bytes in fixed time for equal-length strings. */
async function authorized(supplied: string | null, secret: string): Promise<boolean> {
  if (!secret || !supplied?.startsWith("Bearer ")) return false;
  const a = new TextEncoder().encode(supplied.slice(7));
  const b = new TextEncoder().encode(secret);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
export default {
  async fetch(request: Request, env: MirrorEnv): Promise<Response> {
    if (request.method !== "GET") return reply(405);
    if (!env?.AUTH_TOKEN || !env.TAFSIR_BUCKET) return reply(503);
    if (!await authorized(request.headers.get("authorization"), env.AUTH_TOKEN)) return reply(401);
    const url = new URL(request.url);
    if (url.search || url.hash) return reply(404);
    const key = ALLOWED_ARCHIVES[url.pathname];
    if (!key) return reply(404);
    const object = await env.TAFSIR_BUCKET.get(key);
    if (!object) return reply(404);
    if (object.size > MAX_BYTES) return reply(502);
    return new Response(object.body, {
      status: 200,
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(object.size),
      },
    });
  },
};
