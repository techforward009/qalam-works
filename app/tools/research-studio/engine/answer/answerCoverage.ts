/**
 * Deterministic citation-coverage check.
 * It does not read the answer prose and does not call a model.
 * Folded matchedTerms already come from keyword retrieval.
 *
 * A verified answer is incomplete when any selected evidence chunk has at
 * least MIN_UNCOVERED_MATCHED_TERMS folded terms that appear in none of the
 * verified cited chunks. One missing term is not enough, so ordinary overlap
 * and a single extra token do not refuse. Duplicate citations add no terms.
 */
import type { RetrievedChunk } from "../retrieval/keywordSearch";

/** Documented minimum. One absent matched term does not refuse. */
export const MIN_UNCOVERED_MATCHED_TERMS = 2;

type CitedChunk = {
  documentId: string;
  pageNumber: number;
  chunkId: string;
};

function citedTerms(evidence: readonly RetrievedChunk[], citations: readonly CitedChunk[]): Set<string> {
  const terms = new Set<string>();
  for (const citation of citations) {
    const hit = evidence.find(
      (item) =>
        item.chunk.id === citation.chunkId &&
        item.chunk.documentId === citation.documentId &&
        item.chunk.pageNumber === citation.pageNumber,
    );
    if (!hit) continue;
    for (const term of hit.matchedTerms) {
      if (term.length > 0) terms.add(term);
    }
  }
  return terms;
}

function uncoveredTerms(matchedTerms: readonly string[], covered: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const term of matchedTerms) {
    if (term.length === 0 || covered.has(term) || seen.has(term)) continue;
    seen.add(term);
    missing.push(term);
  }
  return missing;
}

export type CitationCoverageChunk = {
  citationRef: number;
  documentId: string;
  pageNumber: number;
  chunkId: string;
  matchedTerms: string[];
  uncoveredMatchedTerms: string[];
  thresholdTriggered: boolean;
};

export type CitationCoverageTrace = {
  citedMatchedTerms: string[];
  chunks: CitationCoverageChunk[];
  thresholdTriggered: boolean;
};

/** Same rule as the boolean guard. Does not read raw text or answer prose. */
export function describeCitationCoverage(
  evidence: readonly RetrievedChunk[],
  citations: readonly CitedChunk[],
): CitationCoverageTrace {
  const covered = citedTerms(evidence, citations);
  const chunks = evidence.map((hit, index) => {
    const matchedTerms = hit.matchedTerms.filter((term) => term.length > 0);
    const uncoveredMatchedTerms = uncoveredTerms(matchedTerms, covered);
    return {
      citationRef: index + 1,
      documentId: hit.chunk.documentId,
      pageNumber: hit.chunk.pageNumber,
      chunkId: hit.chunk.id,
      matchedTerms,
      uncoveredMatchedTerms,
      thresholdTriggered: uncoveredMatchedTerms.length >= MIN_UNCOVERED_MATCHED_TERMS,
    };
  });
  return {
    citedMatchedTerms: [...covered],
    chunks,
    thresholdTriggered: chunks.some((chunk) => chunk.thresholdTriggered),
  };
}

/** True when every selected chunk's term cluster is represented by a verified citation. */
export function citationsCoverSelectedEvidence(
  evidence: readonly RetrievedChunk[],
  citations: readonly CitedChunk[],
): boolean {
  return !describeCitationCoverage(evidence, citations).thresholdTriggered;
}
