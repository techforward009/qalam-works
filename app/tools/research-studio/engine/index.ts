export {
  chunkId,
  EXTRACTOR_VERSION,
  generateDocumentId,
  pageId,
  type ChunkContentType,
  type Citation,
  type DocumentChunk,
  type DocumentPage,
  type EvidenceGateReason,
  type ExtractionMethod,
  type FailureCode,
  type ProcessingStatus,
  type ResearchAnswer,
  type ResearchDocument,
  type ResearchDocumentLanguage,
} from "./types/document";

export { ingestDocument, type IngestInput, type IngestResult } from "./ingestion/ingestDocument";
export { sniffKind } from "./ingestion/sniffKind";
export { extractStringsFromPdfContent } from "./ingestion/pdfExtract";
