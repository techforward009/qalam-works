import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { hasOwnerSession } from "../../../../lib/ownerQuranAuth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const FONT_URL = "https://qalam-fonts-private-mirror.techforward009.workers.dev/owner-font/muhammadi-quranic-400.woff2";
const DIGEST = "ddcce6d3bd7dd026f6a0035040e71da3ddac669a470336459dc08045a43dd7fe";
const denied = () => new NextResponse(null,{status:404,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"}});
export async function GET(): Promise<NextResponse> {
  if (!await hasOwnerSession()) return denied();
  const key = process.env.QALAM_PRIVATE_FONT_WORKER_SECRET;
  if (!key || key.length < 32) return denied();
  try {
    const response = await fetch(FONT_URL,{
      method:"GET", headers:{"Authorization":"Bearer "+key},
      cache:"no-store", redirect:"error",signal:AbortSignal.timeout(10000),
    });
    if (!response.ok) return denied();
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== 220136 || createHash("sha256").update(bytes).digest("hex") !== DIGEST) return denied();
    return new NextResponse(bytes,{status:200,headers:{
      "Content-Type":"font/woff2","Cache-Control":"private, no-store",
      "X-Robots-Tag":"noindex","X-Content-Type-Options":"nosniff",
      "Content-Security-Policy":"default-src 'none'","Vary":"Cookie",
    }});
  } catch { return denied(); }
}
