import { QualityReport } from "../utils/quality/checkTextQuality";

export interface PipelineSummary {
  fileName: string;
  fileType: string;
  fileSize: string;
  characterCount: number;
  wordCount: number;
  correctionsApplied: {
    totalCorrections: number;
    arabicNormalizations: number;
    spacingFixes: number;
    punctuationFixes: number;
  };
  remainingIssues: QualityReport;
  /** Resolved processing language after auto-detect / explicit choice. */
  resolvedLanguage?: "ur" | "en" | "ar";
  /** Document direction for DOCX export. */
  direction?: "rtl" | "ltr";
}

export interface PipelineResult {
  success: boolean;
  error?: string;
  originalText?: string;
  cleanedText?: string;
  summary?: PipelineSummary;
}
