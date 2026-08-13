import { extractTextFromFile } from "../utils/documents/extractTextFromFile";
import { processText } from "../utils/processing/processText";
import { checkTextQuality } from "../utils/quality/checkTextQuality";
import { formatFileSize } from "../utils/formatFileSize";
import type { PipelineResult } from "../types/documentPipeline";
import type { ProcessingLanguage } from "../utils/processing/types";

/**
 * Document Cleaner pipeline: extract → language-aware process → audit.
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
    const processed = processText(originalText, processingLanguage);
    const remainingIssues = checkTextQuality(processed.output, processed.resolvedLanguage);

    const wordCount = processed.output.trim()
      ? processed.output.trim().split(/\s+/).length
      : 0;

    return {
      success: true,
      originalText,
      cleanedText: processed.output,
      summary: {
        fileName: file.name,
        fileType: file.name.toLowerCase().endsWith(".docx") ? "DOCX" : "TXT",
        fileSize: formatFileSize(file.size),
        characterCount: processed.output.length,
        wordCount,
        correctionsApplied: processed.summary,
        remainingIssues,
        resolvedLanguage: processed.resolvedLanguage,
        direction: processed.direction,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Processing error / پراسیسنگ میں خرابی۔",
    };
  }
}
