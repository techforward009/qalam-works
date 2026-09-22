/**
 * Strict parse for Research Engine stored corpora.
 * Isolated from notes-store parseResearchProject.
 */
import {
  chunkId,
  pageId,
  type ChunkContentType,
  type DocumentChunk,
  type DocumentPage,
  type ExtractionMethod,
  type FailureCode,
  type ProcessingStatus,
  type ResearchDocument,
  type ResearchDocumentLanguage,
} from "../types/document";

export const ENGINE_STORE_SCHEMA_VERSION = 1 as const;

export type StoredCorpus = {
  schemaVersion: typeof ENGINE_STORE_SCHEMA_VERSION;
  document: ResearchDocument;
  pages: DocumentPage[];
  chunks: DocumentChunk[];
};

const LANGS = new Set<ResearchDocumentLanguage>(["ur", "ar", "fa", "en", "mixed", "unknown"]);
const STATUSES = new Set<ProcessingStatus>(["pending", "processing", "ready", "failed"]);
const FAILURES = new Set<FailureCode>(["empty", "corrupt", "unsupported", "internal"]);
const METHODS = new Set<ExtractionMethod>(["pdf-text", "docx", "plain", "markdown"]);
const CONTENT = new Set<ChunkContentType>([
  "paragraph",
  "heading",
  "table",
  "caption",
  "footnote",
  "list",
  "quote",
]);
const DIRS = new Set<DocumentChunk["direction"]>(["rtl", "ltr", "auto"]);

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}

function parseDocument(raw: unknown): ResearchDocument | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const filename = str(raw.filename);
  const mimeType = str(raw.mimeType);
  const language = raw.language;
  const pageCount = num(raw.pageCount);
  const createdAt = str(raw.createdAt);
  const processingStatus = raw.processingStatus;
  if (!id || filename === null || mimeType === null || createdAt === null) return null;
  if (pageCount === null || pageCount < 0) return null;
  if (typeof language !== "string" || !LANGS.has(language as ResearchDocumentLanguage)) return null;
  if (typeof processingStatus !== "string" || !STATUSES.has(processingStatus as ProcessingStatus)) {
    return null;
  }
  const doc: ResearchDocument = {
    id,
    filename,
    mimeType,
    language: language as ResearchDocumentLanguage,
    pageCount,
    createdAt,
    processingStatus: processingStatus as ProcessingStatus,
  };
  if (raw.failureCode !== undefined) {
    if (typeof raw.failureCode !== "string" || !FAILURES.has(raw.failureCode as FailureCode)) {
      return null;
    }
    doc.failureCode = raw.failureCode as FailureCode;
  }
  if (raw.chunkerVersion !== undefined) {
    const ver = str(raw.chunkerVersion);
    if (ver === null) return null;
    doc.chunkerVersion = ver;
  }
  return doc;
}

function parsePage(raw: unknown, documentId: string, seen: Set<number>): DocumentPage | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const docId = str(raw.documentId);
  const pageNumber = num(raw.pageNumber);
  const rawText = str(raw.rawText);
  const normalizedText = str(raw.normalizedText);
  const extractionMethod = raw.extractionMethod;
  if (!id || !docId || pageNumber === null || rawText === null || normalizedText === null) return null;
  if (docId !== documentId) return null;
  if (pageNumber < 1) return null;
  if (seen.has(pageNumber)) return null;
  if (id !== pageId(documentId, pageNumber)) return null;
  if (typeof extractionMethod !== "string" || !METHODS.has(extractionMethod as ExtractionMethod)) {
    return null;
  }
  seen.add(pageNumber);
  return {
    id,
    documentId: docId,
    pageNumber,
    rawText,
    normalizedText,
    extractionMethod: extractionMethod as ExtractionMethod,
  };
}

function parseChunk(raw: unknown, documentId: string, seen: Set<string>): DocumentChunk | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const docId = str(raw.documentId);
  const pageNumber = num(raw.pageNumber);
  const chunkIndex = num(raw.chunkIndex);
  const rawText = str(raw.rawText);
  const normalizedText = str(raw.normalizedText);
  const language = raw.language;
  const direction = raw.direction;
  const contentType = raw.contentType;
  if (!id || !docId || pageNumber === null || chunkIndex === null) return null;
  if (rawText === null || normalizedText === null) return null;
  if (docId !== documentId) return null;
  if (pageNumber < 1 || chunkIndex < 1) return null;
  if (id !== chunkId(documentId, pageNumber, chunkIndex)) return null;
  if (seen.has(id)) return null;
  if (typeof language !== "string" || !LANGS.has(language as ResearchDocumentLanguage)) return null;
  if (typeof direction !== "string" || !DIRS.has(direction as DocumentChunk["direction"])) return null;
  if (typeof contentType !== "string" || !CONTENT.has(contentType as ChunkContentType)) return null;
  seen.add(id);
  const chunk: DocumentChunk = {
    id,
    documentId: docId,
    pageNumber,
    chunkIndex,
    rawText,
    normalizedText,
    language: language as ResearchDocumentLanguage,
    direction: direction as DocumentChunk["direction"],
    contentType: contentType as ChunkContentType,
  };
  if (raw.heading !== undefined) {
    const heading = str(raw.heading);
    if (heading === null) return null;
    chunk.heading = heading;
  }
  if (raw.paragraphIndex !== undefined) {
    const paragraphIndex = num(raw.paragraphIndex);
    if (paragraphIndex === null || paragraphIndex < 1) return null;
    chunk.paragraphIndex = paragraphIndex;
  }
  return chunk;
}

/** Null on any malformed field, id mismatch, or duplicate. No silent repair. */
export function parseStoredCorpus(raw: unknown): StoredCorpus | null {
  if (!isObj(raw)) return null;
  if (raw.schemaVersion !== ENGINE_STORE_SCHEMA_VERSION) return null;
  const document = parseDocument(raw.document);
  if (!document) return null;
  if (!Array.isArray(raw.pages) || !Array.isArray(raw.chunks)) return null;

  const pageNums = new Set<number>();
  const pages: DocumentPage[] = [];
  for (const item of raw.pages) {
    const page = parsePage(item, document.id, pageNums);
    if (!page) return null;
    pages.push(page);
  }
  if (document.pageCount !== pages.length) return null;

  const chunkIds = new Set<string>();
  const chunks: DocumentChunk[] = [];
  for (const item of raw.chunks) {
    const chunk = parseChunk(item, document.id, chunkIds);
    if (!chunk) return null;
    if (chunk.pageNumber > document.pageCount) return null;
    chunks.push(chunk);
  }

  return { schemaVersion: ENGINE_STORE_SCHEMA_VERSION, document, pages, chunks };
}
