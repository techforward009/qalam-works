import { buildDocumentAuditReport } from "@/tools/document-studio/utils/buildDocumentAuditReport";
import type { PipelineResult } from "@/types/documentPipeline";

export async function processDocument(file: File): Promise<PipelineResult> {
  const text = await file.text();

  const docNode = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };

  const auditReport = buildDocumentAuditReport(docNode);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characterCount = text.length;

  return {
    rawText: text,
    processedText: text,
    summary: {
      fileType: file.type || "text/plain",
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(2)} KB`,
      wordCount,
      characterCount,
      correctionsApplied: {
        totalCorrections: 0,
        arabicNormalizations: 0,
        spacingFixes: 0,
        punctuationFixes: 0,
      },
      remainingIssues: {
        typography: auditReport.counts.mixedScript,
        punctuation: auditReport.counts.punctuation,
        textQuality: auditReport.counts.spacing,
        badges: auditReport.totalIssues,
      },
    },
  };
}

export async function processDocumentPipeline(file: File): Promise<PipelineResult> {
  return processDocument(file);
}
