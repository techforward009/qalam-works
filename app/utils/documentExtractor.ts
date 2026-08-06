import { buildDocumentAuditReport } from "../tools/document-studio/utils/buildDocumentAuditReport";
import type { DocNode } from "../tools/document-studio/utils/extractPlainText";

export interface QualityReport {
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
}

export function extractDocumentData(doc: DocNode) {
  const auditReport = buildDocumentAuditReport(doc);

  const qualityReport: QualityReport = {
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
    badges: auditReport.recommendations.map((r) => r.titleEnglish),
  };

  return {
    auditReport,
    qualityReport,
  };
}

// documentAction.ts کی امپورٹ کی مطابقت کے لیے ایکسپورٹڈ پرائمری فنکشن
export function processDocument(doc: DocNode) {
  return extractDocumentData(doc);
}

export default processDocument;
