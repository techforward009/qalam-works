/**
 * WhatsApp RTL Formatter
 *
 * Production contract (cross-platform WhatsApp testing):
 * - Do NOT inject bidi controls (RLI/LRI/PDI/RLM/LRM).
 * - Direct paste of plain Urdu/mixed text is more reliable than wrappers.
 * - Only normalize list markers for WhatsApp-friendly display:
 *     leading "1." / "2." …  →  "1)" / "2)" …
 *     unordered bullets (• ▪ - ◆ — ◦) → "◆" (Variant L experiment)
 * - No bidi controls. Leave normal Urdu/English/URLs/emails unchanged.
 * EXPERIMENTAL Variant L — temporary branch only.
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
 * Line-level list marker normalization (Variant L).
 * - "1. item" → "1) item"
 * - unordered • ▪ - ◆ — ◦ → "◆ item"
 * No bidi controls.
 */
function normalizeListMarkers(line: string): string {
  const dot = line.match(/^(\s*)(\d+)\.(\s+)(.*)$/);
  if (dot) {
    const [, lead, num, spaces, rest] = dot;
    return lead + num + ")" + spaces + rest;
  }

  // Unordered bullets → diamond marker (RTL-visible experiment)
  const bullet = line.match(/^(\s*)[•▪\-◆—◦](\s+)(.*)$/);
  if (bullet) {
    const [, lead, spaces, rest] = bullet;
    return lead + "◆" + spaces + rest;
  }

  return line;
}

export function formatForWhatsAppRTL(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const cleaned = stripOwnBidiControls(input);
  return cleaned
    .split(/\r?\n/)
    .map(normalizeListMarkers)
    .join("\n");
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
