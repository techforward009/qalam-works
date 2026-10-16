/**
 * Cloudflare font recovery pilot, separate from private Tafsir R2.
 *
 * Nothing is public unless PUBLICATION_APPROVED=true is explicitly configured.
 * Initial allowlist contains ONLY fonts with OFL notices in the supplied files.
 * Distribution must also include the applicable OFL copyright/license notices.
 * Restricted or unverified Muhammadi, Jameel, Nafees and Alvi are NOT served.
 *
 * Upload exact verified assets to a PRIVATE R2 bucket at fonts/<filename>.
 * Bind the private bucket to this Worker; do not enable r2.dev.
 */
type R2FontObject = {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag?: string;
};
interface Env {
  FONT_BUCKET: { get(key: string): Promise<R2FontObject | null> };
  PUBLICATION_APPROVED?: string;
}
const FONTS: Record<string, {key: string; size: number}> = {
  "Gulzar-Regular.woff2": {key: "fonts/Gulzar-Regular.woff2", size:237008},
  "Sahel.woff2": {key: "fonts/Sahel.woff2", size:35460},
  "ScheherazadeNew-Medium.woff2": {key: "fonts/ScheherazadeNew-Medium.woff2", size:147916},
};
const HEADERS: Record<string,string> = {
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Access-Control-Allow-Origin": "*",
};
const failure = (status:number) => new Response(null,{
  status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
});
export default {
  async fetch(request:Request,env:Env):Promise<Response>{
    if (!["GET","HEAD"].includes(request.method)) return failure(405);
    if (!env?.FONT_BUCKET || env.PUBLICATION_APPROVED !== "true") return failure(503);
    const url = new URL(request.url);
    if (url.search || url.hash || !url.pathname.startsWith("/fonts/")) return failure(404);
    const filename = url.pathname.slice("/fonts/".length);
    if (!Object.prototype.hasOwnProperty.call(FONTS,filename)) return failure(404);
    const item = FONTS[filename];
    const obj = await env.FONT_BUCKET.get(item.key);
    if (!obj) return failure(404);
    if (obj.size !== item.size) return failure(502);
    const headers = {
      ...HEADERS,
      "Content-Type":"font/woff2",
      "Content-Length":String(obj.size),
      "Cache-Control":"public,max-age=3600,s-maxage=86400",
      ...(obj.httpEtag?{"ETag":obj.httpEtag}:{})
    };
    return new Response(request.method === "HEAD" ? null : obj.body,{status:200,headers});
  },
};
