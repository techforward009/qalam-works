import mammoth from "mammoth";
import { standardizeUrduText } from "./unicodeStandardizer";
import { checkTextQuality } from "./qualityChecker";
import { PipelineResult } from "../types/documentPipeline";
import { formatFileSize } from "./fileValidation";

export async function processDocument(file: File): Promise<PipelineResult> {
  try {
    let rawText = "";
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "txt") {
      rawText = await file.text();
    } else if (fileExtension === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      rawText = result.value;
    } else {
      return { success: false, error: "ناقابلِ تائید فائل فارمیٹ / Unsupported file format." };
    }

    if (!rawText.trim()) {
      return { success: false, error: "فائل خالی ہے یا متن نہیں نکالا جا سکا / File is empty or text could not be extracted." };
    }

    // 1. Normalize Text (Corrections Applied)
    const standardizationResult = standardizeUrduText(rawText);
    const cleanedText = standardizationResult.output;

    // 2. Audit Remaining Issues on Normalized Output
    const remainingIssues = checkTextQuality(cleanedText);

    // 3. Compute Metrics
    const characterCount = cleanedText.length;
    const wordCount = cleanedText.trim() ? cleanedText.trim().split(/\s+/).length : 0;

    return {
      success: true,
      originalText: rawText,
      cleanedText,
      summary: {
        fileName: file.name,
        fileType: file.type || `.${fileExtension}`,
        fileSize: formatFileSize(file.size),
        characterCount,
        wordCount,
        correctionsApplied: {
          totalCorrections: standardizationResult.summary.totalCorrections,
          arabicNormalizations: standardizationResult.summary.arabicNormalizations,
          spacingFixes: standardizationResult.summary.spacingFixes,
          punctuationFixes: standardizationResult.summary.punctuationFixes,
        },
        remainingIssues,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "فائل پراسیس کرنے میں خرابی پیش آئی / Error processing file." };
  }
}
