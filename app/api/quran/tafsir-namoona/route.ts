import { get } from "@vercel/blob";
import { getVercelOidcToken } from "@vercel/oidc";
import { createHash } from "node:crypto";
import { brotliDecompressSync } from "node:zlib";
import { NextResponse } from "next/server";
import { indexTafsirCoverage, tafsirCoverageForRefs } from "../../../quran/reader/tafsirVerseCoverage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Language = "ur" | "en";
type Topic = { title: string; text: string; sourceId: number | null };
type Entry = { topics: Topic[]; kind: "new_source" | "legacy_v9"; sourceKey: string };
type Verse = { refs: string[]; status: "direct" | "redirect" | "legacy" | "missing" };
type CorpusV10 = {
  version: 10;
  language: Language;
  verseCount: number;
  verses: Record<string, Verse>;
  entries: Record<string, Entry>;
};
type CorpusV9 = {
  version: number;
  entries: Record<string, [string, string]>;
  verses: Array<[number, number, number | null, string]>;
};

const RELEASE: Record<Language, { path: string; digest: string }> = {
  ur: {
    path: "qalam/tafsir-namoona/urdu-v10-reviewed-20261015.json.br",
    digest: "8cf7d265873f93d6987882b5c616a0267a7caa94304075c88d4dc57150c2f1e7",
  },
  en: {
    path: "qalam/tafsir-namoona/english-v10.json.br",
    digest: "6e08e6952e33a452f7f644c6462cdad3d8250741ef7f1445c3ae5d37becaed59",
  },
};
const V9_DIGEST = "4645a268a658b61d691fef009c2958f8948414a7529b66cc2d23eee9317e8454";
const v10Cache = new Map<Language, Promise<CorpusV10 | null>>();
const coverageCache = new WeakMap<CorpusV10, Map<string, string[]>>();
let v9Cache: Promise<{ corpus: CorpusV9; index: Map<string, [number | null, string]> } | null> | null = null;

async function loadBlob(paths: readonly string[]): Promise<Buffer | null> {
  for (const path of paths) {
    const blob = await get(path, { access: "private" });
    if (blob?.statusCode === 200 && blob.stream) {
      return Buffer.from(await new Response(blob.stream).arrayBuffer());
    }
  }
  return null;
}
/** Read v10 only from the already-linked private qalam-research store. Preserve v9's original store. */
async function loadResearchBlob(path: string): Promise<Buffer | null> {
  const storeId = process.env.QALAM_RESEARCH_STORE_ID?.trim();
  if (!storeId) throw new Error("Tafsir research store is not configured");
  let oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!oidcToken) oidcToken = (await getVercelOidcToken()).trim();
  if (!oidcToken) throw new Error("Tafsir research store authorization unavailable");
  const blob = await get(path, { access: "private", storeId, oidcToken, useCache: false });
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null;
  if (blob.blob.pathname !== path) throw new Error("Tafsir source path mismatch");
  return Buffer.from(await new Response(blob.stream).arrayBuffer());
}

function checkHash(bytes: Buffer, expected: string): void {
  if (createHash("sha256").update(bytes).digest("hex") !== expected) {
    throw new Error("Tafsir source integrity failure");
  }
}
async function loadV10(language: Language): Promise<CorpusV10 | null> {
  const file = await loadResearchBlob(RELEASE[language].path);
  if (!file) return null;
  checkHash(file, RELEASE[language].digest);
  const corpus = JSON.parse(brotliDecompressSync(file).toString("utf8")) as CorpusV10;
  if (corpus.version !== 10 || corpus.language !== language || corpus.verseCount !== 6236 ||
      Object.keys(corpus.verses).length !== 6236) {
    throw new Error("Invalid tafsir v10 corpus");
  }
  for (const row of Object.values(corpus.verses)) {
    if (!row.refs.every((id) => Boolean(corpus.entries[id]))) {
      throw new Error("Unresolved tafsir reference");
    }
  }
  return corpus;
}
async function loadV9() {
  const file = await loadBlob([
    "qalam/tafsir-namoona/urdu-v9.json.br",
    "Tafseer_Namoona_Urdu_v9_for_Vercel_Blob.br",
  ]);
  if (!file) return null;
  checkHash(file, V9_DIGEST);
  const corpus = JSON.parse(brotliDecompressSync(file).toString("utf8")) as CorpusV9;
  if (corpus.version !== 9 || corpus.verses.length !== 6236) {
    throw new Error("Invalid tafsir v9 corpus");
  }
  const index = new Map<string, [number | null, string]>();
  for (const [s, a, id, status] of corpus.verses) index.set(`${s}:${a}`, [id, status]);
  return { corpus, index };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const surah = Number(query.get("surah"));
  const ayah = Number(query.get("ayah"));
  const requested = query.get("lang") ?? "ur";
  if (requested !== "ur" && requested !== "en") {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }
  const language: Language = requested;
  if (!Number.isInteger(surah) || surah < 1 || surah > 114 ||
      !Number.isInteger(ayah) || ayah < 1 || ayah > 286) {
    return NextResponse.json({ error: "Invalid verse" }, { status: 400 });
  }
  if (process.env.QALAM_TAFSIR_NAMOONA_PUBLICATION_APPROVED !== "true") {
    return NextResponse.json({ status: "publication_pending" }, { status: 503 });
  }
  const useV10 = process.env.QALAM_TAFSIR_NAMOONA_RELEASE === "v10";
  if (language === "en" && (!useV10 || process.env.QALAM_TAFSIR_NAMOONA_EN_PUBLICATION_APPROVED !== "true")) {
    return NextResponse.json({ status: "publication_pending" }, { status: 503 });
  }
  try {
    const key = `${surah}:${ayah}`;
    if (useV10) {
      if (!v10Cache.has(language)) v10Cache.set(language, loadV10(language));
      const corpus = await v10Cache.get(language)!;
      if (!corpus) {
        v10Cache.delete(language);
        return NextResponse.json({ status: "corpus_not_uploaded" }, { status: 503 });
      }
      // Quran page mode: retrieve every distinct tafsir source unit for the
      // actual page ayahs, not just the ayah used to navigate to that page.
      // The book remains private and is read using the same verified corpus.
      const pageVerseParam = query.get("verses");
      if (pageVerseParam !== null) {
        const pageKeys = pageVerseParam.split(",").map((value) => value.trim());
        if (!pageKeys.length || pageKeys.length > 80 || new Set(pageKeys).size !== pageKeys.length ||
          !pageKeys.includes(key) ||
          pageKeys.some((verseKey) => !/^[0-9]{1,3}:[0-9]{1,3}$/.test(verseKey) || !corpus.verses[verseKey])) {
          return NextResponse.json({ error: "Invalid Quran page ayah selection" }, { status: 400 });
        }
        let coverageIndex = coverageCache.get(corpus);
        if (!coverageIndex) {
          coverageIndex = indexTafsirCoverage(corpus.verses);
          coverageCache.set(corpus, coverageIndex);
        }
        const bySource = new Map<string, {
          sourceKey: string;
          verseKeysOnPage: string[];
          coverage: string[];
          topics: Topic[];
        }>();
        for (const verseKey of pageKeys) {
          for (const sourceKey of corpus.verses[verseKey].refs) {
            const source = corpus.entries[sourceKey];
            if (!source?.topics.length) continue;
            const prior = bySource.get(sourceKey);
            if (prior) {
              if (!prior.verseKeysOnPage.includes(verseKey)) prior.verseKeysOnPage.push(verseKey);
            } else {
              bySource.set(sourceKey, {
                sourceKey,
                verseKeysOnPage: [verseKey],
                coverage: [...(coverageIndex.get(sourceKey) ?? [])],
                topics: source.topics,
              });
            }
          }
        }
        return NextResponse.json({
          status: bySource.size ? "unicode_apk" : "source_unavailable",
          version: 10, language, surah, ayah,
          pageVerseKeys: pageKeys,
          sections: [...bySource.values()],
          provenance: "Tafsir Namoona — original distinct commentary source sections for the Quran page",
        }, { headers: { "Cache-Control": "private, max-age=60" } });
      }
      const entryIndex = corpus.verses[key];
      if (!entryIndex) return NextResponse.json({ error: "Unknown verse" }, { status: 404 });
      const topics = entryIndex.refs.flatMap((id) => corpus.entries[id]?.topics ?? []);
      let coverageIndex = coverageCache.get(corpus);
      if (!coverageIndex) {
        coverageIndex = indexTafsirCoverage(corpus.verses);
        coverageCache.set(corpus, coverageIndex);
      }
      const coverage = tafsirCoverageForRefs(entryIndex.refs, coverageIndex);
      if (topics.length === 0) {
        return NextResponse.json({ status: "source_unavailable", language, surah, ayah, topics: [], text: null },
          { headers: { "Cache-Control": "public, max-age=60, s-maxage=600" } });
      }
      const first = entryIndex.refs[0];
      return NextResponse.json({
        status: "unicode_apk", version: 10, language, surah, ayah,
        heading: topics[0]?.title ?? "", topics, coverage,
        text: topics.map((topic) => topic.text).join("\n\n"),
        referenceAyah: first?.startsWith("legacy:") ? first.slice(7) : first,
        provenance: "Tafsir Namoona — separated commentary source, with recorded verse links",
      }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600" } });
    }
    if (language !== "ur") return NextResponse.json({ status: "publication_pending" }, { status: 503 });
    if (!v9Cache) v9Cache = loadV9();
    const loaded = await v9Cache;
    if (!loaded) { v9Cache = null; return NextResponse.json({ status: "corpus_not_uploaded" }, { status: 503 }); }
    const found = loaded.index.get(key);
    if (!found) return NextResponse.json({ error: "Unknown verse" }, { status: 404 });
    const [id, availability] = found;
    if (availability !== "unicode_apk" || id === null) {
      return NextResponse.json({ status: availability, surah, ayah, text: null });
    }
    const entry = loaded.corpus.entries[String(id)];
    if (!entry || !entry[1]?.trim()) return NextResponse.json({ status: "source_unavailable", text: null });
    return NextResponse.json({ status: "unicode_apk", version: 9, surah, ayah,
      sourceEntryId: id, heading: entry[0], text: entry[1],
      provenance: "Tafsir Namoona Urdu — legacy source" },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600" } });
  } catch {
    v10Cache.delete(language);
    v9Cache = null;
    return NextResponse.json({ status: "source_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}