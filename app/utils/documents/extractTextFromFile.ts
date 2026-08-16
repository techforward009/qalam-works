// Using the explicit browser build of mammoth so the bundle never pulls in
// Node-only modules (fs, path, etc.). { arrayBuffer } is the browser-safe
// input — no Buffer, no environment detection.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth/mammoth.browser") as typeof import("mammoth");

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
 * client-side.
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
 * Extracts raw text from an uploaded .txt or .docx file. Browser-only —
 * uses Web APIs (file.arrayBuffer(), mammoth browser build) so it works
 * correctly in client components. Does NOT normalize or clean the text;
 * each caller decides what to do with the raw result.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith(".docx")) {
    // mammoth/mammoth.browser accepts { arrayBuffer } — no Buffer, no Node globals.
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  return decodeTextBuffer(new Uint8Array(arrayBuffer));
}
