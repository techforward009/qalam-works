/**
 * WhatsApp RTL Formatter
 *
 * Strategy (plain-text bidi for WhatsApp):
 * - RTL/mixed lines: outer RLI … PDI (keeps markers on the RIGHT).
 * - Embedded LTR tokens (English, URLs, emails, amounts): LRI … PDI.
 * - Leading numbered markers (1. / 1)): NO nested LRI on the marker.
 *   WhatsApp still mis-renders nested-isolate markers as ".1".
 *   Candidate that survives better in practice:
 *     digits + punctuation + LRM
 *   i.e. visible "1." immediately followed by U+200E, all inside outer RLI.
 * - Bullets • - * are unchanged (no LRM).
 * - Final content line that is RTL gets trailing "\n" + RLM anchor.
 *
 * Never reverses, translates, or alters visible characters.
 */

const LRI = "\u2066";
const RLI = "\u2067";
const PDI = "\u2069";
const LRM = "\u200E";
const RLM = "\u200F";

/**
 * Strip only controls this formatter inserts.
 */
function stripOwnBidiControls(text: string): string {
  let s = text.replace(/[\u2066\u2067\u2069]/g, "");
  // LRM immediately after a numbered marker (1. / 1))
  s = s.replace(/(\d+[.)])\u200E/g, "$1");
  // Trailing final-line RLM anchor
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
    result =
      result.slice(0, start) +
      isolateLtr(result.slice(start, end)) +
      result.slice(end);
  }
  return result;
}

/**
 * Leading numbered-marker helper (WhatsApp-oriented candidate).
 *
 * Does NOT wrap the marker in LRI (nested isolates still render as ".1"
 * in real WhatsApp). Instead:
 *   digits + punctuation + LRM
 *
 * Example for "1.":
 *   "1." + U+200E
 *
 * Example for "1)":
 *   "1)" + U+200E
 *
 * Outer RLI on the whole line still places the marker on the RIGHT.
 * Stripping formatter controls restores exactly "1." / "1)".
 */
function formatLeadingNumberedMarker(digits: string, punct: string): string {
  return digits + punct + LRM;
}

function processLine(line: string): string {
  if (line.length === 0) return line;
  if (!lineHasRtl(line)) return line;

  // Leading numbered list marker only (1. 2) 10. …)
  const numbered = line.match(/^(\d+)([.)])(\s*)(.*)$/);
  if (numbered) {
    const [, digits, punct, spaces, rest] = numbered;
    const marker = formatLeadingNumberedMarker(digits, punct);
    const body = isolateLtrRuns(rest);
    return isolateRtl(marker + spaces + body);
  }

  // Bullets and ordinary RTL/mixed lines
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

  if (lines[lastIdx].includes(RLI)) {
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
  return ensureFinalRtlStability(processed.join("\n"));
}

export function countBidiControls(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (ch === LRI || ch === RLI || ch === PDI) count++;
  }
  return count;
}

export const BIDI = { LRI, RLI, PDI, LRM, RLM } as const;
