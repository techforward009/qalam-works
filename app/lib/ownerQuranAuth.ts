import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const OWNER_GITHUB_ID = 124031367;
export const OWNER_COOKIE = "qalam_owner_session";
export const OWNER_SESSION_SECONDS = 12 * 60 * 60;
export const OAUTH_STATE_COOKIE = "qalam_owner_oauth_state";

function secret(): string | null {
  const value = process.env.QALAM_OWNER_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}
function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function newOwnerSession(now = Math.floor(Date.now() / 1000)): string | null {
  const key = secret();
  if (!key) return null;
  const payload = [OWNER_GITHUB_ID, now + OWNER_SESSION_SECONDS, randomBytes(16).toString("base64url")].join(".");
  return payload + "." + sign(payload, key);
}
export function verifyOwnerSession(token: string | undefined, now = Math.floor(Date.now() / 1000)): boolean {
  const key = secret();
  if (!key || !token || token.length > 500) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== String(OWNER_GITHUB_ID)) return false;
  const expiry = Number(parts[1]);
  if (!/^\d{10}$/.test(parts[1]) || !Number.isSafeInteger(expiry) || expiry <= now ||
      expiry > now + OWNER_SESSION_SECONDS || !/^[A-Za-z0-9_-]{22}$/.test(parts[2])) return false;
  return equals(parts[3], sign(parts.slice(0, 3).join("."), key));
}
export async function hasOwnerSession(): Promise<boolean> {
  return verifyOwnerSession((await cookies()).get(OWNER_COOKIE)?.value);
}
export function ownerCookieOptions() {
  return {httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: OWNER_SESSION_SECONDS};
}
export function oauthCookieOptions() {
  return {httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/my/oauth", maxAge: 600};
}
export function oauthConfigFor(origin: string): {clientId: string; clientSecret: string; callback: string} | null {
  const clientId = process.env.QALAM_OWNER_GITHUB_CLIENT_ID;
  const clientSecret = process.env.QALAM_OWNER_GITHUB_CLIENT_SECRET;
  const callback = process.env.QALAM_OWNER_GITHUB_CALLBACK_URL;
  if (!secret() || !clientId || !clientSecret || !callback) return null;
  try {
    const url = new URL(callback);
    if (url.protocol !== "https:" || url.origin !== origin ||
        url.pathname !== "/api/my/oauth/callback" || url.search || url.hash) return null;
  } catch { return null; }
  return {clientId, clientSecret, callback};
}
export function safeEqualOauthState(a: string | undefined, b: string | null): boolean {
  return Boolean(a && b && /^[0-9a-f]{64}$/.test(a) && /^[0-9a-f]{64}$/.test(b) && equals(a, b));
}
