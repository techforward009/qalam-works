import { extractTextFromFile } from "./documents/extractTextFromFile";
import { standardizeUrduText } from "./unicode/standardizeUrduText";
import { checkTextQuality } from "./quality/checkTextQuality";
import { PipelineResult } from "../types/documentPipeline";

export async function processDocument(file: File): Promise<PipelineResult> {
  try {
    const rawText = await extractTextFromFile(file);

    const standardizationResult = standardizeUrduText(rawText);
    const cleanedText = standardizationResult.output;
    const normStats = {
      total: standardizationResult.summary.totalCorrections,
      arabic: standardizationResult.summary.arabicNormalizations,
      spacing: standardizationResult.summary.spacingFixes,
      punctuation: standardizationResult.summary.punctuationFixes,
    };

    const qualityAudit = checkTextQuality(cleanedText);
    const fileSizeKB = (file.size / 1024).toFixed(1) + " KB";
    const wordCount = cleanedText.trim() ? cleanedText.trim().split(/\s+/).length : 0;
    const characterCount = cleanedText.length;

    return {
      success: true,
      cleanedText,
      summary: {
        fileName: file.name,
        fileSize: fileSizeKB,
        wordCount,
        characterCount,
        correctionsApplied: {
          totalCorrections: normStats.total,
          arabicNormalizations: normStats.arabic,
          spacingFixes: normStats.spacing,
          punctuationFixes: normStats.punctuation,
        },
        remainingIssues: qualityAudit,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to process document.",
    };
  }
}
