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
  RESEARCH_BLOB_PREFIX,
  ResearchPersistenceError,
  documentIdFromResearchPathname,
  hydrateResearchStore,
  loadDurableCorpus,
  parseDurableCorpusJson,
  researchDocumentPathname,
  saveDurableCorpus,
  type ResearchBlobClient,
} from "./storage/durableCorpus";
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
export {
  EVIDENCE_MIN_INDEPENDENT_CHUNKS,
  EVIDENCE_MIN_MATCHED_TERMS,
  EVIDENCE_MIN_SCORE,
  evaluateEvidence,
  type EvidenceGateOptions,
  type EvidenceGateResult,
} from "./evidence/evaluateEvidence";
export {
  findRawQuote,
  verifyAnswer,
  verifyCitation,
  type CitationCheck,
  type CitationFailureCode,
  type CitationVerificationResult,
  type CitationVerificationStatus,
} from "./citation/verifyCitation";
export {
  INSUFFICIENT_EVIDENCE_EN,
  INSUFFICIENT_EVIDENCE_UR,
  MAX_ANSWER_EVIDENCE,
  askResearch,
  askResearchAsync,
  deterministicEvidenceAdapter,
  type AnswerAdapter,
  type AnswerDraft,
  type AnswerSection,
  type AnswerStatus,
  type AskResearchAsyncOptions,
  type AskResearchOptions,
  type AsyncAnswerAdapter,
  type AsyncAnswerResult,
  type RefusalReason,
  type TypedResearchAnswer,
} from "./answer/askResearch";
export {
  MAX_LLM_CHUNK_CHARS,
  MAX_LLM_EVIDENCE_CHARS,
  RESEARCH_LLM_MODEL_ID,
  buildEvidencePrompt,
  createLlmAnswerAdapter,
  type LlmAnswerAdapterOptions,
  type ResearchLlmEnv,
} from "./answer/llmAnswerAdapter";