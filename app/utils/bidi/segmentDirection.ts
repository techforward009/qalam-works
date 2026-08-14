/**
 * BiDi direction helpers for mixed RTL/LTR display.
 * Does NOT modify text content — rendering only.
 */

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F]/;
const URL_OR_EMAIL = /(?:https?:\/\/|www\.)[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export type TextDirection = "rtl" | "ltr";

export interface DirectionSegment {
  text: string;
  dir: TextDirection;
}

export interface DirectionLine {
  text: string;
  dir: TextDirection;
  segments: DirectionSegment[];
}

function countScripts(text: string): { arabic: number; latin: number } {
  let arabic = 0;
  let latin = 0;
  for (const ch of text) {
    if (ARABIC_SCRIPT.test(ch)) arabic++;
    else if (LATIN_LETTER.test(ch)) latin++;
  }
  return { arabic, latin };
}

/**
 * Direction for a single line or segment of text.
 * - Dominant Arabic script → rtl
 * - Dominant / pure Latin → ltr
 * - Neither (digits/punct only) → fallback
 */
export function detectTextDirection(
  text: string,
  fallback: TextDirection = "rtl"
): TextDirection {
  const sample = text.trim();
  if (!sample) return fallback;

  // Pure URL/email lines read LTR
  const withoutUrls = sample.replace(URL_OR_EMAIL, " ");
  const { arabic, latin } = countScripts(withoutUrls);

  if (arabic === 0 && latin === 0) {
    // digits, punctuation, or only URLs
    if (URL_OR_EMAIL.test(sample)) return "ltr";
    return fallback;
  }
  if (arabic === 0) return "ltr";
  if (latin === 0) return "rtl";
  // Mixed: majority script wins; ties favor RTL for Arabic-script documents
  return arabic >= latin ? "rtl" : "ltr";
}

/**
 * Split a line into maximal runs of Arabic-script vs Latin-oriented text.
 * URLs/emails are forced into LTR isolates.
 */
export function segmentLine(
  line: string,
  fallback: TextDirection = "rtl"
): DirectionSegment[] {
  if (!line) return [{ text: line, dir: fallback }];

  const segments: DirectionSegment[] = [];
  // Tokenize: URL/email | arabic-run | latin-run | other
  const tokenRe =
    /((?:https?:\/\/|www\.)[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF.,،؟؛:!?'"«»()[\]{}-]*)*)|([A-Za-z\u00C0-\u024F]+(?:[\sA-Za-z\u00C0-\u024F0-9.,!?;:'"()\-]*)*)|([\s\S])/g;

  let m: RegExpExecArray | null;
  let buffer = "";
  let bufferDir: TextDirection | null = null;

  const flush = () => {
    if (buffer.length === 0) return;
    segments.push({ text: buffer, dir: bufferDir ?? fallback });
    buffer = "";
    bufferDir = null;
  };

  while ((m = tokenRe.exec(line)) !== null) {
    const url = m[1];
    const arabicRun = m[2];
    const latinRun = m[3];
    const other = m[4];

    let piece: string;
    let dir: TextDirection;

    if (url) {
      piece = url;
      dir = "ltr";
    } else if (arabicRun) {
      piece = arabicRun;
      dir = "rtl";
    } else if (latinRun) {
      piece = latinRun;
      dir = "ltr";
    } else {
      piece = other ?? "";
      dir = bufferDir ?? fallback;
    }

    if (bufferDir === null) {
      buffer = piece;
      bufferDir = dir;
    } else if (bufferDir === dir) {
      buffer += piece;
    } else {
      flush();
      buffer = piece;
      bufferDir = dir;
    }
  }
  flush();

  if (segments.length === 0) return [{ text: line, dir: fallback }];
  return segments;
}

/**
 * Split full text into lines with per-line direction and intra-line segments.
 */
export function analyzeMixedDirectionText(
  text: string,
  documentFallback: TextDirection = "rtl"
): DirectionLine[] {
  // Preserve exact line breaks (including trailing)
  const parts = text.split("\n");
  return parts.map((line) => {
    const dir = detectTextDirection(line, documentFallback);
    const segments = segmentLine(line, dir);
    return { text: line, dir, segments };
  });
}
