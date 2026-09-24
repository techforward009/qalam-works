export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_MALFORMED,
  AUTH_NOT_CONFIGURED,
  INVALID_PASSWORD,
  MAX_RESEARCH_AUTH_BODY_BYTES,
  clearResearchSessionCookie,
  createSessionToken,
  passwordsMatch,
  readSessionCookie,
  researchAuthConfigFromProcess,
  researchCookieSecure,
  researchSessionCookie,
  verifySessionToken,
} from "./session";

function json(body: unknown, status: number, setCookie?: string): NextResponse {
  const response = NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  if (setCookie) response.headers.append("Set-Cookie", setCookie);
  return response;
}

function parsePassword(raw: string): string | null {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body as object);
  if (keys.length !== 1 || keys[0] !== "password") return null;
  const password = (body as { password?: unknown }).password;
  if (typeof password !== "string" || password.length === 0 || password.length > 256) return null;
  return password;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const config = researchAuthConfigFromProcess();
  if (!config) return json(AUTH_NOT_CONFIGURED, 503);

  const length = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_RESEARCH_AUTH_BODY_BYTES) {
    return json(AUTH_MALFORMED, 400);
  }

  const raw = await req.text();
  if (raw.length > MAX_RESEARCH_AUTH_BODY_BYTES) return json(AUTH_MALFORMED, 400);
  const password = parsePassword(raw);
  if (password === null) return json(AUTH_MALFORMED, 400);
  if (!passwordsMatch(password, config.password)) return json(INVALID_PASSWORD, 401);

  const token = createSessionToken(config.secret);
  return json({ authenticated: true }, 200, researchSessionCookie(token, researchCookieSecure()));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const config = researchAuthConfigFromProcess();
  if (!config) return json(AUTH_NOT_CONFIGURED, 503);
  const token = readSessionCookie(req.headers.get("cookie"));
  if (!token || !verifySessionToken(token, config.secret)) {
    return json({ authenticated: false }, 401);
  }
  return json({ authenticated: true }, 200);
}

export async function DELETE(): Promise<NextResponse> {
  return json({ authenticated: false }, 200, clearResearchSessionCookie(researchCookieSecure()));
}
