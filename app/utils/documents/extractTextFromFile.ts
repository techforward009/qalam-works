import mammoth from "mammoth";

/**
 * Decodes a text file buffer, correctly handling the encodings actually
 * seen in the wild:
 * - Windows Notepad's "Unicode" save option → UTF-16 LE with a BOM
 * - Plain UTF-8 (with or without BOM) — the common case
 * - Legacy Arabic-script encodings (e.g. Windows-1256) as a last-resort
 *   fallback if UTF-8 decoding looks corrupted
 */
function decodeTextBuffer(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer.subarray(2));
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer.subarray(3));
  }

  const utf8Text = new TextDecoder("utf-8").decode(buffer);
  const utf8ReplacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
  const looksCorrupted = utf8ReplacementCount > utf8Text.length * 0.02;
  if (!looksCorrupted) return utf8Text;

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

/**
 * Extracts raw text from an uploaded .txt or .docx file. Shared by any
 * tool that needs a file's plain text content (Unicode Standardizer,
 * Quality Checker, Document Pipeline) — this function does ONLY
 * extraction, no standardization or quality checking, so each tool can
 * decide what to do with the raw text afterward.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.name.toLowerCase().endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return decodeTextBuffer(buffer);
}
