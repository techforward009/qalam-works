import mammoth from "mammoth";
import { standardizeUrduText } from "./unicode/standardizeUrduText";
import { checkTextQuality } from "./qualityChecker";
import { PipelineResult } from "../types/documentPipeline";

/**
 * Decodes a text file buffer, correctly handling the encodings actually
 * seen in the wild:
 * - Windows Notepad's "Unicode" save option → UTF-16 LE with a BOM
 * - Plain UTF-8 (with or without BOM) — the common case
 * - Legacy Arabic-script encodings (e.g. Windows-1256) as a last-resort
 *   fallback if UTF-8 decoding looks corrupted
 *
 * BOM (byte-order mark) bytes at the start of the file are the reliable
 * signal — checked first, before falling back to heuristics.
 */
function decodeTextBuffer(buffer: Buffer): string {
  // UTF-16 LE BOM: FF FE (Windows Notepad "Unicode")
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  }
  // UTF-16 BE BOM: FE FF
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer.subarray(2));
  }
  // UTF-8 BOM: EF BB BF
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer.subarray(3));
  }

  // No BOM found — assume UTF-8 (the standard default for text files).
  const utf8Text = new TextDecoder("utf-8").decode(buffer);
  const utf8ReplacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
  const looksCorrupted = utf8ReplacementCount > utf8Text.length * 0.02;
  if (!looksCorrupted) return utf8Text;

  // UTF-8 decode looked corrupted — try a common legacy Arabic encoding.
  try {
    const legacyText = new TextDecoder("windows-1256").decode(buffer);
    const legacyReplacementCount = (legacyText.match(/\uFFFD/g) || []).length;
    if (legacyReplacementCount < utf8ReplacementCount) {
      return legacyText;
    }
  } catch {
    // windows-1256 decoder unavailable in this environment — keep UTF-8 result.
  }

  return utf8Text;
}

export async function processDocument(file: File): Promise<PipelineResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let rawText = "";
    if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      rawText = decodeTextBuffer(buffer);
    }

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
