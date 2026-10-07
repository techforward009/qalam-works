import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import JSZip from "jszip";
import { ALL_BOOK_SOURCE_IDS, BOOK_SOURCE_IDS, KAFI_SOURCE_IDS, type BookManifest, type BookRecord, type BookSource } from "./bookCorpus";
import type { ResearchBlobClient } from "../../tools/research-studio/engine";

export const MAX_BOOK_UPLOAD_BYTES = 8 * 1024 * 1024;
export const BOOK_POINTER_PATH = "khateeb-foundational/v1/current.json";
const ROOT = "khateeb-foundational/v1/";
const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const hash = (text: string | Uint8Array) => createHash("sha256").update(text).digest("hex");
export type BookCatalog = { revision: string; manifest: BookManifest; paths: Record<string, string> };
type Catalog = BookCatalog;

export function validateBookRecords(value: unknown, source: BookSource): BookRecord[] {
  if (!Array.isArray(value) || !value.length || value.length > 3000) throw new Error("invalid-records");
  const seen = new Set<string>();
  let lastSourceParagraph = 0;
  let lastBookTitle: string | null = null;
  for (const record of value as BookRecord[]) {
    if (!record || typeof record.id !== "string" || !record.id.startsWith(source.id + ":") || seen.has(record.id) || record.sourceId !== source.id || record.book !== source.book || record.language !== source.language || typeof record.title !== "string" || typeof record.kind !== "string" || !(typeof record.number === "number" && Number.isInteger(record.number) && record.number >= 0 || record.kind === "weekday-supplication" && typeof record.number === "string" && ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].includes(record.number)) || !record.reference || record.reference.sourceId !== source.id || record.reference.number !== record.number || record.reference.section !== record.kind || typeof record.reference.locator !== "string" || (record.reference.printPage !== null && (!Number.isInteger(record.reference.printPage) || record.reference.printPage < 1)) || !Array.isArray(record.paragraphs) || record.paragraphs.length > 5000 || !record.paragraphs.every((p, i) => p && p.id === `${record.id}:p${i + 1}` && typeof p.text === "string") || record.textSha256 !== hash(record.paragraphs.map(p => p.text).join("\n"))) throw new Error("invalid-record");
    if (source.book === "kafi") {
      const ref = record.reference.kafi;
      const volume = Number(source.id.match(/^kafi-v([1-8])-ar$/)?.[1]);
      if (!ref || ref.volume !== volume || !["chapter", "section", "front-matter"].includes(record.kind)
        || ![ref.bookTitle, ref.chapterTitle, ref.sectionTitle].every(t => t === null || typeof t === "string" && t.length > 0 && t.length <= 300)
        || !Array.isArray(ref.sourceParagraphs) || ref.sourceParagraphs.length !== record.paragraphs.length || !ref.sourceParagraphs.length
        || ref.sourceParagraphs.some((n, i) => !Number.isInteger(n) || n !== lastSourceParagraph + i + 1)
        || ref.chapterTitle !== null && !record.paragraphs.some(p => p.text === ref.chapterTitle)
        || ref.sectionTitle !== null && !record.paragraphs.some(p => p.text === ref.sectionTitle)) throw new Error("invalid-kafi-reference");
      for (const paragraph of record.paragraphs) if (paragraph.text.length <= 300 && paragraph.text.replace(/\p{Mn}/gu, "").trim().startsWith("كتاب ")) lastBookTitle = paragraph.text;
      if (ref.bookTitle !== lastBookTitle) throw new Error("invalid-kafi-reference");
      lastSourceParagraph = ref.sourceParagraphs.at(-1)!;
    } else if (record.reference.kafi !== undefined) throw new Error("invalid-kafi-reference");
    seen.add(record.id);
  }
  return value;
}
function validateManifest(value: unknown): BookManifest {
  const manifest = value as BookManifest;
  if (manifest?.format !== "qalam-foundational-corpus" || manifest.version !== 1 || !Array.isArray(manifest.sources) || (manifest.sources.length !== BOOK_SOURCE_IDS.length && manifest.sources.length !== ALL_BOOK_SOURCE_IDS.length) || !Number.isInteger(manifest.recordCount) || manifest.recordCount < 1 || manifest.recordCount > 10_000) throw new Error("invalid-manifest");
  const seen = new Set<string>();
  for (const source of manifest.sources) {
    if (!source || !ALL_BOOK_SOURCE_IDS.includes(source.id as typeof ALL_BOOK_SOURCE_IDS[number]) || seen.has(source.id) || !["nahj", "sahifa", "kafi"].includes(source.book) || !["ar", "ur", "en"].includes(source.language) || typeof source.filename !== "string" || !source.filename || !/^[a-f0-9]{64}$/.test(source.sha256) || (source.translator !== null && typeof source.translator !== "string")) throw new Error("invalid-source");
    if (source.book !== (source.id.startsWith("nahj") ? "nahj" : source.id.startsWith("kafi") ? "kafi" : "sahifa") || source.language !== (source.id.endsWith("-ar") ? "ar" : source.id.endsWith("-ur") ? "ur" : "en")) throw new Error("invalid-source");
    seen.add(source.id);
  }
  if (BOOK_SOURCE_IDS.some(id => !seen.has(id)) || manifest.sources.length === ALL_BOOK_SOURCE_IDS.length && KAFI_SOURCE_IDS.some(id => !seen.has(id))) throw new Error("invalid-manifest");
  return manifest;
}
export async function parseBookArchive(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_BOOK_UPLOAD_BYTES) throw new Error("invalid-size");
  const zip = await JSZip.loadAsync(bytes);
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("missing-manifest");
  // Archive members are read in memory; no supplied path is written to disk.
  async function boundedEntry(name: string, max: number) {
    const entry = zip.file(name);
    if (!entry) throw new Error("missing-entry");
    const chunks: Uint8Array[] = [];
    let length = 0;
    const stream = entry.nodeStream("nodebuffer") as Readable;
    return await new Promise<Uint8Array>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => {
        length += chunk.length;
        if (length > max) { stream.pause(); stream.destroy(); reject(new Error("entry-too-large")); return; }
        chunks.push(chunk);
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }
  const manifest = validateManifest(JSON.parse(Buffer.from(await boundedEntry("manifest.json", 256_000)).toString("utf8")));
  const records: Record<string, BookRecord[]> = {};
  let total = 0;
  for (const source of manifest.sources) {
    const compressed = await boundedEntry(`${source.id}.json.gz`, MAX_BOOK_UPLOAD_BYTES);
    const raw = gunzipSync(compressed, { maxOutputLength: MAX_SOURCE_BYTES });
    records[source.id] = validateBookRecords(JSON.parse(raw.toString("utf8")), source);
    total += records[source.id].length;
  }
  if (total !== manifest.recordCount) throw new Error("count-mismatch");
  return { manifest, records, revision: hash(bytes) };
}
export async function saveBookArchive(client: ResearchBlobClient, archive: Awaited<ReturnType<typeof parseBookArchive>>) {
  const paths: Record<string, string> = {};
  // Immutable version paths plus a last-written pointer keep failed imports from replacing the active corpus.
  await Promise.all(archive.manifest.sources.map(async source => {
    const path = `${ROOT}${archive.revision}/${source.id}.json`;
    await client.putObject(path, JSON.stringify({ encoding: "gzip-base64", data: gzipSync(JSON.stringify(archive.records[source.id])).toString("base64") }));
    paths[source.id] = path;
  }));
  const catalog: Catalog = { revision: archive.revision, manifest: archive.manifest, paths };
  await client.putObject(BOOK_POINTER_PATH, JSON.stringify(catalog));
  return catalog;
}
export async function loadBookCatalog(client: ResearchBlobClient): Promise<Catalog | null> {
  const raw = await client.getObject(BOOK_POINTER_PATH);
  if (!raw) return null;
  const catalog = JSON.parse(raw) as Catalog;
  validateManifest(catalog.manifest);
  if (!/^[a-f0-9]{64}$/.test(catalog.revision) || !catalog.paths || catalog.manifest.sources.some(s => catalog.paths[s.id] !== `${ROOT}${catalog.revision}/${s.id}.json`)) throw new Error("invalid-catalog");
  return catalog;
}
export async function loadBookSource(client: ResearchBlobClient, catalog: Catalog, sourceId: string): Promise<BookRecord[]> {
  const source = catalog.manifest.sources.find(s => s.id === sourceId);
  if (!source) throw new Error("invalid-source");
  const raw = await client.getObject(catalog.paths[sourceId]);
  if (!raw || raw.length > MAX_SOURCE_BYTES) throw new Error("missing-source");
  const stored = JSON.parse(raw);
  if (stored?.encoding !== "gzip-base64" || typeof stored.data !== "string") throw new Error("invalid-encoding");
  const decoded = gunzipSync(Buffer.from(stored.data, "base64"), { maxOutputLength: MAX_SOURCE_BYTES });
  return validateBookRecords(JSON.parse(decoded.toString("utf8")), source);
}
