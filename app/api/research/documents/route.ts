export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import {
  ResearchPersistenceError,
  createMemoryResearchEngineStore,
  saveDurableCorpus,
} from "../../../tools/research-studio/engine";
import { researchBlobClientFromEnv } from "../memoryStore";
import { rejectUnauthenticatedResearch } from "../auth/requireSession";
import { MAX_RESEARCH_UPLOAD_BYTES, handleResearchUpload } from "./handleUpload";

const FAILED = { error: "Research upload failed.", code: "failed" } as const;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = rejectUnauthenticatedResearch(req);
  if (denied) return denied;

  const length = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_RESEARCH_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
  }

  const working = createMemoryResearchEngineStore();
  const result = await handleResearchUpload({ form, store: working });
  if (result.status !== 200 || !("documentId" in result.body)) {
    return NextResponse.json(result.body, { status: result.status });
  }

  const loaded = working.get(result.body.documentId);
  if (!loaded.ok) return NextResponse.json(FAILED, { status: 500 });

  try {
    const client = await researchBlobClientFromEnv();
    const saved = await saveDurableCorpus(client, loaded.value);
    if (!saved.ok) return NextResponse.json(FAILED, { status: 500 });
  } catch (err) {
    if (err instanceof ResearchPersistenceError || err instanceof Error) {
      return NextResponse.json(FAILED, { status: 500 });
    }
    return NextResponse.json(FAILED, { status: 500 });
  }

  return NextResponse.json(result.body, { status: 200 });
}
