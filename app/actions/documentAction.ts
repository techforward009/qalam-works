import { extractTextFromFile } from "../utils/documents/extractTextFromFile";
import { standardizeUrduText } from "../utils/unicode/standardizeUrduText";
import { checkTextQuality } from "../utils/quality/checkTextQuality";
import { formatFileSize } from "../utils/formatFileSize";
import type { PipelineResult } from "../types/documentPipeline";

/**
 * The full Document Cleaner pipeline: extract → standardize → audit →
 * assemble a PipelineResult (see app/types/documentPipeline.ts).
 *
 * REBUILT 2026-08-08 — the previous version had drifted completely from
 * this contract: it read .docx files with file.text() (which doesn't
 * decode a binary ZIP file correctly — .docx is a ZIP archive, not plain
 * text), built a malformed DocNode ({ text: fileText } with no `content`
 * array, which every adapter in app/tools/document-studio/utils/ requires
 * to find any text at all), and returned { auditReport, qualityReport }
 * instead of the { summary, cleanedText } shape DocumentCleanerTool.tsx
 * actually renders — so uploads silently produced an empty, all-zero
 * report with no visible error. Reconnected to the real, working engines
 * already used elsewhere in the app (extractTextFromFile, which properly
 * handles .docx via mammoth and .txt encoding detection;
 * standardizeUrduText for corrections; checkTextQuality for the
 * remaining-issues audit on the cleaned text).
 */
export async function handleDocumentUpload(input: FormData | File): Promise<PipelineResult> {
  try {
    let file: File | null = null;

    if (input instanceof FormData) {
      file = (input.get("file") as File) || (input.get("document") as File);
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
    const { output: cleanedText, summary: correctionsApplied } = standardizeUrduText(originalText);
    const remainingIssues = checkTextQuality(cleanedText);

    const wordCount = cleanedText.trim() ? cleanedText.trim().split(/\s+/).length : 0;

    return {
      success: true,
      originalText,
      cleanedText,
      summary: {
        fileName: file.name,
        fileType: file.name.toLowerCase().endsWith(".docx") ? "DOCX" : "TXT",
        fileSize: formatFileSize(file.size),
        characterCount: cleanedText.length,
        wordCount,
        correctionsApplied,
        remainingIssues,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Processing error / پراسیسنگ میں خرابی۔",
    };
  }
}
