export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  ResearchPersistenceError,
  createMemoryResearchEngineStore,
  loadDurableCorpus,
} from "../../../../../../tools/research-studio/engine";
import { researchBlobClientFromEnv } from "../../../../memoryStore";
import { handleResearchPage, parseResearchPageParams } from "../../../handlePage";

const FAILED = { error: "Research page fetch failed.", code: "failed" } as const;
const MISSING = { error: "Not found.", code: "not_found" } as const;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; page: string }> },
): Promise<NextResponse> {
  const params = await context.params;
  const parsed = parseResearchPageParams(params.id, params.page);
  if (!parsed) {
    return NextResponse.json({ error: "Malformed request.", code: "invalid" }, { status: 400 });
  }

  try {
    const client = researchBlobClientFromEnv();
    const loaded = await loadDurableCorpus(client, parsed.documentId);
    if (!loaded.ok) {
      return NextResponse.json(loaded.error === "not_found" ? MISSING : FAILED, {
        status: loaded.error === "not_found" ? 404 : 500,
      });
    }
    const working = createMemoryResearchEngineStore();
    const saved = working.save(loaded.value);
    if (!saved.ok) return NextResponse.json(FAILED, { status: 500 });
    const result = await handleResearchPage({
      documentId: parsed.documentId,
      page: params.page,
      store: working,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    if (err instanceof ResearchPersistenceError || err instanceof Error) {
      return NextResponse.json(FAILED, { status: 500 });
    }
    return NextResponse.json(FAILED, { status: 500 });
  }
}
