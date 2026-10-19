import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE, OWNER_COOKIE, OWNER_GITHUB_ID, newOwnerSession,
  oauthConfigFor, oauthCookieOptions, ownerCookieOptions, safeEqualOauthState,
} from "../../../../lib/ownerQuranAuth";

export const runtime = "nodejs";
const denied = () => new Response(null, {status: 404, headers: {"Cache-Control": "no-store"}});
export async function GET(req: NextRequest): Promise<Response> {
  const config = oauthConfigFor(req.nextUrl.origin);
  if (!config) return denied();
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  if (!safeEqualOauthState(stateCookie, state) || !code || !/^[A-Za-z0-9_-]{8,200}$/.test(code)) return denied();
  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: {"Accept":"application/json","Content-Type":"application/json"},
      body: JSON.stringify({client_id:config.clientId,client_secret:config.clientSecret,code,redirect_uri:config.callback}),
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return denied();
    const token = (await response.json() as {access_token?: unknown}).access_token;
    if (typeof token !== "string" || !token) return denied();
    const identity = await fetch("https://api.github.com/user", {
      headers: {"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json","User-Agent":"QalamWorks-OwnerQuran"},
      cache: "no-store",signal: AbortSignal.timeout(10000),
    });
    if (!identity.ok) return denied();
    const github = await identity.json() as {id?: unknown};
    if (github.id !== OWNER_GITHUB_ID) return denied();
    const session = newOwnerSession();
    if (!session) return denied();
    const res = NextResponse.redirect(new URL("/my/quran", req.url),{headers:{"Cache-Control":"no-store"}});
    res.cookies.set(OWNER_COOKIE, session, ownerCookieOptions());
    res.cookies.delete({name:OAUTH_STATE_COOKIE, path:"/api/my/oauth"});
    return res;
  } catch { return denied(); }
}
