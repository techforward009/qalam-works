export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getResearchApiStore } from "../memoryStore";
import { MAX_RESEARCH_UPLOAD_BYTES, handleResearchUpload } from "./handleUpload";

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const result = await handleResearchUpload({ form, store: getResearchApiStore() });
  return NextResponse.json(result.body, { status: result.status });
}
