/**
 * Safe per-surah Tafsir v10 reader for a private Cloudflare R2 Worker.
 * All 228 immutable shard checksums derive from the two owner-verified original
 * Brotli releases. No tafsir text or object-store credential enters source code.
 */
import { createHash } from "node:crypto";
import { brotliDecompressSync } from "node:zlib";
import { readTafsirMirror, type TafsirMirrorLanguage } from "./tafsirMirror";

type Language = TafsirMirrorLanguage;
type Verse = { refs: string[]; status: "direct" | "redirect" | "legacy" | "missing" };
type Topic = { title: string; text: string; sourceId: number | null };
type Entry = { topics: Topic[]; kind: "new_source" | "legacy_v9"; sourceKey: string };
export type SurahCorpus = {
  version: 10; language: Language; verseCount: number;
  verses: Record<string, Verse>; entries: Record<string, Entry>;
};
type ShardInfo = { surah: number; file: string; compressedBytes: number; sha256: string; verseCount: number; entryCount: number };
type Manifest = {
  format: "qalam-tafsir-v10-surah-shards-v1";
  languages: Record<Language, { originalSha256: string; verseCount: number; surahCount: number; shards: ShardInfo[] }>;
};
const MANIFEST_SHA256 = "3f45650bb760432fe5e43cb91d42a49927791ea9e411dc952c2b92c0f9a2daca";
const ORIGINAL_SHA256: Record<Language, string> = {
  ur: "119f8e96988a317df531a21ac8f271447e7c3a856f1ab11bac57cf5fb8a45c38",
  en: "6e08e6952e33a452f7f644c6462cdad3d8250741ef7f1445c3ae5d37becaed59",
};
const MAX_CACHE_SHARDS = 24;
let cachedManifest: Promise<Manifest> | null = null;
const shardCache = new Map<string, Promise<SurahCorpus>>();
function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
async function getVerifiedBytes(url: string, token: string | undefined, fetchImpl: typeof fetch): Promise<Buffer> {
  const bytes = await readTafsirMirror("ur", {urUrl:url, bearerToken:token}, fetchImpl);
  if (!bytes) throw new Error("Missing Tafsir shard");
  return bytes;
}
function assertManifest(value: unknown): asserts value is Manifest {
  if (!value || typeof value !== "object") throw new Error("Invalid Tafsir shard manifest");
  const doc = value as Manifest;
  if (doc.format !== "qalam-tafsir-v10-surah-shards-v1") throw new Error("Invalid Tafsir shard manifest format");
  for (const lang of ["ur", "en"] as const) {
    const d = doc.languages?.[lang];
    if (!d || d.originalSha256 !== ORIGINAL_SHA256[lang] || d.verseCount !== 6236 ||
        d.surahCount !== 114 || !Array.isArray(d.shards) || d.shards.length !== 114) {
      throw new Error("Invalid Tafsir shard manifest release");
    }
    let count = 0;
    for (let i=0;i<114;i++) {
      const shard = d.shards[i];
      if (!shard || shard.surah !== i+1 || shard.file !== `${lang}/${String(i+1).padStart(3,"0")}.json.br` ||
          !/^[0-9a-f]{64}$/.test(shard.sha256) ||
          !Number.isInteger(shard.compressedBytes) || shard.compressedBytes <= 0 || shard.compressedBytes > 4*1024*1024 ||
          !Number.isInteger(shard.verseCount) || shard.verseCount < 1 ||
          !Number.isInteger(shard.entryCount) || shard.entryCount < 0) {
        throw new Error("Invalid Tafsir shard manifest index");
      }
      count += shard.verseCount;
    }
    if (count !== 6236) throw new Error("Incomplete Tafsir shard manifest");
  }
}
function mirrorBase(base: string): string {
  let parsed: URL;
  try { parsed = new URL(base); } catch { throw new Error("Invalid Tafsir shard mirror base"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash ||
      parsed.pathname !== "/" || !parsed.hostname) {
    throw new Error("Invalid Tafsir shard mirror base");
  }
  return parsed.origin;
}
async function readManifest(base: string, token: string | undefined, fetchImpl: typeof fetch): Promise<Manifest> {
  const bytes = await getVerifiedBytes(`${base}/shards/manifest-v1.json`,token,fetchImpl);
  if (sha256(bytes) !== MANIFEST_SHA256) throw new Error("Tafsir manifest integrity failure");
  const parsed: unknown = JSON.parse(bytes.toString("utf8"));
  assertManifest(parsed);
  return parsed;
}
function safeSurah(s: number): void {
  if (!Number.isInteger(s) || s<1 || s>114) throw new Error("Invalid Tafsir shard surah");
}
async function loadOne(
  language: Language,
  surah: number,
  manifest: Manifest,
  base: string,
  token: string | undefined,
  fetchImpl: typeof fetch,
): Promise<SurahCorpus> {
  const record = manifest.languages[language].shards[surah-1];
  const compressed = await getVerifiedBytes(`${base}/shards/${record.file}`,token,fetchImpl);
  if (compressed.length !== record.compressedBytes || sha256(compressed) !== record.sha256) {
    throw new Error("Tafsir shard integrity failure");
  }
  const data = brotliDecompressSync(compressed, {maxOutputLength:8*1024*1024});
  const corpus = JSON.parse(data.toString("utf8")) as SurahCorpus & {surah?: number};
  if (corpus.version !== 10 || corpus.language !== language || corpus.surah !== surah ||
      corpus.verseCount !== record.verseCount ||
      Object.keys(corpus.verses ?? {}).length !== record.verseCount ||
      Object.keys(corpus.entries ?? {}).length !== record.entryCount) {
    throw new Error("Invalid Tafsir shard document");
  }
  for (const [verseKey, verse] of Object.entries(corpus.verses)) {
    if (!verseKey.startsWith(`${surah}:`) || !Array.isArray(verse.refs) ||
        !verse.refs.every(id=>Boolean(corpus.entries[id]))) {
      throw new Error("Invalid Tafsir shard verse references");
    }
  }
  return corpus;
}

/** Download only the requested surahs; supports Quran pages crossing surah boundaries. */
export async function loadTafsirSurahShards(
  language: Language,
  surahs: readonly number[],
  config: {baseUrl:string;bearerToken?:string},
  fetchImpl: typeof fetch = fetch,
): Promise<SurahCorpus> {
  const unique = [...new Set(surahs)];
  if (!unique.length || unique.length > 3) throw new Error("Unexpected Tafsir page surah count");
  unique.forEach(safeSurah);
  const base = mirrorBase(config.baseUrl);
  if (!cachedManifest) {
    cachedManifest = readManifest(base,config.bearerToken,fetchImpl);
    void cachedManifest.catch(()=> {cachedManifest=null;});
  }
  const manifest = await cachedManifest;
  const loaded = await Promise.all(unique.map((surah) => {
    const cacheKey = `${base}:${language}:${surah}`;
    const cached = shardCache.get(cacheKey);
    if (cached) {
      shardCache.delete(cacheKey);
      shardCache.set(cacheKey,cached);
      return cached;
    }
    const next = loadOne(language,surah,manifest,base,config.bearerToken,fetchImpl);
    shardCache.set(cacheKey,next);
    while(shardCache.size>MAX_CACHE_SHARDS) shardCache.delete(shardCache.keys().next().value!);
    void next.catch(()=>{if(shardCache.get(cacheKey)===next) shardCache.delete(cacheKey);});
    return next;
  }));
  const verses: SurahCorpus["verses"] = {};
  const entries: SurahCorpus["entries"] = {};
  for (const shard of loaded) {
    Object.assign(verses,shard.verses);
    Object.assign(entries,shard.entries);
  }
  return {version:10,language,verseCount:Object.keys(verses).length,verses,entries};
}

/** Only used in isolated unit tests to prevent cross-test cache interference. */
export function resetTafsirShardCacheForTests(): void {
  cachedManifest = null;
  shardCache.clear();
}
