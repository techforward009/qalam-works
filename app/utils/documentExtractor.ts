import mammoth from "mammoth";
import { standardizeUrduText } from "./unicodeStandardizer";
import { checkTextQuality } from "./qualityChecker";
import { PipelineResult } from "../types/documentPipeline";

export async function processDocument(file: File): Promise<PipelineResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let rawText = "";

    if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      const decoder = new TextDecoder("utf-8");
      rawText = decoder.decode(buffer);
    }

    const { cleanedText, stats: normStats } = standardizeUrduText(rawText);
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
