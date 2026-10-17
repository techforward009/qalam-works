#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, brotliDecompressSync, gunzipSync, constants } from "node:zlib";
import JSZip from "jszip";

const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024;
const MAX_MEMBER_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const SOURCE_IDS = new Set([
  "nahj-ar", "nahj-ur", "sahifa-ar", "sahifa-ur", "sahifa-en",
  "nahj-sermons-en", "nahj-letters-sayings-en",
  "kafi-v1-ar", "kafi-v2-ar", "kafi-v3-ar", "kafi-v4-ar",
  "kafi-v5-ar", "kafi-v6-ar", "kafi-v7-ar", "kafi-v8-ar",
]);

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const jsonBytes = value => Buffer.from(JSON.stringify(value), "utf8");
const compress = bytes => brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } });

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) throw new Error(`Unexpected argument: ${argv[i]}`);
    const key = argv[i].slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    out[key] = value;
    i++;
  }
  for (const name of ["archive", "originals", "output"]) if (!out[name]) throw new Error(`Required: --${name} <path>`);
  return out;
}

function assertManifest(value) {
  if (!value || value.format !== "qalam-foundational-corpus" || value.version !== 1 ||
      !Array.isArray(value.sources) || value.sources.length !== 15 ||
      !Number.isInteger(value.recordCount) || value.recordCount < 1) throw new Error("invalid-source-manifest");
  const ids = new Set();
  for (const source of value.sources) {
    if (!SOURCE_IDS.has(source?.id) || ids.has(source.id) || !/^[a-f0-9]{64}$/.test(source.sha256) ||
        typeof source.filename !== "string" || path.basename(source.filename) !== source.filename ||
        !["ar", "ur", "en"].includes(source.language) || !["nahj", "sahifa", "kafi"].includes(source.book)) {
      throw new Error("invalid-source-manifest");
    }
    ids.add(source.id);
  }
  if (ids.size !== SOURCE_IDS.size || [...SOURCE_IDS].some(id => !ids.has(id))) throw new Error("incomplete-source-manifest");
}

function validateRecords(records, source) {
  if (!Array.isArray(records) || !records.length || records.length > 3000) throw new Error(`invalid-records:${source.id}`);
  const ids = new Set();
  const result = [];
  for (const record of records) {
    const paragraphs = record?.paragraphs;
    if (!record || typeof record.id !== "string" || !record.id.startsWith(`${source.id}:`) || ids.has(record.id) ||
        record.sourceId !== source.id || record.book !== source.book || record.language !== source.language ||
        typeof record.title !== "string" || typeof record.kind !== "string" ||
        !record.reference || record.reference.sourceId !== source.id || record.reference.section !== record.kind ||
        record.reference.number !== record.number || typeof record.reference.locator !== "string" ||
        !Array.isArray(paragraphs) || paragraphs.length > 5000 ||
        !paragraphs.every((p, i) => p && p.id === `${record.id}:p${i + 1}` && typeof p.text === "string") ||
        record.textSha256 !== sha256(Buffer.from(paragraphs.map(p => p.text).join("\n"), "utf8"))) {
      throw new Error(`invalid-record:${source.id}`);
    }
    ids.add(record.id);
    result.push(record);
  }
  return result;
}

async function boundedZipEntry(zip, name, limit) {
  const entry = zip.file(name);
  if (!entry) throw new Error(`missing-entry:${name}`);
  const bytes = await entry.async("nodebuffer");
  if (!bytes.length || bytes.length > limit) throw new Error(`entry-size:${name}`);
  return bytes;
}

async function saveObject(root, key, bytes) {
  const destination = path.join(root, ...key.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx" });
  return { key, bytes: bytes.length, sha256: sha256(bytes) };
}

async function prepare({ archive: archivePath, originals: originalsPath, output: outputPath }) {
  const archiveBytes = await readFile(archivePath);
  if (!archiveBytes.length || archiveBytes.length > MAX_ARCHIVE_BYTES) throw new Error("invalid-archive-size");
  const zip = await JSZip.loadAsync(archiveBytes, { checkCRC32: true });
  const sourceManifestBytes = await boundedZipEntry(zip, "manifest.json", 256 * 1024);
  const sourceManifest = JSON.parse(sourceManifestBytes.toString("utf8"));
  assertManifest(sourceManifest);

  const revision = sha256(archiveBytes);
  const revisionRoot = `v1/${revision}`;
  const output = path.resolve(outputPath);
  await mkdir(output, { recursive: true });
  const objectRows = [];
  const sources = [];
  let totalRecords = 0;

  for (const source of sourceManifest.sources) {
    const originalPath = path.join(path.resolve(originalsPath), source.filename);
    const original = await readFile(originalPath);
    if (sha256(original) !== source.sha256) throw new Error(`original-sha256-mismatch:${source.id}`);

    const gzipBytes = await boundedZipEntry(zip, `${source.id}.json.gz`, MAX_MEMBER_BYTES);
    const rawSource = gunzipSync(gzipBytes, { maxOutputLength: MAX_SOURCE_BYTES });
    const records = validateRecords(JSON.parse(rawSource.toString("utf8")), source);
    const fullBytes = compress(jsonBytes(records));
    const fullKey = `${revisionRoot}/sources/${source.id}/source.json.br`;
    const fullInfo = await saveObject(output, fullKey, fullBytes);
    objectRows.push(fullInfo);

    const recordRows = [];
    for (const record of records) {
      const sourceBytes = jsonBytes(record);
      const encoded = compress(sourceBytes);
      const recordIdHash = sha256(Buffer.from(record.id, "utf8"));
      const key = `${revisionRoot}/sources/${source.id}/records/${recordIdHash}.json.br`;
      const stored = await saveObject(output, key, encoded);
      const row = {
        id: record.id,
        idHash: recordIdHash,
        title: record.title,
        kind: record.kind,
        number: record.number,
        reference: record.reference,
        paragraphIds: record.paragraphs.map(p => p.id),
        key,
        bytes: stored.bytes,
        sha256: stored.sha256,
      };
      recordRows.push(row);
      objectRows.push(stored);
      // Verify the compressor/decoder round-trip without normalizing source text.
      const roundTrip = JSON.parse(brotliDecompressSync(encoded, { maxOutputLength: MAX_SOURCE_BYTES }).toString("utf8"));
      if (roundTrip.id !== record.id || roundTrip.paragraphs.length !== record.paragraphs.length ||
          roundTrip.paragraphs.some((p, i) => p.id !== record.paragraphs[i].id || p.text !== record.paragraphs[i].text)) {
        throw new Error(`text-roundtrip-failed:${record.id}`);
      }
    }
    totalRecords += records.length;

    const searchIndex = records.map(record => ({
      id: record.id,
      title: record.title,
      kind: record.kind,
      number: record.number,
      language: record.language,
      book: record.book,
      paragraphs: record.paragraphs,
      reference: record.reference,
      textSha256: record.textSha256,
    }));
    const searchBytes = compress(jsonBytes(searchIndex));
    const searchKey = `${revisionRoot}/sources/${source.id}/search-index.json.br`;
    const searchInfo = await saveObject(output, searchKey, searchBytes);
    objectRows.push(searchInfo);

    const sourceManifest = {
      format: "qalam-book-library-source-v1",
      revision,
      source,
      recordCount: records.length,
      sourceObject: fullInfo,
      searchIndex: searchInfo,
      records: recordRows,
    };
    const sourceManifestBytes = compress(jsonBytes(sourceManifest));
    const sourceManifestKey = `${revisionRoot}/sources/${source.id}/manifest.json.br`;
    const sourceManifestInfo = await saveObject(output, sourceManifestKey, sourceManifestBytes);
    objectRows.push(sourceManifestInfo);

    const originalKey = `recovery/${revision}/originals/${source.id}/${source.filename}`;
      objectRows.push({ ...await saveObject(output, originalKey, original), role: "recoverable-original", sourceId: source.id, sourceSha256: source.sha256 });
    sources.push({
      source,
      recordCount: records.length,
      manifest: sourceManifestInfo,
    });
  }
  if (totalRecords !== sourceManifest.recordCount) throw new Error("record-count-mismatch");

  const recoveryArchiveKey = `recovery/${revision}/Qalam-Foundational-Corpus-With-Kafi.zip`;
  objectRows.push(await saveObject(output, recoveryArchiveKey, archiveBytes));
  const manifest = {
    format: "qalam-book-library-r2-v1",
    revision,
    createdFrom: { format: sourceManifest.format, version: sourceManifest.version, sourceCount: sourceManifest.sources.length, recordCount: totalRecords },
    sources,
    recordCount: totalRecords,
    recovery: { archive: recoveryArchiveKey, originals: sources.map(row => `recovery/${revision}/originals/${row.source.id}/${row.source.filename}`) },
  };
  const manifestBytes = compress(jsonBytes(manifest));
  const manifestKey = `${revisionRoot}/manifest.json.br`;
  const manifestInfo = await saveObject(output, manifestKey, manifestBytes);
  objectRows.push(manifestInfo);
  const pointer = {
    format: "qalam-book-library-r2-pointer-v1",
    revision,
    manifest: manifestInfo,
  };
  const pointerBytes = jsonBytes(pointer);
  await mkdir(path.dirname(path.join(output, "current.json")), { recursive: true });
  await writeFile(path.join(output, "current.json"), pointerBytes, { flag: "wx" });
  const report = {
    format: "qalam-book-library-migration-report-v1",
    revision,
    sourceArchive: { bytes: archiveBytes.length, sha256: revision },
    sourceCount: sources.length,
    recordCount: totalRecords,
    objectCount: objectRows.length,
    outputBytes: objectRows.reduce((n, row) => n + row.bytes, 0),
    verifiedOriginalSources: objectRows.filter(row => row.role === "recoverable-original").map(row => ({ id: row.sourceId, filename: sources.find(source => source.source.id === row.sourceId)?.source.filename, bytes: row.bytes, sha256: row.sourceSha256 })),
    objects: objectRows,
    activation: { key: "current.json", sha256: sha256(pointerBytes), uploadLast: true },
  };
  await writeFile(path.join(output, "migration-report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  return report;
}

try {
  const result = await prepare(args(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify({
    revision: result.revision,
    sources: result.sourceCount,
    records: result.recordCount,
    objects: result.objectCount,
    outputBytes: result.outputBytes,
    activation: "current.json is emitted separately and must be uploaded last after object verification",
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "migration-preparation-failed"}\n`);
  process.exitCode = 1;
}
