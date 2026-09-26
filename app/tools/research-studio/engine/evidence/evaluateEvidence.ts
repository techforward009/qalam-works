/**
 * Deterministic evidence gate. No LLM and no chunk mutation.
 * A refused result means a future answer step must not run.
 */
import { adaptProcessText } from "../adapter/processTextAdapter";
import { keywordTokens } from "../retrieval/keywordSearch";
import type { RetrievedChunk } from "../retrieval/keywordSearch";
import { chunkId, type EvidenceGateReason } from "../types/document";

/** Keyword scores are idf×tf in thousandths. One matched token is 1_000_000. */
export const EVIDENCE_MIN_SCORE = 1_000_000;
/** v0.1: two independent chunks, unless one chunk is an exact reference. */
export const EVIDENCE_MIN_INDEPENDENT_CHUNKS = 2;
export const EVIDENCE_MIN_MATCHED_TERMS = 1;

export type EvidenceGateResult = {
  allowed: boolean;
  reason: EvidenceGateReason;
  /** Original hit objects. Stored chunks are not copied or rewritten. */
  hits: RetrievedChunk[];
  independentCount: number;
};

export type EvidenceGateOptions = {
  /** Required for exact-reference and overlap checks. */
  query: string;
  /** When set, hits from other documents are ignored. Empty array → no evidence. */
  documentIds?: string[];
};

function byRank(a: RetrievedChunk, b: RetrievedChunk): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.chunk.documentId !== b.chunk.documentId) {
    return a.chunk.documentId < b.chunk.documentId ? -1 : 1;
  }
  if (a.chunk.pageNumber !== b.chunk.pageNumber) return a.chunk.pageNumber - b.chunk.pageNumber;
  if (a.chunk.chunkIndex !== b.chunk.chunkIndex) return a.chunk.chunkIndex - b.chunk.chunkIndex;
  if (a.chunk.id === b.chunk.id) return 0;
  return a.chunk.id < b.chunk.id ? -1 : 1;
}

function provenanceOk(hit: RetrievedChunk): boolean {
  const chunk = hit.chunk;
  if (!chunk || typeof chunk.rawText !== "string" || typeof chunk.normalizedText !== "string") return false;
  if (!chunk.documentId || !Number.isInteger(chunk.pageNumber) || chunk.pageNumber < 1) return false;
  if (!Number.isInteger(chunk.chunkIndex) || chunk.chunkIndex < 1) return false;
  return chunk.id === chunkId(chunk.documentId, chunk.pageNumber, chunk.chunkIndex);
}

function isStrong(hit: RetrievedChunk): boolean {
  return hit.score >= EVIDENCE_MIN_SCORE && hit.matchedTerms.length >= EVIDENCE_MIN_MATCHED_TERMS;
}

function exactReference(query: string, hit: RetrievedChunk): boolean {
  const terms = keywordTokens(adaptProcessText(query).normalizedText);
  if (terms.length === 0) return false;
  const matched = new Set(hit.matchedTerms);
  if (!terms.every((term) => matched.has(term))) return false;
  return terms.length === 1 || terms.some((term) => /\d/.test(term));
}

function numberSet(text: string): Set<string> {
  return new Set(keywordTokens(text).filter((token) => /^\d{3,}$/.test(token)));
}

function conflicts(hits: RetrievedChunk[]): boolean {
  const sets = hits.map((hit) => numberSet(hit.chunk.normalizedText)).filter((set) => set.size > 0);
  if (sets.length < 2) return false;
  const [first, ...rest] = sets;
  for (const value of first) {
    if (rest.every((set) => set.has(value))) return false;
  }
  return true;
}

function dedupe(hits: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Set<string>();
  const kept: RetrievedChunk[] = [];
  for (const hit of hits) {
    const key = hit.chunk.normalizedText.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(hit);
  }
  return kept;
}

function result(
  allowed: boolean,
  reason: EvidenceGateReason,
  hits: RetrievedChunk[],
  independentCount: number,
): EvidenceGateResult {
  return { allowed, reason, hits, independentCount };
}

/**
 * Decide whether retrieved keyword hits meet the minimum evidence contract.
 * Does not answer the question and does not edit chunks.
 */
export function evaluateEvidence(
  results: readonly RetrievedChunk[],
  options: EvidenceGateOptions,
): EvidenceGateResult {
  if (options.documentIds && options.documentIds.length === 0) {
    return result(false, "no_evidence", [], 0);
  }

  const scope = options.documentIds ? new Set(options.documentIds) : null;
  const usable = results.filter((hit) => {
    if (!provenanceOk(hit)) return false;
    if (scope && !scope.has(hit.chunk.documentId)) return false;
    return true;
  });

  if (results.length === 0 || usable.length === 0) {
    return result(false, "no_evidence", [], 0);
  }

  const ordered = usable.slice().sort(byRank);
  const strong = dedupe(ordered.filter(isStrong));
  if (strong.length === 0) {
    return result(false, "weak_retrieval", ordered, 0);
  }

  const singleExact = strong.length === 1 && exactReference(options.query, strong[0]);
  if (strong.length < EVIDENCE_MIN_INDEPENDENT_CHUNKS && !singleExact) {
    return result(false, "weak_retrieval", strong, strong.length);
  }

  if (strong.length >= EVIDENCE_MIN_INDEPENDENT_CHUNKS && conflicts(strong)) {
    return result(false, "conflicting_evidence", strong, strong.length);
  }

  return result(true, "sufficient", strong, strong.length);
}
