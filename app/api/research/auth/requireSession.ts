import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_NOT_CONFIGURED,
  AUTH_REQUIRED,
  readSessionCookie,
  researchAuthConfigFromProcess,
  verifySessionToken,
} from "./session";

/** Null when the owner session is valid. Otherwise a 401 or 503 response. */
export function rejectUnauthenticatedResearch(req: NextRequest): NextResponse | null {
  const config = researchAuthConfigFromProcess();
  if (!config) {
    return NextResponse.json(AUTH_NOT_CONFIGURED, { status: 503 });
  }
  const token = readSessionCookie(req.headers.get("cookie"));
  if (!token || !verifySessionToken(token, config.secret)) {
    return NextResponse.json(AUTH_REQUIRED, { status: 401 });
  }
  return null;
}
