/**
 * Qalam Works — independently deployed private-R2 font gateway.
 * R2 bucket stays PRIVATE. No public bucket URL, no hardcoded R2 credentials.
 *
 * Three fonts with an embedded SIL OFL 1.1 notice are exposed by default.
 * Other original fonts require BOTH a deliberate per-file allowlist and
 * documented distribution rights. An old public Blob URL does NOT establish
 * redistribution permission; the owner must confirm this separately.
 *
 * Keep the applicable OFL copyright/license notices available to recipients.
 * This gateway never handles the private Tafsir bucket or Tafsir auth token.
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

const SIL_OFL_FONT_FILES = new Set([
  "Gulzar-Regular.woff2",
  "Sahel.woff2",
  "ScheherazadeNew-Medium.woff2",
]);

const BASE_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
});

function denied(status) {
  return new Response(null, {
    status,
    headers: { ...BASE_HEADERS, "Cache-Control": "no-store" },
  });
}

/**
 * The user must confirm a right to redistribute before turning on any
 * restrictive or uncertain font. This opt-in is OFF by default.
 */
function mayDistribute(filename, env) {
  if (SIL_OFL_FONT_FILES.has(filename)) {
    return env.OFL_PUBLICATION_APPROVED === "true";
  }
  if (env.RESTRICTED_DISTRIBUTION_APPROVED !== "true") return false;
  const allowed = new Set(
    (env.RESTRICTED_FONT_ALLOWLIST ?? "").split(",").map(s => s.trim()).filter(Boolean),
  );
  return allowed.has(filename);
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return denied(405);
    if (!env?.FONT_BUCKET) return denied(503);
    const url = new URL(request.url);
    if (url.search || url.hash || !url.pathname.startsWith("/fonts/")) return denied(404);
    const filename = url.pathname.slice("/fonts/".length);
    if (!Object.prototype.hasOwnProperty.call(FONT_FILES, filename)) return denied(404);
    if (!mayDistribute(filename, env)) return denied(403);

    try {
      const font = await env.FONT_BUCKET.get(filename);
      if (!font) return denied(404);
      if (font.size !== FONT_FILES[filename]) return denied(502);
      const headers = {
        ...BASE_HEADERS,
        "Content-Type": "font/woff2",
        "Content-Length": String(font.size),
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        ...(font.httpEtag ? { ETag: font.httpEtag } : {}),
      };
      return new Response(request.method === "HEAD" ? null : font.body, {
        status: 200,
        headers,
      });
    } catch {
      return denied(503);
    }
  },
};
