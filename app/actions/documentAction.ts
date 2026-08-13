import { extractTextFromFile } from "../utils/documents/extractTextFromFile";
import { cleanTextPipeline } from "../utils/processing/cleanTextPipeline";
import { formatFileSize } from "../utils/formatFileSize";
import type { PipelineResult } from "../types/documentPipeline";
import type { ProcessingLanguage } from "../utils/processing/types";

/**
 * Document Cleaner file pipeline: extract → shared cleanTextPipeline.
 * Not a server action — imported by client components and runs locally.
 */
export async function handleDocumentUpload(
  input: FormData | File,
  processingLanguage: ProcessingLanguage = "auto"
): Promise<PipelineResult> {
  try {
    let file: File | null = null;

    if (input instanceof FormData) {
      file = (input.get("file") as File) || (input.get("document") as File);
      const langField = input.get("processingLanguage");
      if (
        langField === "auto" ||
        langField === "ur" ||
        langField === "en" ||
        langField === "ar"
      ) {
        processingLanguage = langField;
      }
    } else {
      file = input;
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return {
        success: false,
        error: "No valid file uploaded / فائل موصول نہیں ہوئی۔",
      };
    }

    const originalText = await extractTextFromFile(file);
    const cleaned = cleanTextPipeline(originalText, processingLanguage);
    if (!cleaned.success) {
      return { success: false, error: cleaned.error };
    }

    const wordCount = cleaned.cleanedText.trim()
      ? cleaned.cleanedText.trim().split(/\s+/).length
      : 0;

    return {
      success: true,
      originalText: cleaned.originalText,
      cleanedText: cleaned.cleanedText,
      summary: {
        fileName: file.name,
        fileType: file.name.toLowerCase().endsWith(".docx") ? "DOCX" : "TXT",
        fileSize: formatFileSize(file.size),
        characterCount: cleaned.cleanedText.length,
        wordCount,
        correctionsApplied: cleaned.correctionsApplied,
        remainingIssues: cleaned.remainingIssues,
        resolvedLanguage: cleaned.resolvedLanguage,
        direction: cleaned.direction,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Processing error / پراسیسنگ میں خرابی۔",
    };
  }
}
