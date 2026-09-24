export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { ResearchPersistenceError, hydrateResearchStore } from "../../../tools/research-studio/engine";
import { researchBlobClientFromEnv } from "../memoryStore";
import {
  MAX_RESEARCH_JSON_BYTES,
  handleResearchAsk,
  prepareResearchAsk,
  researchAskAdapterFromEnv,
} from "./handleAsk";

const FAILED = { error: "Research request failed.", code: "failed" } as const;

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

  const prepared = prepareResearchAsk(body);
  if (!prepared.ok) {
    return NextResponse.json(prepared.body, { status: prepared.status });
  }

  try {
    const client = researchBlobClientFromEnv();
    const store = await hydrateResearchStore(client, prepared.documentIds);
    const result = await handleResearchAsk({
      body,
      store,
      adapter: researchAskAdapterFromEnv(),
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    if (err instanceof ResearchPersistenceError || err instanceof Error) {
      return NextResponse.json(FAILED, { status: 500 });
    }
    return NextResponse.json(FAILED, { status: 500 });
  }
}
