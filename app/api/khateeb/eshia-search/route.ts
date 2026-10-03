import { NextRequest, NextResponse } from "next/server";
import { discoverEShia } from "../../../tools/khateeb-studio/engine/eshiaDiscovery";

export const runtime = "nodejs";
export const maxDuration = 15;

function queryFromBody(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const query = (body as { query?: unknown }).query;
  return typeof query === "string" ? query : "";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.searchParams.get("q") ?? "";
  const result = await discoverEShia(query);
  return NextResponse.json(result, {
    status: result.status === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const result = await discoverEShia(queryFromBody(body));
  return NextResponse.json(result, {
    status: result.status === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
