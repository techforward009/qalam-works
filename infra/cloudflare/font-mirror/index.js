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
