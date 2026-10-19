import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { OAUTH_STATE_COOKIE, oauthConfigFor, oauthCookieOptions } from "../../../../lib/ownerQuranAuth";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const config = oauthConfigFor(req.nextUrl.origin);
  if (!config) return new Response(null, {status: 404, headers: {"Cache-Control": "no-store"}});
  const state = randomBytes(32).toString("hex");
  const link = new URL("https://github.com/login/oauth/authorize");
  link.searchParams.set("client_id", config.clientId);
  link.searchParams.set("redirect_uri", config.callback);
  link.searchParams.set("state", state);
  link.searchParams.set("scope", "read:user");
  const res = NextResponse.redirect(link, {headers: {"Cache-Control": "no-store"}});
  res.cookies.set(OAUTH_STATE_COOKIE, state, oauthCookieOptions());
  return res;
}
