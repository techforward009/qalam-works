/**
 * Research Engine data model (Phase A).
 * Isolated from the notes-store types in app/tools/research-studio/utils/.
 */

export type ResearchDocumentLanguage = "ur" | "ar" | "fa" | "en" | "mixed" | "unknown";

export type ProcessingStatus = "pending" | "processing" | "ready" | "failed";

export type FailureCode = "empty" | "corrupt" | "unsupported" | "internal";

export type ExtractionMethod = "pdf-text" | "docx" | "plain" | "markdown";

export type ChunkContentType =
  | "paragraph"
  | "heading"
  | "table"
  | "caption"
  | "footnote"
  | "list"
  | "quote";

export type ResearchDocument = {
  id: string;
  filename: string;
  mimeType: string;
  language: ResearchDocumentLanguage;
  pageCount: number;
  createdAt: string;
  processingStatus: ProcessingStatus;
  failureCode?: FailureCode;
};

export type DocumentPage = {
  id: string;
  documentId: string;
  pageNumber: number;
  rawText: string;
  normalizedText: string;
  extractionMethod: ExtractionMethod;
};

export type DocumentChunk = {
  id: string;
  documentId: string;
  pageNumber: number;
  chunkIndex: number;
  rawText: string;
  normalizedText: string;
  heading?: string;
  paragraphIndex?: number;
  language: ResearchDocumentLanguage;
  direction: "rtl" | "ltr" | "auto";
  contentType: ChunkContentType;
};

export type Citation = {
  documentId: string;
  pageNumber: number;
  chunkId: string;
  quote: string;
};

export type EvidenceGateReason =
  | "sufficient"
  | "weak_retrieval"
  | "no_evidence"
  | "conflicting_evidence";

export type ResearchAnswer = {
  answered: boolean;
  answer: string;
  citations: Citation[];
  evidence: {
    chunksUsed: number;
    reason?: EvidenceGateReason;
  };
};

export const EXTRACTOR_VERSION = "1";

export function pageId(documentId: string, pageNumber: number): string {
  return `${documentId}:p${pageNumber}`;
}

/** Immutable chunk id: `{documentId}:p{page}:c{chunk}` */
export function chunkId(documentId: string, pageNumber: number, chunkIndex: number): string {
  return `${documentId}:p${pageNumber}:c${chunkIndex}`;
}

export function generateDocumentId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `doc_${hex}`;
}
