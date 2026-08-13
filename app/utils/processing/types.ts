/**
 * Explicit processing language for document cleaning / quality audit.
 * Explicit user choice always overrides auto-detection.
 */
export type ProcessingLanguage = "auto" | "ur" | "en" | "ar";

/**
 * Resolved mode after auto-detection (never "auto").
 * rtl-neutral = Arabic-script present, Urdu-vs-Arabic uncertain →
 * non-destructive cleanup only (no Urdu letter maps).
 */
export type ResolvedLanguage = "ur" | "en" | "ar" | "rtl-neutral";

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
