/**
 * Server-side ask trace. It stores ids, counts, and folded matched terms.
 * It does not store raw text, prompts, model prose, or credentials.
 */
import { randomUUID } from "node:crypto";
import type { RetrievedChunk } from "../retrieval/keywordSearch";
import type { AnswerDraft } from "./askResearch";

export type SelectedChunkDiagnostic = {
  citationRef: number;
  documentId: string;
  pageNumber: number;
  chunkId: string;
  matchedTerms: string[];
  uncoveredMatchedTerms: string[];
  thresholdTriggered: boolean;
};

export type AskDiagnosticTrace = {
  correlationId: string;
  selectedChunkCount: number;
  selectedChunks: SelectedChunkDiagnostic[];
  modelCallStatus: "not_called" | "ok" | "provider_error";
  firstParseStatus: "not_called" | "provider_error" | "unparsed" | "parsed";
  firstQuoteVerified: boolean | null;
  firstCitationCount: number;
  firstCitationRefs: number[];
  firstAnswerCharCount: number;
  firstUnmatchedCitationCount: number;
  repairOccurred: boolean;
  repairResultStatus: "not_called" | "provider_error" | "malformed" | "draft";
  repairQuoteVerified: boolean | null;
  repairCitationCount: number;
  repairCitationRefs: number[];
  repairAnswerCharCount: number;
  repairUnmatchedCitationCount: number;
  quoteVerificationSucceeded: boolean | null;
  citationVerification: "not_checked" | "passed" | "failed";
  verifiedCitationRefs: number[];
  verifiedSectionCount: number;
  coverageChecked: boolean;
  citedMatchedTerms: string[];
  thresholdTriggered: boolean;
  finalStatus: string;
};

type CitationRef = {
  documentId: string;
  pageNumber: number;
  chunkId: string;
};

export function createAskDiagnosticTrace(): AskDiagnosticTrace {
  return {
    correlationId: randomUUID(),
    selectedChunkCount: 0,
    selectedChunks: [],
    modelCallStatus: "not_called",
    firstParseStatus: "not_called",
    firstQuoteVerified: null,
    firstCitationCount: 0,
    firstCitationRefs: [],
    firstAnswerCharCount: 0,
    firstUnmatchedCitationCount: 0,
    repairOccurred: false,
    repairResultStatus: "not_called",
    repairQuoteVerified: null,
    repairCitationCount: 0,
    repairCitationRefs: [],
    repairAnswerCharCount: 0,
    repairUnmatchedCitationCount: 0,
    quoteVerificationSucceeded: null,
    citationVerification: "not_checked",
    verifiedCitationRefs: [],
    verifiedSectionCount: 0,
    coverageChecked: false,
    citedMatchedTerms: [],
    thresholdTriggered: false,
    finalStatus: "not_finished",
  };
}

export function rememberSelectedChunks(trace: AskDiagnosticTrace, evidence: readonly RetrievedChunk[]): void {
  trace.selectedChunks = evidence.map((hit, index) => ({
    citationRef: index + 1,
    documentId: hit.chunk.documentId,
    pageNumber: hit.chunk.pageNumber,
    chunkId: hit.chunk.id,
    matchedTerms: hit.matchedTerms.filter((term) => term.length > 0),
    uncoveredMatchedTerms: [],
    thresholdTriggered: false,
  }));
  trace.selectedChunkCount = trace.selectedChunks.length;
}

export function citationRefFor(evidence: readonly RetrievedChunk[], citation: CitationRef): number | null {
  const index = evidence.findIndex(
    (hit) =>
      hit.chunk.id === citation.chunkId &&
      hit.chunk.documentId === citation.documentId &&
      hit.chunk.pageNumber === citation.pageNumber,
  );
  return index < 0 ? null : index + 1;
}

export function noteDraftCitations(
  evidence: readonly RetrievedChunk[],
  draft: AnswerDraft | null,
): { refs: number[]; unmatched: number; answerChars: number; count: number } {
  if (!draft) return { refs: [], unmatched: 0, answerChars: 0, count: 0 };
  const refs: number[] = [];
  let unmatched = 0;
  for (const citation of draft.citations) {
    const ref = citationRefFor(evidence, citation);
    if (ref === null) unmatched += 1;
    else refs.push(ref);
  }
  return { refs, unmatched, answerChars: draft.answer.length, count: draft.citations.length };
}
