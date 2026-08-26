/**
 * WhatsApp RTL Formatter — EXPERIMENTAL Variant M
 *
 * - No body bidi controls (no RLI/LRI/PDI/LRM).
 * - Numbered: "1." → "1)"
 * - Unordered: • ▪ - ◆ — ◦ → "◆ " with consistent spacing
 * - Continuation lines under a bullet are indented to align under text
 * - End-of-document invisible stabilizer: trailing "\n" + RLM only
 */

const LRI = "\u2066";
const RLI = "\u2067";
const PDI = "\u2069";
const LRM = "\u200E";
const RLM = "\u200F";

const BULLET_MARKER = "◆";
/** Spaces after ◆ so body text is indented; continuation lines use same width. */
const BULLET_GAP = " ";
const CONTINUATION_INDENT = "  "; // width of "◆ "

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

/**
 * Final document stabilizer only (no paragraph wrappers).
 * Appends newline + RLM after last RTL content.
 */
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

    // Numbered: 1. → 1)
    const dot = line.match(/^(\s*)(\d+)\.(\s+)(.*)$/);
    if (dot) {
      const [, lead, num, , rest] = dot;
      inBulletBlock = false;
      out.push(lead + num + ")" + BULLET_GAP + rest);
      continue;
    }

    // Already paren-numbered
    if (/^\s*\d+\)\s/.test(line)) {
      inBulletBlock = false;
      out.push(line);
      continue;
    }

    // Unordered bullets → ◆ with consistent gap
    const bullet = line.match(/^(\s*)[•▪\-◆—◦](\s+)(.*)$/);
    if (bullet) {
      const [, lead, , rest] = bullet;
      inBulletBlock = true;
      out.push(lead + BULLET_MARKER + BULLET_GAP + rest);
      continue;
    }

    // Continuation under bullet: only if already indented; else end block
    if (inBulletBlock && /^\s+\S/.test(line)) {
      const body = line.trimStart();
      out.push(CONTINUATION_INDENT + body);
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
