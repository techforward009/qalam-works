import type { NextRequest } from "next/server";
import { RESEARCH_SESSION_COOKIE } from "../research/auth/session";

// GET output must never depend on the login cookie: the CDN does not key on cookies.
/** Only anonymous, successful public reads may enter shared caches. */
export function publicBookGetCacheControl(req: NextRequest, status: number, op: string): string {
  if (req.method !== "GET" || status < 200 || status >= 300 ||
      req.headers.has("authorization") || req.cookies.has(RESEARCH_SESSION_COOKIE)) {
    return "private, no-store";
  }
  const ttl = op === "catalog" ? 300 : 86400;
  return `public, max-age=60, s-maxage=${ttl}, stale-while-revalidate=604800`;
}
