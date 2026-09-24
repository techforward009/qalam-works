export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { MAX_JSON_BODY_BYTES, runQalamAiInference } from "../../tools/document-studio/utils/qalamAiCloud";

export async function POST(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Qalam AI is temporarily unavailable.", code: "unavailable" },
    { status: 503 },
  );

  const length = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_JSON_BODY_BYTES) {
    return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
  }

  const result = await runQalamAiInference(body, {
    env: {
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_AUTH_TOKEN: process.env.CLOUDFLARE_AUTH_TOKEN,
    },
  });
  return NextResponse.json(result.json, { status: result.status });
}
