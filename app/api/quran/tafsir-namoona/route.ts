import { get } from "@vercel/blob";
import { createHash } from "node:crypto";
import { brotliDecompressSync } from "node:zlib";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Corpus = {
  version: number;
  entries: Record<string, [string, string]>;
  verses: Array<[number, number, number | null, string]>;
};
type Loaded = { corpus: Corpus; index: Map<string, [number | null, string]> };

let corpusPromise: Promise<Loaded | null> | null = null;

async function loadCorpus(): Promise<Loaded | null> {
  const paths = [
    "qalam/tafsir-namoona/urdu-v9.json.br",
    "Tafseer_Namoona_Urdu_v9_for_Vercel_Blob.br",
  ];
  let compressed: Buffer | null = null;
  for (const pathname of paths) {
    const blob = await get(pathname, { access: "private" });
    if (blob?.statusCode === 200 && blob.stream) {
      compressed = Buffer.from(await new Response(blob.stream).arrayBuffer());
      break;
    }
  }
  if (!compressed) return null;
  if (createHash("sha256").update(compressed).digest("hex") !== "4645a268a658b61d691fef009c2958f8948414a7529b66cc2d23eee9317e8454") throw new Error("Tafsir corpus checksum mismatch");
  const corpus = JSON.parse(brotliDecompressSync(compressed).toString("utf8")) as Corpus;
  if (corpus.version !== 9 || corpus.verses.length !== 6236) throw new Error("Invalid tafsir corpus");
  const index = new Map<string, [number | null, string]>();
  for (const [surah, ayah, id, availability] of corpus.verses) {
    index.set(`${surah}:${ayah}`, [id, availability]);
  }
  return { corpus, index };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const surah = Number(url.searchParams.get("surah"));
  const ayah = Number(url.searchParams.get("ayah"));
  if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1 || ayah > 286) {
    return NextResponse.json({ error: "Invalid verse" }, { status: 400 });
  }
  if (process.env.QALAM_TAFSIR_NAMOONA_PUBLICATION_APPROVED !== "true") {
    return NextResponse.json({ status: "publication_pending" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    if (!corpusPromise) corpusPromise = loadCorpus();
    const loaded = await corpusPromise;
    if (!loaded) {
      corpusPromise = null;
      return NextResponse.json({ status: "corpus_not_uploaded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const record = loaded.index.get(`${surah}:${ayah}`);
    if (!record) return NextResponse.json({ error: "Unknown verse" }, { status: 404 });
    const [id, status] = record;
    if (status !== "unicode_apk" || id === null) {
      return NextResponse.json({ status, surah, ayah, text: null }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600" } });
    }
    const entry = loaded.corpus.entries[String(id)];
    if (!entry || !entry[1]?.trim()) return NextResponse.json({ status: "source_unavailable", text: null });
    return NextResponse.json({
      status: "unicode_apk",
      surah, ayah, sourceEntryId: id, heading: entry[0], text: entry[1],
      provenance: "Tafsir Namoona Urdu (app extracted text; requires print collation)"
    }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600" } });
  } catch {
    corpusPromise = null;
    return NextResponse.json({ status: "source_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
