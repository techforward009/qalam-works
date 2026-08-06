import { buildDocumentAuditReport } from "../tools/document-studio/utils/buildDocumentAuditReport";
import type { DocNode } from "../tools/document-studio/utils/extractPlainText";

export interface DocumentAnalysisResult {
  typography: {
    mixedScript: number;
    emptyLines: number;
    longParagraphs: number;
  };
  punctuation: {
    mixedPunctuation: number;
    wrongQuotes: number;
  };
  textQuality: {
    repeatedWords: number;
    mixedScript: number;
  };
  badges: string[];
  score: number;
  totalIssues: number;
}

export function extractDocumentMetadata(doc: DocNode): DocumentAnalysisResult {
  const auditReport = buildDocumentAuditReport(doc);

  return {
    typography: {
      mixedScript: auditReport.counts.mixedScript,
      emptyLines: 0,
      longParagraphs: auditReport.counts.longParagraphs,
    },
    punctuation: {
      mixedPunctuation: auditReport.counts.punctuation,
      wrongQuotes: 0,
    },
    textQuality: {
      repeatedWords: 0,
      mixedScript: auditReport.counts.mixedScript,
    },
    badges: auditReport.recommendations.map((rec) => rec.titleEnglish),
    score: auditReport.score,
    totalIssues: auditReport.totalIssues,
  };
}
