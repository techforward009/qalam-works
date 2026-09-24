export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { ResearchPersistenceError, hydrateResearchStore } from "../../../tools/research-studio/engine";
import { researchBlobClientFromEnv } from "../memoryStore";
import { rejectUnauthenticatedResearch } from "../auth/requireSession";
import {
  MAX_RESEARCH_JSON_BYTES,
  handleResearchAsk,
  prepareResearchAsk,
  researchAskAdapterFromEnv,
} from "./handleAsk";
import { emitResearchDiagnostic, researchDiagnosticsEnabled } from "./diagnostics";
import { createAskDiagnosticTrace } from "../../../tools/research-studio/engine";

const FAILED = { error: "Research request failed.", code: "failed" } as const;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = rejectUnauthenticatedResearch(req);
  if (denied) return denied;

  const diagnostic = researchDiagnosticsEnabled() ? createAskDiagnosticTrace() : undefined;
  try {
    const length = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(length) && length > MAX_RESEARCH_JSON_BYTES) {
      if (diagnostic) diagnostic.finalStatus = "invalid";
      return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
    }

    const raw = await req.text();
    if (raw.length > MAX_RESEARCH_JSON_BYTES) {
      if (diagnostic) diagnostic.finalStatus = "invalid";
      return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      if (diagnostic) diagnostic.finalStatus = "invalid";
      return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
    }

    const prepared = prepareResearchAsk(body);
    if (!prepared.ok) {
      if (diagnostic) diagnostic.finalStatus = prepared.body.code;
      return NextResponse.json(prepared.body, { status: prepared.status });
    }

    const client = await researchBlobClientFromEnv();
    const store = await hydrateResearchStore(client, prepared.documentIds);
    const result = await handleResearchAsk({
      body,
      store,
      adapter: researchAskAdapterFromEnv(diagnostic),
      diagnostic,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    if (diagnostic && diagnostic.finalStatus === "not_finished") diagnostic.finalStatus = "failed";
    if (err instanceof ResearchPersistenceError || err instanceof Error) {
      return NextResponse.json(FAILED, { status: 500 });
    }
    return NextResponse.json(FAILED, { status: 500 });
  } finally {
    if (diagnostic) emitResearchDiagnostic(diagnostic);
  }
}
