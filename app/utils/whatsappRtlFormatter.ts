/**
 * WhatsApp RTL Formatter
 * Pure TypeScript engine for preparing mixed Urdu/English plain text
 * so that it remains visually stable when pasted into WhatsApp.
 *
 * Optimised for Urdu (RTL) paragraphs that contain embedded LTR fragments
 * (English words, numbers, abbreviations, URLs, emails).
 *
 * Pure English / pure LTR text is left completely untouched.
 * Only modern Unicode bidirectional isolation controls (LRI + PDI)
 * are inserted, and only around meaningful LTR runs that sit inside
 * an RTL context.
 *
 * Numbered / bulleted list markers are deliberately left un-isolated
 * so they stay visually attached to their RTL list item.
 */

// Unicode Bidirectional Isolation Controls we intentionally insert
const LRI = "\u2066"; // LEFT-TO-RIGHT ISOLATE
const PDI = "\u2069"; // POP DIRECTIONAL ISOLATE

/**
 * Strip only the isolation controls that *this* formatter inserts (LRI/PDI).
 * User-supplied directional marks (LRM, RLM, embeddings, etc.) are preserved.
 */
function stripOwnBidiControls(text: string): string {
  return text.replace(/[\u2066\u2069]/g, "");
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
    (code >= 0xfe70 && code <= 0xfeff)    // Arabic Presentation Forms-B
  );
}

/**
 * Characters that may appear inside a single LTR token
 * (words, numbers, abbreviations, URLs, emails).
 * Connectors are allowed only inside a run so that
 * "https://qalamworks.com" or "user@email.com" stay atomic.
 */
function isLtrTokenChar(ch: string): boolean {
  const code = ch.codePointAt(0)!;
  // A-Z a-z 0-9
  if (
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    (code >= 0x30 && code <= 0x39)
  ) {
    return true;
  }
  // Intra-token punctuation for URLs, emails, abbreviations, numbers
  if ("@._\-:/?&=%+#,~".includes(ch)) {
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
 * Detect a leading list marker that should stay attached to the RTL line
 * and must NOT be isolated.
 * Supports: 1.  2)  •  -  *
 */
function matchLeadingListMarker(line: string): { prefix: string; rest: string } | null {
  // Optional leading whitespace + marker + following whitespace
  const m = line.match(/^(\s*(?:\d+[.)]|[•\-*])\s+)/);
  if (!m) return null;
  return { prefix: m[1], rest: line.slice(m[1].length) };
}

/**
 * Locate maximal meaningful LTR runs inside a string.
 * A run is a consecutive sequence of isLtrTokenChar that also
 * contains at least one letter or digit.
 *
 * This prioritises real tokens (URLs, emails, abbreviations, numbers)
 * while avoiding isolation of ordinary punctuation-only sequences.
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
 * Pure LTR lines are left alone.
 */
function lineHasRtl(line: string): boolean {
  for (const ch of line) {
    if (isRtlChar(ch)) return true;
  }
  return false;
}

/**
 * Wrap a single LTR run with LRI … PDI.
 * Isolate (not embed) so the surrounding RTL direction is restored cleanly.
 */
function isolateLtr(text: string): string {
  return LRI + text + PDI;
}

/**
 * Apply isolation to the meaningful LTR runs of a string
 * (used on the content after any list marker).
 */
function isolateLtrRuns(text: string): string {
  const runs = findLtrRuns(text);
  if (runs.length === 0) return text;

  let result = text;
  // Work from the end so earlier offsets stay valid
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
 * - If the line has no RTL content → return unchanged (pure English stays pure).
 * - Leading list markers (1. 2) • - *) are left un-isolated so they stay
 *   visually attached to the RTL list item.
 * - Only the remaining content is scanned for meaningful LTR runs
 *   (URLs, emails, abbreviations, numbers, English words).
 */
function processLine(line: string): string {
  if (line.length === 0) return line;
  if (!lineHasRtl(line)) return line; // pure LTR / English → no controls

  const marker = matchLeadingListMarker(line);
  if (marker) {
    // Keep the marker itself free of isolation controls
    return marker.prefix + isolateLtrRuns(marker.rest);
  }

  return isolateLtrRuns(line);
}

/**
 * Main public API.
 *
 * - Idempotent: previous LRI/PDI are stripped, then re-applied.
 * - Never alters visible characters, order, numbers, URLs, emails or wording.
 * - Only inserts LRI/PDI around meaningful LTR runs that appear inside RTL text.
 * - Pure English paragraphs receive zero control characters.
 * - Numbered / bulleted list markers are never isolated.
 */
export function formatForWhatsAppRTL(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const cleaned = stripOwnBidiControls(input);

  // Process each line independently so list markers stay attached
  // and original line-break structure is preserved.
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
    if (ch === LRI || ch === PDI) count++;
  }
  return count;
}

/**
 * Exposed for tests.
 */
export const BIDI = { LRI, PDI } as const;
