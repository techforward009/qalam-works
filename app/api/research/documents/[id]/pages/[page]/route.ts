export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getResearchApiStore } from "../../../../memoryStore";
import { handleResearchPage } from "../../../handlePage";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; page: string }> },
): Promise<NextResponse> {
  const params = await context.params;
  const result = await handleResearchPage({
    documentId: params.id,
    page: params.page,
    store: getResearchApiStore(),
  });
  return NextResponse.json(result.body, { status: result.status });
}
