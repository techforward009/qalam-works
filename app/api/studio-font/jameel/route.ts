import { loadPrivateJameelWoff2 } from "../../../lib/privateJameelFont";

export const runtime = "nodejs";

/** Same-origin Jameel face for Document Studio editor + browser print. */
export async function GET() {
  const result = await loadPrivateJameelWoff2();
  if (!result.ok) {
    return new Response(null, {
      status: 404,
      headers: { "X-Jameel-Font": result.reason },
    });
  }
  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": "font/woff2",
      "Cache-Control": "private, max-age=86400",
      "X-Jameel-Font": result.reason,
    },
  });
}
