/**
 * WhatsApp RTL Formatter
 *
 * Production contract (cross-platform WhatsApp testing):
 * - Do NOT inject bidi controls (RLI/LRI/PDI/RLM/LRM).
 * - Direct paste of plain Urdu/mixed text is more reliable than wrappers.
 * - Only normalize list markers for WhatsApp-friendly display:
 *     leading "1." / "2." …  →  "1)" / "2)" …
 *     leading "•" / "▪" / "-" unordered bullets → sequential "1)" "2)" …
 * - Leave normal Urdu, English, URLs, emails, numbers unchanged.
 * - No bidi controls injected.
 * EXPERIMENTAL Variant K — temporary branch only.
 */

const LRI = "\u2066";
const RLI = "\u2067";
const PDI = "\u2069";
const LRM = "\u200E";
const RLM = "\u200F";

/**
 * Strip bidi controls that this formatter (or earlier experiments) may have inserted.
 * Does not alter visible characters beyond removing those marks.
 */
function stripOwnBidiControls(text: string): string {
  let s = text.replace(/(?:\r?\n)\u200F\s*$/g, "");
  s = s.replace(/[\u2066\u2067\u2069\u200E\u200F\u061C]/g, "");
  // legacy: digit + LRM + . → digit + .
  s = s.replace(/(\d+)\u200E\./g, "$1.");
  return s;
}

/**
 * Line-level list marker normalization (Variant K).
 * - "1. item" → "1) item"
 * - unordered "•" / "▪" / "-" lines → sequential "1)" "2)" "3)" …
 * Existing paren-numbered lines left as-is.
 * No bidi controls.
 */
function normalizeListMarkers(lines: string[]): string[] {
  let bulletCount = 0;
  return lines.map((line) => {
    const dot = line.match(/^(\s*)(\d+)\.(\s+)(.*)$/);
    if (dot) {
      const [, lead, num, spaces, rest] = dot;
      return lead + num + ")" + spaces + rest;
    }
    // already paren-numbered
    if (/^\s*\d+\)\s/.test(line)) {
      return line;
    }
    const bullet = line.match(/^(\s*)[•▪\-](\s+)(.*)$/);
    if (bullet) {
      const [, lead, spaces, rest] = bullet;
      bulletCount += 1;
      return lead + bulletCount + ")" + spaces + rest;
    }
    return line;
  });
}

export function formatForWhatsAppRTL(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const cleaned = stripOwnBidiControls(input);
  return normalizeListMarkers(cleaned.split(/\r?\n/)).join("\n");
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
