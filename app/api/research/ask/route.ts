export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import {
  MAX_RESEARCH_JSON_BYTES,
  getResearchApiStore,
  handleResearchAsk,
  researchAskAdapterFromEnv,
} from "./handleAsk";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_RESEARCH_JSON_BYTES) {
    return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
  }

  const raw = await req.text();
  if (raw.length > MAX_RESEARCH_JSON_BYTES) {
    return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
  }

  const result = await handleResearchAsk({
    body,
    store: getResearchApiStore(),
    adapter: researchAskAdapterFromEnv(),
  });
  return NextResponse.json(result.body, { status: result.status });
}
