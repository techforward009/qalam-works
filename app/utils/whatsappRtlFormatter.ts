/**
 * WhatsApp RTL Formatter
 *
 * Restored baseline (dd591e6d + final RLM from 118bf9d4):
 * - RTL/mixed lines → outer RLM … RLM (cross-platform; avoids Android RLI break)
 * - Embedded LTR tokens → LRI … PDI
 * - Final RTL content → trailing "\n" + RLM (U+200F)
 * - Pure English → untouched
 *
 * Marker policy (from real WhatsApp testing + forensic diagnosis):
 * - `1)` / `2)` …  peeled; NOT LRI-wrapped; no LRM
 * - bullets `•` `*` `-`  peeled; NOT LRI-wrapped; no LRM
 * - `1.` / `2.` …  peeled like `1)`; marker left raw (NO LRI, NO LRM);
 *   only the body is LTR-isolated. Real WhatsApp still flipped nested
 *   LRI around `1.`; raw marker inside outer RLI is the minimal test.
 *
 * Never reverses or alters visible characters.
 */

const LRI = "\u2066";
const RLI = "\u2067";
const PDI = "\u2069";
const LRM = "\u200E";
const RLM = "\u200F";

/**
 * Strip only controls this formatter inserts:
 * - LRI / RLI / PDI
 * - Legacy LRM between digit and period (from earlier Candidate A experiments)
 * - Trailing final-line RLM anchor
 */
function stripOwnBidiControls(text: string): string {
  // Final stability anchor first (newline + RLM), then isolates + outer RLM marks
  let s = text.replace(/(?:\r?\n)\u200F\s*$/g, "");
  s = s.replace(/[\u2066\u2067\u2069\u200F]/g, "");
  // digit + LRM + .  →  digit + .  (legacy cleanup for idempotence)
  s = s.replace(/(\d+)\u200E\./g, "$1.");
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
  // No ")" here — paren markers must not be absorbed into LTR runs
  if ("@._\-:/?&=%+#,~,".includes(ch)) {
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
  return RLM + text + RLM;
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

function processLine(line: string): string {
  if (line.length === 0) return line;
  if (!lineHasRtl(line)) return line;

  // --- Dot-style 1. 2. 3.: peel marker (NO LRI, NO LRM); body only isolated ---
  // Same structural treatment as 1) / bullets. Nested LRI around "1." still
  // rendered as ".1" in real WhatsApp; leave marker characters fully raw.
  const dot = line.match(/^(\d+\.)(\s*)(.*)$/);
  if (dot) {
    const [, marker, spaces, rest] = dot;
    return isolateRtl(marker + spaces + isolateLtrRuns(rest));
  }

  // --- Paren-style 1) 2) 3): peel marker so it is NOT LRI-wrapped; no LRM ---
  const paren = line.match(/^(\d+\))(\s*)(.*)$/);
  if (paren) {
    const [, marker, spaces, rest] = paren;
    return isolateRtl(marker + spaces + isolateLtrRuns(rest));
  }

  // --- Bullets • * -: peel marker; no LRM / no LRI on the marker itself ---
  const bullet = line.match(/^([•\-*])(\s*)(.*)$/);
  if (bullet) {
    const [, marker, spaces, rest] = bullet;
    return isolateRtl(marker + spaces + isolateLtrRuns(rest));
  }

  // Ordinary RTL / mixed line
  return isolateRtl(isolateLtrRuns(line));
}

/**
 * Proven final-line fix (from 118bf9d4): after last RTL content,
 * append newline + RLM so WhatsApp does not flip the last paragraph.
 */
function ensureFinalRtlStability(text: string): string {
  if (!text) return text;
  if (/(?:\r?\n)\u200F\s*$/.test(text)) {
    return text;
  }
  const lines = text.split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && lines[lastIdx].trim() === "") lastIdx--;
  if (lastIdx < 0) return text;

  if (lines[lastIdx].includes(RLM)) {
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
