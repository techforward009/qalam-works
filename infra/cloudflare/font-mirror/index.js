/**
 * Qalam Works — original-font gateway for the owner's private Cloudflare R2.
 * All ten original uploaded WOFF2 files were expressly authorized by the owner.
 * No public R2 bucket, credentials, renaming or source-text alteration.
 * Isolated from the private Tafsir Worker and its secret.
 */
const FONT_FILES = Object.freeze({
  "AlFars9Badr.woff2": 30340,
  "Alvi_Nastaleeq.woff2": 5228460,
  "BNazanin.woff2": 20076,
  "Gulzar-Regular.woff2": 237008,
  "NafeesNastaleeq-Web.woff2": 23692,
  "NafeesNastaleeq.woff2": 129624,
  "Sahel.woff2": 35460,
  "ScheherazadeNew-Medium.woff2": 147916,
  "jameel-noori-nastaleeq-400.woff2": 5554728,
  "muhammadi-quranic-400.woff2": 220136,
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
export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return denied(405);
    if (!env?.FONT_BUCKET) return denied(503);
    const url = new URL(request.url);
    if (url.search || url.hash || !url.pathname.startsWith("/fonts/")) return denied(404);
    const filename = url.pathname.slice("/fonts/".length);
    if (!Object.prototype.hasOwnProperty.call(FONT_FILES, filename)) return denied(404);
    try {
      const font = await env.FONT_BUCKET.get(filename);
      if (!font) return denied(404);
      if (font.size !== FONT_FILES[filename]) return denied(502);
      return new Response(request.method === "HEAD" ? null : font.body, {
        status: 200,
        headers: {
          ...BASE_HEADERS,
          "Content-Type": "font/woff2",
          "Content-Length": String(font.size),
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
          ...(font.httpEtag ? {"ETag": font.httpEtag} : {}),
        },
      });
    } catch {
      return denied(503);
    }
  },
};
