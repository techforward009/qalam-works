import { QualityReport } from "../utils/qualityChecker";

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
}

export interface PipelineResult {
  success: boolean;
  error?: string;
  originalText?: string;
  cleanedText?: string;
  summary?: PipelineSummary;
}
