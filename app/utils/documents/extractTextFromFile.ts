import mammoth from "mammoth";

/**
 * Decodes a text file's raw bytes, correctly handling the encodings actually
 * seen in the wild:
 * - Windows Notepad's "Unicode" save option → UTF-16 LE with a BOM
 * - Plain UTF-8 (with or without BOM) — the common case
 * - Legacy Arabic-script encodings (e.g. Windows-1256) as a last-resort
 *   fallback if UTF-8 decoding looks corrupted
 *
 * Takes a Uint8Array (not Node's Buffer) so this works correctly when
 * called from browser code — Buffer is a Node global and is NOT available
 * client-side. Uint8Array has the same .length/indexing/.subarray() used
 * here and TextDecoder.decode() accepts it directly.
 */
function decodeTextBuffer(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  const utf8Text = new TextDecoder("utf-8").decode(bytes);
  const utf8ReplacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
  const looksCorrupted = utf8ReplacementCount > utf8Text.length * 0.02;
  if (!looksCorrupted) return utf8Text;

  try {
    const legacyText = new TextDecoder("windows-1256").decode(bytes);
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
 *
 * BUG FIX (2026-08-08): this used to build a Node.js Buffer via
 * Buffer.from() and pass it to mammoth as { buffer }. That's a Node-only
 * global — calling this from a "use client" component (which is how
 * QualityCheckerTool.tsx actually uses it) threw "Buffer is not defined"
 * in the real browser, caught by the caller's try/catch and shown as a
 * generic "Failed to read file" error. Fixed by using only Web-standard
 * APIs: mammoth's own type definitions confirm it accepts
 * { arrayBuffer: ArrayBuffer } as a valid browser input (no Buffer
 * needed), and plain-text decoding now works on a Uint8Array instead.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    // mammoth's browser build accepts { arrayBuffer }; the Node build
    // accepts { buffer }. Convert to a Node Buffer where Buffer is available
    // (server-side extraction path), otherwise fall through to { arrayBuffer }.
    const result = typeof Buffer !== "undefined"
      ? await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) })
      : await mammoth.extractRawText({ arrayBuffer } as never);
    return result.value;
  }

  return decodeTextBuffer(new Uint8Array(arrayBuffer));
}
