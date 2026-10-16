/**
 * Qalam Works — original-font gateway for the owner's private Cloudflare R2.
 * All ten original uploaded WOFF2 files were expressly authorized by the owner.
 * No public R2 bucket, credentials, renaming or source-text alteration.
 * Isolated from the private Tafsir Worker and its secret.
 */
const FONT_FILES = Object.freeze({
  "AlFars9Badr.woff2": { size: 30340, sha256: "c9e108d6c962ef2f18b7b939f7a5ebf74ce65192a85249cb571554c18f3e9ab8" },
  "Alvi_Nastaleeq.woff2": { size: 5228460, sha256: "0e60d92fbf7a86dad972b7e75dfbb85dd94ffe3ee8fbba0c14115fc977efb466" },
  "BNazanin.woff2": { size: 20076, sha256: "2e9bfe82c0e631244e5729408fee76778b04edc716bed9da054c7c286de6f368" },
  "Gulzar-Regular.woff2": { size: 237008, sha256: "cf6b33bd971d65eef3eedafcae62ee8e88bdfe30ef6a23f9ab627a2f24e376d6" },
  "NafeesNastaleeq-Web.woff2": { size: 23692, sha256: "3b2219947cbd4704b4534198005f8e3818182ded24cac774c1fa0f625a955f82" },
  "NafeesNastaleeq.woff2": { size: 129624, sha256: "7e83325ff08842b011d6d70060ea055a992318e1cc5997bd66ccf1e13e35aac0" },
  "Sahel.woff2": { size: 35460, sha256: "25e4a066c637948e01e12b7c8bf9e13afa188fad6949affedc6ddf2d307b31b0" },
  "ScheherazadeNew-Medium.woff2": { size: 147916, sha256: "67c5c24a178e7e3e1c1c6ca7095448e70da6f882bf7f41783a8085e7ba87269e" },
  "jameel-noori-nastaleeq-400.woff2": { size: 5554728, sha256: "d12978f4398f1f788d65fa7ccb872cf0e1c43aef89166816243e94487d9cee27" },
  "muhammadi-quranic-400.woff2": { size: 220136, sha256: "ddcce6d3bd7dd026f6a0035040e71da3ddac669a470336459dc08045a43dd7fe" },
});
const BASE_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
});
function denied(status) {
  return new Response(null, {
    status, headers: {...BASE_HEADERS, "Cache-Control": "no-store"},
  });
}
function toHex(bytes) {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, "0")).join("");
}
async function hasExpectedDigest(bytes, expected) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest) === expected;
}
function isValidCacheHit(hit, file) {
  return hit.status === 200 &&
    hit.headers.get("Content-Type") === "font/woff2" &&
    hit.headers.get("Content-Length") === String(file.size) &&
    hit.headers.get("Cache-Control") === "public, max-age=86400" &&
    hit.headers.get("Access-Control-Allow-Origin") === "*" &&
    hit.headers.get("X-Qalam-Font-SHA256") === file.sha256;
}
export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return denied(405);
    if (!env?.FONT_BUCKET) return denied(503);
    const url = new URL(request.url);
    if (url.search || url.hash || !url.pathname.startsWith("/fonts/")) return denied(404);
    const filename = url.pathname.slice("/fonts/".length);
    if (!Object.prototype.hasOwnProperty.call(FONT_FILES, filename)) return denied(404);
    const file = FONT_FILES[filename];
    try {
      // The allowlisted digest is checked only on R2 fills; edge hits carry the
      // digest identity of bytes verified before cache.put.
      const edgeCache = globalThis.caches?.default;
      const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });
      if (edgeCache) {
        try {
          const hit = await edgeCache.match(cacheKey);
          if (hit && isValidCacheHit(hit, file)) {
            return request.method === "HEAD"
              ? new Response(null, { status: 200, headers: hit.headers })
              : hit;
          }
        } catch {
          // A cache outage must not prevent serving the verified original.
        }
      }
      const font = await env.FONT_BUCKET.get(filename);
      if (!font) return denied(404);
      if (font.size !== file.size) return denied(502);
      // R2 get() returns a stream. Buffer only this allowlisted object while
      // verifying it; the largest approved font is bounded at 5.3 MiB.
      const bytes = await new Response(font.body).arrayBuffer();
      if (bytes.byteLength !== file.size || !(await hasExpectedDigest(bytes, file.sha256))) {
        return denied(502);
      }
      const response = new Response(request.method === "HEAD" ? null : bytes, {
        status: 200,
        headers: {
          ...BASE_HEADERS,
          "Content-Type": "font/woff2",
          "Content-Length": String(file.size),
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
          "X-Qalam-Font-SHA256": file.sha256,
          ...(font.httpEtag ? {"ETag": font.httpEtag} : {}),
        },
      });
      if (edgeCache && request.method === "GET") {
        try { await edgeCache.put(cacheKey, response.clone()); } catch { /* serve without cache */ }
      }
      return response;
    } catch {
      return denied(503);
    }
  },
};
