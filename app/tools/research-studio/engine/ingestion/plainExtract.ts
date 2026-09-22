import type { ExtractionMethod } from "../types/document";

/** Decode uploaded text without calling processText. */
export function decodeTextBytes(bytes: Uint8Array): string {
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
    if (legacyReplacementCount < utf8ReplacementCount) return legacyText;
  } catch {
    // keep UTF-8
  }

  return utf8Text;
}

/**
 * TXT/MD pages: form-feed (`\f`) is a real page break.
 * No form-feed → a single page 1. Do not invent extra pages.
 */
export function splitPlainPages(text: string): string[] {
  if (text.length === 0) return [];
  if (!text.includes("\f")) return [text];
  return text.split("\f");
}

export function plainExtractionMethod(kind: "txt" | "md"): ExtractionMethod {
  return kind === "md" ? "markdown" : "plain";
}
