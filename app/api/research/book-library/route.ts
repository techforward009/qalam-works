import { rejectUnconfiguredResearchStorage } from "../storageConfig";
// Research library access is owner-only, including reads. The shared public
// reader keeps its own behavior; authenticate here before invoking it.
export const runtime = "nodejs";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import { GET as readLibrary, POST as writeLibrary } from "../../khateeb/library/route";
import { rejectUnauthenticatedResearch } from "../auth/requireSession";

export async function GET(req: NextRequest) {
  return rejectUnauthenticatedResearch(req) ?? rejectUnconfiguredResearchStorage() ?? readLibrary(req);
}

export async function POST(req: NextRequest) {
  return rejectUnauthenticatedResearch(req) ?? rejectUnconfiguredResearchStorage() ?? writeLibrary(req);
}
