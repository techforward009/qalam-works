/**
 * Owner session for Research Studio.
 * The password is never written into the cookie. Only exp, a random nonce,
 * and an HMAC-SHA256 signature are. This module does not log either secret.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const RESEARCH_SESSION_COOKIE = "qalam_research_session";
export const RESEARCH_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const MAX_RESEARCH_AUTH_BODY_BYTES = 1024;

export const AUTH_NOT_CONFIGURED = {
  error: "Research access is not configured.",
  code: "auth_not_configured",
} as const;

export const AUTH_REQUIRED = {
  error: "Authentication required.",
  code: "unauthorized",
} as const;

export const INVALID_PASSWORD = {
  error: "Invalid password.",
  code: "unauthorized",
} as const;

export const AUTH_MALFORMED = {
  error: "Malformed request.",
  code: "invalid",
} as const;

export type ResearchAuthConfig = {
  password: string;
  secret: string;
};

export function readResearchAuthConfig(env: {
  QALAM_RESEARCH_ACCESS_PASSWORD?: string;
  QALAM_RESEARCH_SESSION_SECRET?: string;
}): ResearchAuthConfig | null {
  const password = env.QALAM_RESEARCH_ACCESS_PASSWORD;
  const secret = env.QALAM_RESEARCH_SESSION_SECRET;
  if (!password || !secret) return null;
  return { password, secret };
}

/** Direct property reads so the server runtime keeps both variables. */
export function researchAuthConfigFromProcess(): ResearchAuthConfig | null {
  return readResearchAuthConfig({
    QALAM_RESEARCH_ACCESS_PASSWORD: process.env.QALAM_RESEARCH_ACCESS_PASSWORD,
    QALAM_RESEARCH_SESSION_SECRET: process.env.QALAM_RESEARCH_SESSION_SECRET,
  });
}

export function researchCookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

function base64url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

export function createSessionToken(
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  nonce: Buffer = randomBytes(16),
): string {
  const exp = nowSeconds + RESEARCH_SESSION_MAX_AGE_SECONDS;
  const payload = `${exp}.${base64url(nonce)}`;
  const signature = createHmac("sha256", secret).update(payload).digest();
  return `${payload}.${base64url(signature)}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expRaw, nonce, signature] = parts;
  if (!expRaw || !nonce || !signature) return false;
  if (!/^[1-9]\d{0,9}$/.test(expRaw)) return false;
  const exp = Number(expRaw);
  if (!Number.isSafeInteger(exp) || exp <= nowSeconds) return false;

  const nonceBytes = Buffer.from(nonce, "base64url");
  if (nonceBytes.length !== 16 || base64url(nonceBytes) !== nonce) return false;

  const provided = Buffer.from(signature, "base64url");
  const expected = createHmac("sha256", secret).update(`${expRaw}.${nonce}`).digest();
  if (provided.length !== expected.length || base64url(provided) !== signature) return false;
  return timingSafeEqual(provided, expected);
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const left = createHash("sha256").update(provided, "utf8").digest();
  const right = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(left, right);
}

export function researchSessionCookie(token: string, secure: boolean): string {
  return [
    `${RESEARCH_SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/api/research",
    `Max-Age=${RESEARCH_SESSION_MAX_AGE_SECONDS}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function clearResearchSessionCookie(secure: boolean): string {
  return [
    `${RESEARCH_SESSION_COOKIE}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/api/research",
    "Max-Age=0",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function readSessionCookie(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (name !== RESEARCH_SESSION_COOKIE) continue;
    const value = part.slice(index + 1).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}
