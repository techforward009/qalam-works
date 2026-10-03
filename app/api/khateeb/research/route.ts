import { NextResponse } from "next/server";
import { researchKhateebTopic } from "../../../tools/khateeb-studio/engine/researchEngine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 400 },
    );
  }

  const body = payload as {
    query?: unknown;
    locale?: unknown;
    maxEvidence?: unknown;
  };

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2 || query.length > 200) {
    return NextResponse.json(
      { error: "invalid_query" },
      { status: 400 },
    );
  }

  const locale = body.locale === "en" ? "en" : "ur";
  const maxEvidence =
    typeof body.maxEvidence === "number" && Number.isFinite(body.maxEvidence)
      ? body.maxEvidence
      : undefined;

  return NextResponse.json(
    researchKhateebTopic({ query, locale, maxEvidence }),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
