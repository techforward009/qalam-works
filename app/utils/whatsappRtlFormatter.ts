/**
 * WhatsApp RTL Formatter
 * Pure TypeScript engine for preparing mixed Urdu/English plain text
 * so that it remains visually stable when pasted into WhatsApp.
 *
 * Strategy (plain-text bidi, not CSS):
 * - Lines that contain Urdu/Arabic script are wrapped in RLI … PDI so the
 *   entire logical line is an RTL paragraph. That keeps list markers
 *   (1. 2) • - *) on the RIGHT side in WhatsApp.
 * - Inside that RTL isolate, genuine LTR tokens (English words, URLs,
 *   emails, abbreviations, numbers) are wrapped in LRI … PDI so they
 *   still read left-to-right.
 * - Pure English / pure LTR lines are left completely untouched.
 *
 * Never reverses, translates, renumbers or alters visible characters.
 */

// Unicode Bidirectional Isolation Controls we intentionally insert
const LRI = "\u2066"; // LEFT-TO-RIGHT ISOLATE
const RLI = "\u2067"; // RIGHT-TO-LEFT ISOLATE
const PDI = "\u2069"; // POP DIRECTIONAL ISOLATE

/**
 * Strip only the isolation controls that *this* formatter inserts
 * (LRI / RLI / PDI). User-supplied directional marks are preserved.
 */
function stripOwnBidiControls(text: string): string {
  return text.replace(/[\u2066\u2067\u2069]/g, "");
}

/**
 * Arabic / Urdu script (RTL) detection.
 */
function isRtlChar(ch: string): boolean {
  const code = ch.codePointAt(0)!;
  return (
    (code >= 0x0600 && code <= 0x06ff) || // Arabic
    (code >= 0x0750 && code <= 0x077f) || // Arabic Supplement
    (code >= 0x08a0 && code <= 0x08ff) || // Arabic Extended-A
    (code >= 0xfb50 && code <= 0xfdff) || // Arabic Presentation Forms-A
    (code >= 0xfe70 && code <= 0xfeff) // Arabic Presentation Forms-B
  );
}

/**
 * Characters that may appear inside a single LTR token
 * (words, numbers, abbreviations, URLs, emails).
 */
function isLtrTokenChar(ch: string): boolean {
  const code = ch.codePointAt(0)!;
  if (
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    (code >= 0x30 && code <= 0x39)
  ) {
    return true;
  }
  // Include comma so amounts like 720,000 stay one LTR token
  if ("@._\-:/?&=%+#,~,".includes(ch)) {
    return true;
  }
  return false;
}

/**
 * True when the segment contains at least one alphanumeric character.
 * Prevents isolating pure punctuation runs.
 */
function isMeaningfulLtrRun(segment: string): boolean {
  return /[A-Za-z0-9]/.test(segment);
}

/**
 * Locate maximal meaningful LTR runs inside a string.
 */
function findLtrRuns(text: string): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    if (!isLtrTokenChar(text[i])) {
      i++;
      continue;
    }
    const start = i;
    while (i < len && isLtrTokenChar(text[i])) {
      i++;
    }
    const segment = text.slice(start, i);
    if (isMeaningfulLtrRun(segment)) {
      runs.push({ start, end: i });
    }
  }
  return runs;
}

/**
 * Does this line contain any RTL (Urdu/Arabic) character?
 */
function lineHasRtl(line: string): boolean {
  for (const ch of line) {
    if (isRtlChar(ch)) return true;
  }
  return false;
}

function isolateLtr(text: string): string {
  return LRI + text + PDI;
}

function isolateRtl(text: string): string {
  return RLI + text + PDI;
}

/**
 * Isolate meaningful LTR runs inside a string (does not wrap the whole
 * string in RLI — caller is responsible for the outer RTL isolate).
 */
function isolateLtrRuns(text: string): string {
  const runs = findLtrRuns(text);
  if (runs.length === 0) return text;

  let result = text;
  for (let r = runs.length - 1; r >= 0; r--) {
    const { start, end } = runs[r];
    const before = result.slice(0, start);
    const segment = result.slice(start, end);
    const after = result.slice(end);
    result = before + isolateLtr(segment) + after;
  }
  return result;
}

/**
 * Process one logical line.
 *
 * RTL / mixed lines:
 *   RLI + (line with internal LRI…PDI around LTR tokens) + PDI
 * This forces the whole line — including leading list markers — into an
 * RTL paragraph so markers stay on the right edge in WhatsApp.
 *
 * Pure LTR lines are returned unchanged.
 */
function processLine(line: string): string {
  if (line.length === 0) return line;
  if (!lineHasRtl(line)) return line;

  // Isolate LTR fragments first, then wrap the entire line as RTL.
  // List markers (1. 2) • - *) remain inside the RLI so they participate
  // in the RTL paragraph direction.
  const withLtrIsolates = isolateLtrRuns(line);
  return isolateRtl(withLtrIsolates);
}

/**
 * Main public API.
 *
 * - Idempotent: previous LRI/RLI/PDI are stripped, then re-applied.
 * - Never alters visible characters, order, numbers, URLs, emails or wording.
 * - Pure English paragraphs receive zero control characters.
 */
export function formatForWhatsAppRTL(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const cleaned = stripOwnBidiControls(input);
  const lines = cleaned.split(/\r?\n/);
  const processed = lines.map(processLine);
  return processed.join("\n");
}

/**
 * Helper for tests / debugging: count isolation controls present.
 */
export function countBidiControls(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (ch === LRI || ch === RLI || ch === PDI) count++;
  }
  return count;
}

/**
 * Exposed for tests.
 */
export const BIDI = { LRI, RLI, PDI } as const;
