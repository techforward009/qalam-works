/**
 * Research API persistence entry.
 * The private qalam-research Blob store is authoritative.
 * This module does not keep a process-memory corpus.
 */
export { researchBlobClientFromEnv } from "./vercelResearchBlob";
