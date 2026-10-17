import { brotliDecompressSync } from "node:zlib";
import { createHash } from "node:crypto";
import { ALL_BOOK_SOURCE_IDS, type BookManifest, type BookRecord, type BookSource } from "../../lib/knowledge/bookCorpus";
import { validateBookRecords } from "../../lib/knowledge/store";

const MAX_POINTER_BYTES = 256 * 1024;
const MAX_ROOT_MANIFEST_COMPRESSED_BYTES = 4 * 1024 * 1024;
const MAX_SOURCE_MANIFEST_COMPRESSED_BYTES = 4 * 1024 * 1024;
const MAX_SOURCE_COMPRESSED_BYTES = 16 * 1024 * 1024;
const MAX_RECORD_COMPRESSED_BYTES = 1024 * 1024;
const MAX_SOURCE_RAW_BYTES = 16 * 1024 * 1024;
const CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ITEMS = 64;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;

type StoredObject = { bytes: Buffer; expires: number };
const cache = new Map<string, StoredObject>();
let cacheBytes = 0;

type Pointer = {
  format: "qalam-book-library-r2-pointer-v1";
  revision: string;
  manifest: { key: string; bytes: number; sha256: string };
};
type SourceEntry = { source: BookSource; recordCount: number; manifest: { key: string; bytes: number; sha256: string } };
type RootManifest = { format: "qalam-book-library-r2-v1"; revision: string; recordCount: number; sources: SourceEntry[] };
type RecordEntry = { id: string; idHash: string; key: string; bytes: number; sha256: string; paragraphIds: string[] };
type SourceManifest = {
  format: "qalam-book-library-source-v1";
  revision: string;
  source: BookSource;
  recordCount: number;
  sourceObject: { key: string; bytes: number; sha256: string };
  searchIndex: { key: string; bytes: number; sha256: string };
  records: RecordEntry[];
};
type SearchRow = Omit<BookRecord, "paragraphs"> & { paragraphs: { id: string; text: string }[] };

export class BookLibraryR2Unavailable extends Error {
  constructor() { super("book-library-source-unavailable"); }
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function mirrorBase(env: Record<string, string | undefined>): { base: string; token: string } {
  let url: URL;
  try { url = new URL(env.QALAM_BOOK_LIBRARY_R2_MIRROR_URL ?? ""); }
  catch { throw new BookLibraryR2Unavailable(); }
  const token = (env.QALAM_BOOK_LIBRARY_R2_MIRROR_BEARER_TOKEN ?? "").trim();
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" || !token) {
    throw new BookLibraryR2Unavailable();
  }
  return { base: url.origin, token };
}

function cacheGet(key: string): Buffer | null {
  const found = cache.get(key);
  if (!found) return null;
  if (found.expires <= Date.now()) {
    cache.delete(key);
    cacheBytes -= found.bytes.length;
    return null;
  }
  cache.delete(key);
  cache.set(key, found);
  return found.bytes;
}

function cachePut(key: string, bytes: Buffer, ttlMs = CACHE_TTL_MS): void {
  if (bytes.length > MAX_CACHE_BYTES) return;
  const previous = cache.get(key);
  if (previous) cacheBytes -= previous.bytes.length;
  cache.delete(key);
  cache.set(key, { bytes, expires: Date.now() + ttlMs });
  cacheBytes += bytes.length;
  while (cache.size > MAX_CACHE_ITEMS || cacheBytes > MAX_CACHE_BYTES) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    const value = cache.get(oldest);
    cache.delete(oldest);
    if (value) cacheBytes -= value.bytes.length;
  }
}

async function getVerified(path: string, expected: { bytes: number; sha256: string }, maxBytes: number): Promise<Buffer> {
  if (!Number.isInteger(expected.bytes) || expected.bytes < 1 || expected.bytes > maxBytes || !/^[a-f0-9]{64}$/.test(expected.sha256)) {
    throw new BookLibraryR2Unavailable();
  }
  const { base, token } = mirrorBase(process.env);
  const cacheKey = `${base}:${path}:${expected.sha256}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new BookLibraryR2Unavailable();
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new BookLibraryR2Unavailable();
  }
  const length = Number(response.headers.get("content-length"));
  if (!Number.isInteger(length) || length !== expected.bytes || length > maxBytes) {
    await response.body?.cancel();
    throw new BookLibraryR2Unavailable();
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== expected.bytes || digest(bytes) !== expected.sha256) throw new BookLibraryR2Unavailable();
  cachePut(cacheKey, bytes);
  return bytes;
}

function decompressJson<T>(bytes: Buffer, maxOutputLength: number): T {
  try { return JSON.parse(brotliDecompressSync(bytes, { maxOutputLength }).toString("utf8")) as T; }
  catch { throw new BookLibraryR2Unavailable(); }
}

function assertPointer(value: unknown): asserts value is Pointer {
  const pointer = value as Pointer;
  if (!pointer || pointer.format !== "qalam-book-library-r2-pointer-v1" || !/^[a-f0-9]{64}$/.test(pointer.revision) ||
      pointer.manifest?.key !== `v1/${pointer.revision}/manifest.json.br` || !/^[a-f0-9]{64}$/.test(pointer.manifest.sha256)) {
    throw new BookLibraryR2Unavailable();
  }
}

function assertRootManifest(value: unknown, revision: string): asserts value is RootManifest {
  const manifest = value as RootManifest;
  if (!manifest || manifest.format !== "qalam-book-library-r2-v1" || manifest.revision !== revision ||
      !Number.isInteger(manifest.recordCount) || manifest.recordCount < 1 || !Array.isArray(manifest.sources) ||
      manifest.sources.length !== ALL_BOOK_SOURCE_IDS.length) throw new BookLibraryR2Unavailable();
  const ids = new Set<string>();
  for (const entry of manifest.sources) {
    const source = entry?.source;
    if (!source || !ALL_BOOK_SOURCE_IDS.includes(source.id as typeof ALL_BOOK_SOURCE_IDS[number]) || ids.has(source.id) ||
        !/^[a-f0-9]{64}$/.test(source.sha256) || !Number.isInteger(entry.recordCount) || entry.recordCount < 1 ||
        entry.manifest?.key !== `v1/${revision}/sources/${source.id}/manifest.json.br` ||
        !/^[a-f0-9]{64}$/.test(entry.manifest.sha256)) throw new BookLibraryR2Unavailable();
    ids.add(source.id);
  }
  if (ids.size !== ALL_BOOK_SOURCE_IDS.length || manifest.sources.reduce((sum, source) => sum + source.recordCount, 0) !== manifest.recordCount) {
    throw new BookLibraryR2Unavailable();
  }
}

async function currentManifest(): Promise<{ pointer: Pointer; manifest: RootManifest }> {
  const { base, token } = mirrorBase(process.env);
  const pointerUrl = `${base}/v1/current.json`;
  const cacheKey = `${base}:current-pointer`;
  let pointerBytes = cacheGet(cacheKey);
  if (!pointerBytes) {
    let response: Response;
    try { response = await fetch(pointerUrl, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }); }
    catch { throw new BookLibraryR2Unavailable(); }
    if (!response.ok) { await response.body?.cancel(); throw new BookLibraryR2Unavailable(); }
    const length = Number(response.headers.get("content-length"));
    if (!Number.isInteger(length) || length < 1 || length > MAX_POINTER_BYTES) { await response.body?.cancel(); throw new BookLibraryR2Unavailable(); }
    pointerBytes = Buffer.from(await response.arrayBuffer());
    if (pointerBytes.length !== length) throw new BookLibraryR2Unavailable();
    cachePut(cacheKey, pointerBytes, 15_000);
  }
  let pointer: Pointer;
  try { pointer = JSON.parse(pointerBytes.toString("utf8")) as Pointer; assertPointer(pointer); }
  catch { throw new BookLibraryR2Unavailable(); }
  const compressed = await getVerified(`/v1/${pointer.revision}/manifest.json.br`, pointer.manifest, MAX_ROOT_MANIFEST_COMPRESSED_BYTES);
  const manifest = decompressJson<RootManifest>(compressed, MAX_SOURCE_RAW_BYTES);
  assertRootManifest(manifest, pointer.revision);
  return { pointer, manifest };
}

async function sourceManifest(root: RootManifest, sourceId: string): Promise<SourceManifest> {
  const entry = root.sources.find(row => row.source.id === sourceId);
  if (!entry) throw new BookLibraryR2Unavailable();
  const compressed = await getVerified(`/v1/${root.revision}/sources/${sourceId}/manifest.json.br`, entry.manifest, MAX_SOURCE_MANIFEST_COMPRESSED_BYTES);
  const manifest = decompressJson<SourceManifest>(compressed, MAX_SOURCE_RAW_BYTES);
  if (manifest.format !== "qalam-book-library-source-v1" || manifest.revision !== root.revision ||
      manifest.source.id !== sourceId || manifest.source.sha256 !== entry.source.sha256 ||
      manifest.recordCount !== entry.recordCount || !Array.isArray(manifest.records) || manifest.records.length !== entry.recordCount ||
      manifest.sourceObject?.key !== `v1/${root.revision}/sources/${sourceId}/source.json.br` ||
      manifest.searchIndex?.key !== `v1/${root.revision}/sources/${sourceId}/search-index.json.br`) throw new BookLibraryR2Unavailable();
  return manifest;
}

export async function bookLibraryR2IsSelected(): Promise<boolean> {
  return (process.env.QALAM_BOOK_LIBRARY_READ_BACKEND ?? "").trim() === "cloudflare-r2";
}

export async function loadBookLibraryR2Catalog(): Promise<{ ready: true; revision: string; sources: BookSource[]; recordCount: number }> {
  const { manifest } = await currentManifest();
  return { ready: true, revision: manifest.revision, sources: manifest.sources.map(row => row.source), recordCount: manifest.recordCount };
}

export async function readBookRecordFromR2(sourceId: string, recordId: string): Promise<{ record: BookRecord; source: BookSource } | null> {
  const { manifest: root } = await currentManifest();
  const sourceInfo = await sourceManifest(root, sourceId);
  const row = sourceInfo.records.find(item => item.id === recordId);
  if (!row) return null;
  const expectedIdHash = digest(Buffer.from(recordId, "utf8"));
  if (row.idHash !== expectedIdHash || row.key !== `v1/${root.revision}/sources/${sourceId}/records/${expectedIdHash}.json.br`) {
    throw new BookLibraryR2Unavailable();
  }
  const bytes = await getVerified(`/v1/${root.revision}/sources/${sourceId}/records/${expectedIdHash}.json.br`, row, MAX_RECORD_COMPRESSED_BYTES);
  const record = decompressJson<BookRecord>(bytes, MAX_SOURCE_RAW_BYTES);
  try { validateBookRecords([record], sourceInfo.source); }
  catch { throw new BookLibraryR2Unavailable(); }
  if (record.id !== row.id || record.paragraphs.length !== row.paragraphIds.length ||
      record.paragraphs.some((paragraph, index) => paragraph.id !== row.paragraphIds[index])) throw new BookLibraryR2Unavailable();
  return { record, source: sourceInfo.source };
}

export async function readBookSourceFromR2(sourceId: string): Promise<{ records: BookRecord[]; source: BookSource }> {
  const { manifest: root } = await currentManifest();
  const sourceInfo = await sourceManifest(root, sourceId);
  const bytes = await getVerified(`/v1/${root.revision}/sources/${sourceId}/search-index.json.br`, sourceInfo.searchIndex, MAX_SOURCE_COMPRESSED_BYTES);
  const rows = decompressJson<SearchRow[]>(bytes, MAX_SOURCE_RAW_BYTES);
  if (!Array.isArray(rows) || rows.length !== sourceInfo.recordCount) throw new BookLibraryR2Unavailable();
  const records: BookRecord[] = rows.map(row => ({
    id: row.id,
    sourceId: row.sourceId,
    book: row.book,
    language: row.language,
    kind: row.kind,
    number: row.number,
    title: row.title,
    reference: row.reference,
    paragraphs: row.paragraphs,
    textSha256: row.textSha256,
  }));
  try { validateBookRecords(records, sourceInfo.source); }
  catch { throw new BookLibraryR2Unavailable(); }
  return { records, source: sourceInfo.source };
}

/** Test seam; production cache is bounded and keyed by immutable hashes. */
export function clearBookLibraryR2CacheForTests(): void {
  cache.clear();
  cacheBytes = 0;
}

export type { BookManifest };
