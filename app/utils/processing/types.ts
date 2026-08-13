/**
 * Explicit processing language for document cleaning / quality audit.
 * Explicit user choice always overrides auto-detection.
 */
export type ProcessingLanguage = "auto" | "ur" | "en" | "ar";

/** Resolved mode after auto-detection (never "auto"). */
export type ResolvedLanguage = "ur" | "en" | "ar";

export type DocumentDirection = "rtl" | "ltr";

export interface CorrectionDetail {
  label: string;
  count: number;
}

export interface ProcessTextResult {
  output: string;
  badges: string[];
  summary: {
    totalCorrections: number;
    arabicNormalizations: number;
    spacingFixes: number;
    punctuationFixes: number;
  };
  corrections: CorrectionDetail[];
  /** Mode actually applied (after resolving "auto"). */
  resolvedLanguage: ResolvedLanguage;
  /** DOCX / layout direction for export. */
  direction: DocumentDirection;
}
