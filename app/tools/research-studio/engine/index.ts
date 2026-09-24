export {
  CHUNKER_VERSION,
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

export { adaptProcessText } from "./adapter/processTextAdapter";
export { ingestDocument, type IngestInput, type IngestResult } from "./ingestion/ingestDocument";
export { sniffKind } from "./ingestion/sniffKind";
export { extractStringsFromPdfContent } from "./ingestion/pdfExtract";
export {
  createChunks,
  MAX_CHUNK_CODE_POINTS,
  type ChunkResult,
} from "./chunking/createChunks";
export {
  ENGINE_STORE_SCHEMA_VERSION,
  parseStoredCorpus,
  type StoredCorpus,
} from "./storage/parseStoredCorpus";
export {
  ENGINE_DOC_KEY_PREFIX,
  ENGINE_LIST_KEY,
  createLocalStorageResearchEngineStore,
  createMemoryResearchEngineStore,
  createResearchEngineStore,
  engineDocKey,
  makeStoredCorpus,
  type EngineStoreError,
  type EngineStoreResult,
  type ResearchEngineStore,
} from "./storage/researchEngineStore";
export {
  DEFAULT_KEYWORD_K,
  MAX_KEYWORD_K,
  foldKeywordToken,
  keywordTokens,
  searchKeywords,
  type KeywordSearchOptions,
  type RetrievedChunk,
} from "./retrieval/keywordSearch";