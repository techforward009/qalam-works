import { del, get, put } from "@vercel/blob";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// TEMPORARY PREVIEW-ONLY INGESTION ROUTE: remove before production merge.
const BASE = "qalam/tafsir-namoona/staging-v9";
const FINAL = "qalam/tafsir-namoona/urdu-v9.json.br";
const EXPECTED_SHA = "4645a268a658b61d691fef009c2958f8948414a7529b66cc2d23eee9317e8454";
const EXPECTED_SIZE = 6619362;
const PART_COUNT = 8;

export async function POST(request: Request) {
  const supplied = request.headers.get("x-tafsir-import-secret") ?? "";
  const expected = process.env.QALAM_TAFSIR_IMPORT_SECRET ?? "";
  if (!expected || !supplied || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob store not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("finalize") === "1") {
    const chunks: Buffer[] = [];
    const toDelete: string[] = [];
    for (let i = 0; i < PART_COUNT; i++) {
      const path = `${BASE}/part-${i}.bin`;
      const part = await get(path, { access: "private" });
      if (!part || part.statusCode !== 200 || !part.stream) {
        return NextResponse.json({ error: "Missing part", part: i }, { status: 409 });
      }
      const bytes = Buffer.from(await new Response(part.stream).arrayBuffer());
      chunks.push(bytes);
      toDelete.push(path);
    }
    const joined = Buffer.concat(chunks);
    const hash = createHash("sha256").update(joined).digest("hex");
    if (joined.length !== EXPECTED_SIZE || hash !== EXPECTED_SHA) {
      return NextResponse.json({ error: "Integrity check failed", size: joined.length }, { status: 422 });
    }
    await put(FINAL, joined, { access: "private", allowOverwrite: true, contentType: "application/octet-stream" });
    await del(toDelete);
    return NextResponse.json({ stored: true, size: joined.length, sha256: hash });
  }

  const index = Number(url.searchParams.get("part"));
  if (!Number.isInteger(index) || index < 0 || index >= PART_COUNT) {
    return NextResponse.json({ error: "Invalid part" }, { status: 400 });
  }
  if (Number(request.headers.get("content-length") || 0) > 1200000) {
    return NextResponse.json({ error: "Part too large" }, { status: 413 });
  }
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length < 200000 || bytes.length > 1200000) {
    return NextResponse.json({ error: "Invalid part size" }, { status: 413 });
  }
  await put(`${BASE}/part-${index}.bin`, bytes, {
    access: "private", allowOverwrite: true, contentType: "application/octet-stream",
  });
  return NextResponse.json({ received: index, size: bytes.length });
}
