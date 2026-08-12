/**
 * WhatsApp RTL Formatter
 * Pure TypeScript engine for preparing mixed Urdu/English plain text
 * so that it remains visually stable when pasted into WhatsApp.
 *
 * Strategy (plain-text bidi, not CSS):
 * - Lines that contain Urdu/Arabic script are wrapped in RLI … PDI so the
 *   entire logical line is an RTL paragraph. That keeps list markers
 *   on the RIGHT side in WhatsApp.
 * - Inside that RTL isolate, genuine LTR tokens (English words, URLs,
 *   emails, abbreviations, numbers) are wrapped in LRI … PDI.
 * - Leading numbered markers use a targeted sequence inside one LTR isolate:
 *     LRI + digit(s) + LRM + "."|")" + PDI
 *   so WhatsApp renders "1." / "1)" rather than ".1" / ")1", while stripped
 *   visible text remains exactly "1." / "1)".
 * - Pure English lines are left untouched.
 * - When the last content line is RTL, an invisible trailing RLM line is
 *   appended so WhatsApp does not flip the final paragraph direction.
 *
 * Never reverses, translates, renumbers or alters visible characters.
 */

const LRI = "\u2066"; // LEFT-TO-RIGHT ISOLATE
const RLI = "\u2067"; // RIGHT-TO-LEFT ISOLATE
const PDI = "\u2069"; // POP DIRECTIONAL ISOLATE
const LRM = "\u200E"; // LEFT-TO-RIGHT MARK
const RLM = "\u200F"; // RIGHT-TO-LEFT MARK

/**
 * Strip only controls this formatter inserts:
 * - LRI / RLI / PDI
 * - LRM between a numbered-marker digit and its punctuation (1\u200E. / 1\u200E))
 * - Trailing RLM-only final-line anchor
 */
function stripOwnBidiControls(text: string): string {
  let s = text.replace(/[\u2066\u2067\u2069]/g, "");
  // digit + LRM + .| )  →  digit + .| )
  s = s.replace(/(\d+)\u200E([.)])/g, "$1$2");
  s = s.replace(/(?:\r?\n)\u200F\s*$/g, "");
  return s;
}

function isRtlChar(ch: string): boolean {
  const code = ch.codePointAt(0)!;
  return (
    (code >= 0x0600 && code <= 0x06ff) ||
    (code >= 0x0750 && code <= 0x077f) ||
    (code >= 0x08a0 && code <= 0x08ff) ||
    (code >= 0xfb50 && code <= 0xfdff) ||
    (code >= 0xfe70 && code <= 0xfeff)
  );
}

function isLtrTokenChar(ch: string): boolean {
  const code = ch.codePointAt(0)!;
  if (
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    (code >= 0x30 && code <= 0x39)
  ) {
    return true;
  }
  if ("@._\-:/?&=%+#,~,".includes(ch)) {
    return true;
  }
  if (ch === ")") {
    return true;
  }
  return false;
}

function isMeaningfulLtrRun(segment: string): boolean {
  return /[A-Za-z0-9]/.test(segment);
}

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
 * Leading numbered marker → LTR isolate with internal LRM between digit
 * and punctuation so the glyph order is "1." not ".1" inside outer RLI.
 *
 * Sequence for "1.":
 *   LRI + "1" + LRM + "." + PDI
 *
 * Sequence for "1)":
 *   LRI + "1" + LRM + ")" + PDI
 *
 * Visible text after stripping controls is still exactly "1." / "1)".
 */
function formatLeadingNumberedMarker(
  digits: string,
  punct: string
): string {
  return LRI + digits + LRM + punct + PDI;
}

function processLine(line: string): string {
  if (line.length === 0) return line;
  if (!lineHasRtl(line)) return line;

  // Leading numbered list marker: 1.  2)  10.  etc.
  const numbered = line.match(/^(\d+)([.)])(\s*)(.*)$/);
  if (numbered) {
    const [, digits, punct, spaces, rest] = numbered;
    const marker = formatLeadingNumberedMarker(digits, punct);
    const body = isolateLtrRuns(rest);
    return isolateRtl(marker + spaces + body);
  }

  // Bullets and ordinary RTL/mixed lines — no marker special-case
  return isolateRtl(isolateLtrRuns(line));
}

function ensureFinalRtlStability(text: string): string {
  if (!text) return text;
  if (/(?:\r?\n)\u200F\s*$/.test(text)) {
    return text;
  }
  const lines = text.split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && lines[lastIdx].trim() === "") lastIdx--;
  if (lastIdx < 0) return text;

  const last = lines[lastIdx];
  if (last.includes(RLI)) {
    if (text.endsWith("\n")) return text + RLM;
    return text + "\n" + RLM;
  }
  return text;
}

export function formatForWhatsAppRTL(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const cleaned = stripOwnBidiControls(input);
  const lines = cleaned.split(/\r?\n/);
  const processed = lines.map(processLine);
  const joined = processed.join("\n");
  return ensureFinalRtlStability(joined);
}

export function countBidiControls(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (ch === LRI || ch === RLI || ch === PDI) count++;
  }
  return count;
}

export const BIDI = { LRI, RLI, PDI, LRM, RLM } as const;
