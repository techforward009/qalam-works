/**
 * POST /api/research/documents
 * Multipart file → existing ingestion and chunking → process memory store.
 * Does not call a model and does not accept client evidence.
 */
import {
  createChunks,
  ingestDocument,
  makeStoredCorpus,
  sniffKind,
  type ResearchEngineStore,
} from "../../../tools/research-studio/engine";
import { getResearchApiStore } from "../memoryStore";

export { getResearchApiStore };

export const MAX_RESEARCH_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_RESEARCH_UPLOAD_PAGES = 400;

const BLOCKED_FIELDS = new Set([
  "rawtext",
  "normalizedtext",
  "pages",
  "chunks",
  "citations",
  "evidence",
  "documentid",
  "query",
]);

export type ResearchUploadResult = {
  id: string;
  documentId: string;
  filename: string;
  format: "pdf" | "docx" | "txt" | "md";
  pageCount: number;
  chunkCount: number;
  processingStatus: "ready";
};

export type ResearchUploadError = {
  error: string;
  code: "invalid" | "failed";
};

function invalid(): { status: 400; body: ResearchUploadError } {
  return { status: 400, body: { error: "Malformed request.", code: "invalid" } };
}

function failed(): { status: 500; body: ResearchUploadError } {
  return { status: 500, body: { error: "Research upload failed.", code: "failed" } };
}

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f]/g, "").slice(0, 180);
  return cleaned || "document";
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export async function handleResearchUpload(input: {
  form: FormData;
  store: ResearchEngineStore;
}): Promise<{ status: number; body: ResearchUploadResult | ResearchUploadError }> {
  try {
    const entries = [...input.form.entries()];
    if (entries.length !== 1 || entries[0][0] !== "file") return invalid();
    for (const [key] of entries) {
      if (BLOCKED_FIELDS.has(key.toLowerCase())) return invalid();
    }
    const uploaded = entries[0][1];
    if (!isUploadedFile(uploaded)) return invalid();

    const filename = safeFilename(uploaded.name);
    const bytes = new Uint8Array(await uploaded.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_RESEARCH_UPLOAD_BYTES) return invalid();

    const ingested = await ingestDocument({ bytes, filename });
    if (ingested.document.processingStatus !== "ready") return invalid();
    if (ingested.pages.length === 0 || ingested.pages.length > MAX_RESEARCH_UPLOAD_PAGES) return invalid();

    const format = sniffKind(filename, undefined, bytes);
    if (format === "unsupported") return invalid();

    const chunked = createChunks(ingested.pages);
    if (chunked.chunks.length === 0) return invalid();

    const corpus = makeStoredCorpus(ingested.document, ingested.pages, chunked.chunks, chunked.chunkerVersion);
    const saved = input.store.save(corpus);
    if (!saved.ok) return failed();

    return {
      status: 200,
      body: {
        id: ingested.document.id,
        documentId: ingested.document.id,
        filename: ingested.document.filename,
        format,
        pageCount: ingested.document.pageCount,
        chunkCount: chunked.chunks.length,
        processingStatus: "ready",
      },
    };
  } catch {
    return failed();
  }
}
