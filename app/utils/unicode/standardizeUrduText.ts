/**
 * Backward-compatible Urdu standardizer.
 * Delegates to processText(..., "ur") so existing callers keep Urdu behavior.
 */
import { processText } from "../processing/processText";
import type { CorrectionDetail } from "../processing/types";

export type { CorrectionDetail };

export interface StandardizeResult {
  output: string;
  badges: string[];
  summary: {
    totalCorrections: number;
    arabicNormalizations: number;
    spacingFixes: number;
    punctuationFixes: number;
  };
  corrections: CorrectionDetail[];
}

/** @deprecated Prefer processText(input, mode) for language-aware cleaning. */
export function standardizeUrduText(input: string): StandardizeResult {
  const r = processText(input, "ur");
  return {
    output: r.output,
    badges: r.badges,
    summary: r.summary,
    corrections: r.corrections,
  };
}
