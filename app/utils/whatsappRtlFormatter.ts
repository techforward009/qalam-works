/**
 * WhatsApp RTL Formatter — Variant O (production)
 *
 * - No body bidi controls (no RLI/LRI/PDI/LRM).
 * - Numbered: "1." → "1)"
 * - Unordered: • ▪ - ◆ — ◦ → RLM + "◆ item" (leading RLM on bullet lines only)
 * - Continuation lines (already indented) align under text after ◆
 * - End-of-document invisible stabilizer: trailing "\n" + RLM only (same as M)
 */

const LRI = "\u2066";
const RLI = "\u2067";
const PDI = "\u2069";
const LRM = "\u200E";
const RLM = "\u200F";

const BULLET_MARKER = "◆";
/** Exactly one space after ◆ / after "1)" for consistent layout. */
const MARKER_GAP = " ";
/**
 * Indent for wrapped/continuation lines under bullet body text.
 * Matches visual width of "◆ " (marker + gap).
 */
const CONTINUATION_INDENT = "  ";

function stripOwnBidiControls(text: string): string {
  let s = text.replace(/(?:\r?\n)\u200F\s*$/g, "");
  s = s.replace(/[\u2066\u2067\u2069\u200E\u200F\u061C]/g, "");
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

function lineHasRtl(line: string): boolean {
  for (const ch of line) {
    if (isRtlChar(ch)) return true;
  }
  return false;
}

/** Final document stabilizer only — identical to Variant M. */
function ensureFinalRtlStability(text: string): string {
  if (!text) return text;
  if (/(?:\r?\n)\u200F\s*$/.test(text)) return text;

  const lines = text.split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && lines[lastIdx].trim() === "") lastIdx--;
  if (lastIdx < 0) return text;

  if (lineHasRtl(lines[lastIdx]) || lines[lastIdx].includes(BULLET_MARKER)) {
    if (text.endsWith("\n")) return text + RLM;
    return text + "\n" + RLM;
  }
  return text;
}

function normalizeLines(lines: string[]): string[] {
  const out: string[] = [];
  let inBulletBlock = false;

  for (const line of lines) {
    if (line.trim() === "") {
      inBulletBlock = false;
      out.push(line);
      continue;
    }

    // Numbered: 1. → 1) with single gap
    const dot = line.match(/^(\s*)(\d+)\.(\s*)(.*)$/);
    if (dot) {
      const [, lead, num, , rest] = dot;
      inBulletBlock = false;
      const body = rest.trimStart();
      out.push(lead + num + ")" + (body ? MARKER_GAP + body : ""));
      continue;
    }

    // Already paren-numbered — normalize gap only
    const paren = line.match(/^(\s*)(\d+\))(\s*)(.*)$/);
    if (paren) {
      const [, lead, marker, , rest] = paren;
      inBulletBlock = false;
      const body = rest.trimStart();
      out.push(lead + marker + (body ? MARKER_GAP + body : ""));
      continue;
    }

    // Unordered bullets → ◆ + exactly one space + body
    const bullet = line.match(/^(\s*)[•▪\-◆—◦](\s*)(.*)$/);
    if (bullet) {
      const [, lead, , rest] = bullet;
      inBulletBlock = true;
      const body = rest.trimStart();
      out.push(lead + RLM + BULLET_MARKER + (body ? MARKER_GAP + body : ""));
      continue;
    }

    // Continuation under bullet: only if already indented
    if (inBulletBlock && /^\s+\S/.test(line)) {
      out.push(CONTINUATION_INDENT + line.trimStart());
      continue;
    }

    inBulletBlock = false;
    out.push(line);
  }

  return out;
}

export function formatForWhatsAppRTL(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const cleaned = stripOwnBidiControls(input);
  const normalized = normalizeLines(cleaned.split(/\r?\n/)).join("\n");
  return ensureFinalRtlStability(normalized);
}

export function countBidiControls(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (ch === LRI || ch === RLI || ch === PDI || ch === LRM || ch === RLM) {
      count++;
    }
  }
  return count;
}

export const BIDI = { LRI, RLI, PDI, LRM, RLM } as const;
