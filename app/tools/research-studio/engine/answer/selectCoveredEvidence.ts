/**
 * Deterministic evidence selection for the answer step.
 * Keyword scores stay as retrieved. This does not interpret the question.
 * It only prefers a later hit when that hit adds matched terms not yet covered.
 */
import type { RetrievedChunk } from "../retrieval/keywordSearch";
import { chunkId } from "../types/document";

export type CoveredEvidenceOptions = {
  /** At most this many chunks. Defaults to 5, the answer evidence cap. */
  limit?: number;
  /** When set, chunks from other documents are ignored. Empty array selects nothing. */
  documentIds?: string[];
};

function provenanceOk(hit: RetrievedChunk): boolean {
  const chunk = hit.chunk;
  if (!chunk || typeof chunk.rawText !== "string" || typeof chunk.normalizedText !== "string") return false;
  if (!chunk.documentId || !Number.isInteger(chunk.pageNumber) || chunk.pageNumber < 1) return false;
  if (!Number.isInteger(chunk.chunkIndex) || chunk.chunkIndex < 1) return false;
  return chunk.id === chunkId(chunk.documentId, chunk.pageNumber, chunk.chunkIndex);
}

function compareHits(a: RetrievedChunk, b: RetrievedChunk): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.chunk.documentId !== b.chunk.documentId) {
    return a.chunk.documentId < b.chunk.documentId ? -1 : 1;
  }
  if (a.chunk.pageNumber !== b.chunk.pageNumber) return a.chunk.pageNumber - b.chunk.pageNumber;
  if (a.chunk.chunkIndex !== b.chunk.chunkIndex) return a.chunk.chunkIndex - b.chunk.chunkIndex;
  if (a.chunk.id === b.chunk.id) return 0;
  return a.chunk.id < b.chunk.id ? -1 : 1;
}

function addsTerm(hit: RetrievedChunk, covered: ReadonlySet<string>): boolean {
  return hit.matchedTerms.some((term) => term.length > 0 && !covered.has(term));
}

/**
 * Choose at most `limit` hits from an already retrieved pool.
 * Rank stays the tie-break. A lower-ranked hit is taken before a higher
 * repeat when it contributes a matched term the selected set does not have.
 * Returned objects are the input hits, not copies. Text is not rewritten.
 */
export function selectCoveredEvidence(
  hits: readonly RetrievedChunk[],
  options: CoveredEvidenceOptions = {},
): RetrievedChunk[] {
  const limit = options.limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1) return [];
  if (options.documentIds && options.documentIds.length === 0) return [];

  const scope = options.documentIds ? new Set(options.documentIds) : null;
  const remaining = hits
    .filter((hit) => {
      if (!provenanceOk(hit)) return false;
      if (scope && !scope.has(hit.chunk.documentId)) return false;
      return true;
    })
    .slice()
    .sort(compareHits);

  const selected: RetrievedChunk[] = [];
  const covered = new Set<string>();
  while (selected.length < limit && remaining.length > 0) {
    const novelIndex = remaining.findIndex((hit) => addsTerm(hit, covered));
    const index = novelIndex >= 0 ? novelIndex : 0;
    const chosen = remaining.splice(index, 1)[0];
    for (const term of chosen.matchedTerms) {
      if (term.length > 0) covered.add(term);
    }
    selected.push(chosen);
  }

  selected.sort(compareHits);
  return selected;
}
