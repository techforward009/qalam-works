/**
 * Shared Document Cleaner processing pipeline (text in → cleaned + audit).
 * Used by both file upload (after extraction) and paste-text workflows.
 * Runs entirely in the calling environment — no network, no persistence.
 */
import { processText } from "./processText";
import { checkTextQuality } from "../quality/checkTextQuality";
import type { ProcessingLanguage, ResolvedLanguage, DocumentDirection } from "./types";
import type { QualityReport } from "../quality/checkTextQuality";

export interface CleanTextPipelineResult {
  success: true;
  originalText: string;
  cleanedText: string;
  correctionsApplied: {
    totalCorrections: number;
    arabicNormalizations: number;
    spacingFixes: number;
    punctuationFixes: number;
  };
  remainingIssues: QualityReport;
  resolvedLanguage: ResolvedLanguage;
  direction: DocumentDirection;
}

export interface CleanTextPipelineError {
  success: false;
  error: string;
}

export type CleanTextResult = CleanTextPipelineResult | CleanTextPipelineError;

export function cleanTextPipeline(
  text: string,
  processingLanguage: ProcessingLanguage = "auto"
): CleanTextResult {
  if (typeof text !== "string") {
    return { success: false, error: "Invalid text input." };
  }
  const trimmedSense = text.replace(/\s/g, "");
  if (trimmedSense.length === 0) {
    return { success: false, error: "empty" };
  }

  const processed = processText(text, processingLanguage);
  const remainingIssues = checkTextQuality(processed.output, processed.resolvedLanguage);

  return {
    success: true,
    originalText: text,
    cleanedText: processed.output,
    correctionsApplied: processed.summary,
    remainingIssues,
    resolvedLanguage: processed.resolvedLanguage,
    direction: processed.direction,
  };
}

/** Display-only direction for the paste textarea (does not affect processing). */
export function displayDirForPaste(
  mode: ProcessingLanguage,
  text: string
): "rtl" | "ltr" {
  if (mode === "en") return "ltr";
  if (mode === "ur" || mode === "ar") return "rtl";
  // Auto: script-level display only
  return /[\u0600-\u06FF]/.test(text) ? "rtl" : "ltr";
}
