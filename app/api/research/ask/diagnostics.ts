/**
 * Emits a server log only when QALAM_RESEARCH_DIAGNOSTICS=true.
 * The record is rebuilt from an allowlist so prompts, raw text, and secrets cannot be logged.
 */
import type { AskDiagnosticTrace, SelectedChunkDiagnostic } from "../../../tools/research-studio/engine";

export function researchDiagnosticsEnabled(): boolean {
  return process.env.QALAM_RESEARCH_DIAGNOSTICS === "true";
}

function chunk(value: SelectedChunkDiagnostic) {
  return {
    citationRef: value.citationRef,
    documentId: value.documentId,
    pageNumber: value.pageNumber,
    chunkId: value.chunkId,
    matchedTerms: [...value.matchedTerms],
    uncoveredMatchedTerms: [...value.uncoveredMatchedTerms],
    thresholdTriggered: value.thresholdTriggered,
  };
}

/** Allowlisted fields only. Unknown properties on the trace are dropped. */
export function sanitizeResearchDiagnostic(trace: AskDiagnosticTrace) {
  return {
    correlationId: trace.correlationId,
    finalStatus: trace.finalStatus,
    selectedChunkCount: trace.selectedChunkCount,
    selectedChunks: trace.selectedChunks.map(chunk),
    modelCallStatus: trace.modelCallStatus,
    firstParseStatus: trace.firstParseStatus,
    firstQuoteVerified: trace.firstQuoteVerified,
    firstCitationCount: trace.firstCitationCount,
    firstCitationRefs: [...trace.firstCitationRefs],
    firstAnswerCharCount: trace.firstAnswerCharCount,
    firstUnmatchedCitationCount: trace.firstUnmatchedCitationCount,
    repairOccurred: trace.repairOccurred,
    repairResultStatus: trace.repairResultStatus,
    repairQuoteVerified: trace.repairQuoteVerified,
    repairCitationCount: trace.repairCitationCount,
    repairCitationRefs: [...trace.repairCitationRefs],
    repairAnswerCharCount: trace.repairAnswerCharCount,
    repairUnmatchedCitationCount: trace.repairUnmatchedCitationCount,
    quoteVerificationSucceeded: trace.quoteVerificationSucceeded,
    citationVerification: trace.citationVerification,
    verifiedCitationRefs: [...trace.verifiedCitationRefs],
    verifiedSectionCount: trace.verifiedSectionCount,
    coverageChecked: trace.coverageChecked,
    citedMatchedTerms: [...trace.citedMatchedTerms],
    thresholdTriggered: trace.thresholdTriggered,
  };
}

export function emitResearchDiagnostic(trace: AskDiagnosticTrace): void {
  console.info(JSON.stringify({ event: "research_ask_diagnostic", ...sanitizeResearchDiagnostic(trace) }));
}
