/**
 * Typed answer orchestration. No LLM and no network call.
 * A future model adapter may replace only `deterministicEvidenceAdapter`.
 * It still cannot run unless the evidence gate allows, and every citation
 * must pass citation verification.
 */
import { verifyCitation } from "../citation/verifyCitation";
import { evaluateEvidence } from "../evidence/evaluateEvidence";
import { searchKeywords, type RetrievedChunk } from "../retrieval/keywordSearch";
import type { ResearchEngineStore } from "../storage/researchEngineStore";
import type { Citation, EvidenceGateReason, ResearchAnswer } from "../types/document";

/** Spec limit: at most five evidence chunks may support an answer. */
export const MAX_ANSWER_EVIDENCE = 5;

export const INSUFFICIENT_EVIDENCE_EN = "Insufficient evidence in the provided documents.";
export const INSUFFICIENT_EVIDENCE_UR =
  "مجھے فراہم کردہ دستاویزات میں اس سوال کا کافی مستند مواد نہیں ملا۔";

export type AnswerStatus = "answered" | "refused";

export type RefusalReason =
  | EvidenceGateReason
  | "empty_query"
  | "invalid_citation"
  | "malformed_evidence";

export type AnswerSection = {
  documentId: string;
  pageNumber: number;
  chunkId: string;
  quote: string;
};

export type TypedResearchAnswer = ResearchAnswer & {
  query: string;
  status: AnswerStatus;
  sections: AnswerSection[];
  refusalReason?: RefusalReason;
};

export type AnswerDraft = {
  answer: string;
  citations: Citation[];
};

export type AnswerAdapter = (input: { query: string; evidence: RetrievedChunk[] }) => AnswerDraft;

export type AskResearchOptions = {
  documentIds?: string[];
  k?: number;
  /** Defaults to verified excerpts. A future LLM must use this same seam. */
  adapter?: AnswerAdapter;
};

export function deterministicEvidenceAdapter(input: {
  query: string;
  evidence: RetrievedChunk[];
}): AnswerDraft {
  const citations: Citation[] = input.evidence.map((hit) => ({
    documentId: hit.chunk.documentId,
    pageNumber: hit.chunk.pageNumber,
    chunkId: hit.chunk.id,
    quote: hit.chunk.rawText,
  }));
  return {
    answer: citations.map((citation) => citation.quote).join("\n\n"),
    citations,
  };
}

function refuse(
  query: string,
  refusalReason: RefusalReason,
  evidenceReason: EvidenceGateReason | undefined,
): TypedResearchAnswer {
  return {
    query,
    status: "refused",
    answered: false,
    answer: INSUFFICIENT_EVIDENCE_EN,
    sections: [],
    citations: [],
    evidence: { chunksUsed: 0, reason: evidenceReason },
    refusalReason,
  };
}

function isCitation(value: unknown): value is Citation {
  if (!value || typeof value !== "object") return false;
  const citation = value as Citation;
  return (
    typeof citation.documentId === "string" &&
    Number.isInteger(citation.pageNumber) &&
    typeof citation.chunkId === "string" &&
    typeof citation.quote === "string"
  );
}

export function askResearch(
  store: ResearchEngineStore,
  query: string,
  options: AskResearchOptions = {},
): TypedResearchAnswer {
  const hits = searchKeywords(store, query, {
    k: options.k,
    documentIds: options.documentIds,
  });
  const gate = evaluateEvidence(hits, {
    query,
    documentIds: options.documentIds,
  });

  if (query.trim().length === 0) {
    return refuse(query, "empty_query", gate.reason);
  }
  if (!gate.allowed) {
    return refuse(query, gate.reason, gate.reason);
  }

  const evidence = gate.hits.slice(0, MAX_ANSWER_EVIDENCE);
  const draft = (options.adapter ?? deterministicEvidenceAdapter)({ query, evidence });
  if (!draft || typeof draft.answer !== "string" || !Array.isArray(draft.citations)) {
    return refuse(query, "malformed_evidence", gate.reason);
  }
  if (draft.citations.length === 0 || draft.citations.some((citation) => !isCitation(citation))) {
    return refuse(query, draft.citations.length === 0 ? "invalid_citation" : "malformed_evidence", gate.reason);
  }

  const sections: AnswerSection[] = [];
  for (const citation of draft.citations) {
    const verified = verifyCitation(store, citation);
    if (!verified.ok || !verified.sourceQuote) {
      return refuse(query, "invalid_citation", gate.reason);
    }
    sections.push({
      documentId: verified.documentId,
      pageNumber: verified.pageNumber,
      chunkId: verified.chunkId,
      quote: verified.sourceQuote,
    });
  }

  return {
    query,
    status: "answered",
    answered: true,
    answer: draft.answer,
    sections,
    citations: sections.map((section) => ({ ...section })),
    evidence: { chunksUsed: sections.length, reason: "sufficient" },
  };
}
