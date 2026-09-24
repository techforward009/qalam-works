/**
 * Deterministic citation check against stored chunk rawText.
 * Whitespace fold only. No Unicode folding, no normalizedText pass.
 */
import type { ResearchEngineStore } from "../storage/researchEngineStore";
import type { DocumentChunk, ResearchAnswer } from "../types/document";

export type CitationVerificationStatus =
  | "verified"
  | "invalid_citation"
  | "missing_source"
  | "invalid_provenance";

export type CitationFailureCode =
  | "empty_quote"
  | "quote_not_found"
  | "missing_document"
  | "missing_page"
  | "missing_chunk"
  | "provenance_mismatch";

export type CitationVerificationResult = {
  ok: boolean;
  status: CitationVerificationStatus;
  reason?: CitationFailureCode;
  documentId: string;
  pageNumber: number;
  chunkId: string;
  /** Proposed quote, unchanged. */
  quote: string;
  /** Exact rawText slice when verified. Absent on failure. */
  sourceQuote?: string;
};

export type CitationCheck = {
  documentId: string;
  pageNumber: number;
  chunkId: string;
  quote: string;
};

const WHITESPACE = /\s/;

function isBlank(quote: string): boolean {
  return quote.trim().length === 0;
}

function foldWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** First raw slice whose whitespace-folded form contains the folded quote. */
export function findRawQuote(rawText: string, quote: string): string | null {
  const foldedQuote = foldWhitespace(quote);
  if (foldedQuote.length === 0) return null;

  let start = 0;
  while (start < rawText.length && WHITESPACE.test(rawText[start])) start += 1;
  let end = rawText.length;
  while (end > start && WHITESPACE.test(rawText[end - 1])) end -= 1;

  let folded = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let i = start;
  while (i < end) {
    if (WHITESPACE.test(rawText[i])) {
      const run = i;
      while (i < end && WHITESPACE.test(rawText[i])) i += 1;
      folded += " ";
      starts.push(run);
      ends.push(i);
      continue;
    }
    const charStart = i;
    i += 1;
    folded += rawText[charStart];
    starts.push(charStart);
    ends.push(i);
  }

  const at = folded.indexOf(foldedQuote);
  if (at < 0) return null;
  return rawText.slice(starts[at], ends[at + foldedQuote.length - 1]);
}

function chunkIndexForCitation(check: CitationCheck): number | null {
  const prefix = `${check.documentId}:p${check.pageNumber}:c`;
  if (!check.chunkId.startsWith(prefix)) return null;
  const rest = check.chunkId.slice(prefix.length);
  if (!/^[1-9]\d*$/.test(rest)) return null;
  return Number(rest);
}

function failure(
  check: CitationCheck,
  status: CitationVerificationStatus,
  reason: CitationFailureCode,
): CitationVerificationResult {
  return {
    ok: false,
    status,
    reason,
    documentId: check.documentId,
    pageNumber: check.pageNumber,
    chunkId: check.chunkId,
    quote: check.quote,
  };
}

export function verifyCitation(
  store: ResearchEngineStore,
  check: CitationCheck,
): CitationVerificationResult {
  if (!check.documentId || !Number.isInteger(check.pageNumber) || check.pageNumber < 1 || !check.chunkId) {
    return failure(check, "invalid_provenance", "provenance_mismatch");
  }
  if (isBlank(check.quote)) {
    return failure(check, "invalid_citation", "empty_quote");
  }
  if (chunkIndexForCitation(check) === null) {
    return failure(check, "invalid_provenance", "provenance_mismatch");
  }

  const loaded = store.get(check.documentId);
  if (!loaded.ok) {
    return failure(check, "missing_source", "missing_document");
  }

  const page = loaded.value.pages.find((item) => item.pageNumber === check.pageNumber);
  if (!page) {
    return failure(check, "missing_source", "missing_page");
  }

  const chunk = loaded.value.chunks.find((item) => item.id === check.chunkId);
  if (!chunk) {
    return failure(check, "missing_source", "missing_chunk");
  }
  if (chunk.documentId !== check.documentId || chunk.pageNumber !== check.pageNumber) {
    return failure(check, "invalid_provenance", "provenance_mismatch");
  }

  const sourceQuote = findRawQuote(chunk.rawText, check.quote);
  if (sourceQuote === null) {
    return failure(check, "invalid_citation", "quote_not_found");
  }

  return {
    ok: true,
    status: "verified",
    documentId: check.documentId,
    pageNumber: check.pageNumber,
    chunkId: check.chunkId,
    quote: check.quote,
    sourceQuote,
  };
}

function refuse(answer: ResearchAnswer): ResearchAnswer {
  return { ...answer, answered: false, citations: [] };
}

/** Drop an answered result when any citation fails. Does not write a new answer. */
export function verifyAnswer(answer: ResearchAnswer, chunks: readonly DocumentChunk[]): ResearchAnswer {
  if (!answer.answered) {
    return answer.citations.length === 0 ? answer : refuse(answer);
  }
  if (answer.citations.length === 0) return refuse(answer);

  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  for (const citation of answer.citations) {
    const chunk = byId.get(citation.chunkId);
    if (!chunk || chunk.documentId !== citation.documentId || chunk.pageNumber !== citation.pageNumber) {
      return refuse(answer);
    }
    if (findRawQuote(chunk.rawText, citation.quote) === null) return refuse(answer);
  }
  return answer;
}

