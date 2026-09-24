/**
 * Typed answer orchestration.
 * The default adapter quotes approved raw evidence and does not call a model.
 * An async adapter may call an LLM only after the evidence gate allows it.
 * Citation verification still runs on every proposed quote.
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
  | "malformed_evidence"
  | "provider_error";

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
  /** Sync excerpt adapter. An LLM must use askResearchAsync instead. */
  adapter?: AnswerAdapter;
};

export type AsyncAnswerResult =
  | { kind: "draft"; draft: AnswerDraft }
  | { kind: "refuse"; reason: "malformed_evidence" | "provider_error" };

export type AsyncAnswerAdapter = (input: {
  query: string;
  evidence: RetrievedChunk[];
}) => Promise<AsyncAnswerResult>;

export type AskResearchAsyncOptions = {
  documentIds?: string[];
  k?: number;
  adapter?: AsyncAnswerAdapter;
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

function prepareAsk(
  store: ResearchEngineStore,
  query: string,
  options: { documentIds?: string[]; k?: number },
):
  | { ok: false; result: TypedResearchAnswer }
  | { ok: true; evidence: RetrievedChunk[]; reason: EvidenceGateReason } {
  const hits = searchKeywords(store, query, {
    k: options.k,
    documentIds: options.documentIds,
  });
  const gate = evaluateEvidence(hits, {
    query,
    documentIds: options.documentIds,
  });

  if (query.trim().length === 0) {
    return { ok: false, result: refuse(query, "empty_query", gate.reason) };
  }
  if (!gate.allowed) {
    return { ok: false, result: refuse(query, gate.reason, gate.reason) };
  }
  return { ok: true, evidence: gate.hits.slice(0, MAX_ANSWER_EVIDENCE), reason: gate.reason };
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

function approvedHit(evidence: readonly RetrievedChunk[], citation: Citation): boolean {
  return evidence.some(
    (hit) =>
      hit.chunk.id === citation.chunkId &&
      hit.chunk.documentId === citation.documentId &&
      hit.chunk.pageNumber === citation.pageNumber,
  );
}

function completeDraft(
  store: ResearchEngineStore,
  query: string,
  evidenceReason: EvidenceGateReason,
  evidence: readonly RetrievedChunk[],
  draft: AnswerDraft,
): TypedResearchAnswer {
  if (!draft || typeof draft.answer !== "string" || !Array.isArray(draft.citations)) {
    return refuse(query, "malformed_evidence", evidenceReason);
  }
  if (draft.citations.length === 0 || draft.citations.some((citation) => !isCitation(citation))) {
    return refuse(query, draft.citations.length === 0 ? "invalid_citation" : "malformed_evidence", evidenceReason);
  }
  if (draft.citations.some((citation) => !approvedHit(evidence, citation))) {
    return refuse(query, "invalid_citation", evidenceReason);
  }

  const sections: AnswerSection[] = [];
  for (const citation of draft.citations) {
    const verified = verifyCitation(store, citation);
    if (!verified.ok || !verified.sourceQuote) {
      return refuse(query, "invalid_citation", evidenceReason);
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

export function askResearch(
  store: ResearchEngineStore,
  query: string,
  options: AskResearchOptions = {},
): TypedResearchAnswer {
  const prepared = prepareAsk(store, query, options);
  if (!prepared.ok) return prepared.result;

  const draft = (options.adapter ?? deterministicEvidenceAdapter)({
    query,
    evidence: prepared.evidence,
  });
  return completeDraft(store, query, prepared.reason, prepared.evidence, draft);
}

/** Same gate and citation checks as askResearch. The adapter may be async. */
export async function askResearchAsync(
  store: ResearchEngineStore,
  query: string,
  options: AskResearchAsyncOptions = {},
): Promise<TypedResearchAnswer> {
  const prepared = prepareAsk(store, query, options);
  if (!prepared.ok) return prepared.result;

  const adapter =
    options.adapter ??
    (async (input) => ({
      kind: "draft" as const,
      draft: deterministicEvidenceAdapter(input),
    }));
  const output = await adapter({ query, evidence: prepared.evidence });
  if (output.kind === "refuse") {
    return refuse(query, output.reason, prepared.reason);
  }
  return completeDraft(store, query, prepared.reason, prepared.evidence, output.draft);
}
