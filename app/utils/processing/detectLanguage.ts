import type { ProcessingLanguage, ResolvedLanguage } from "./types";

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_LETTER = /[A-Za-z]/;

/**
 * Conservative local script detection — no network, no AI.
 *
 * LIMITATIONS (documented intentionally):
 * - Unicode Arabic block is shared by Urdu, Arabic, Persian, etc.
 * - We NEVER auto-select "ur" vs "ar" from script alone.
 * - Arabic-script-only text defaults to "ur" only when the user chose
 *   Auto and the product’s historical default is Urdu-first — BUT
 *   destructive Urdu letter maps are only applied when resolved === "ur".
 *   For pure Arabic-script with Auto we still resolve to "ur" for
 *   backward-compatible Cleaner defaults; users who need Arabic
 *   preservation must pick Arabic explicitly (or wrap classical quotes
 *   in {{ }} under Urdu mode).
 * - Predominantly Latin → "en".
 * - Mixed Latin + Arabic-script → "ur" (Urdu+English is the common
 *   intentional mix on this product); English letter/punct maps are not
 *   applied to the Arabic-script portions via letter maps only in ur mode.
 */
export function detectProcessingLanguage(text: string): ResolvedLanguage {
  const sample = text.slice(0, 8000);
  let arabic = 0;
  let latin = 0;
  for (const ch of sample) {
    if (ARABIC_SCRIPT.test(ch)) arabic++;
    else if (LATIN_LETTER.test(ch)) latin++;
  }
  const total = arabic + latin;
  if (total === 0) return "en"; // digits/punct only — treat as neutral English-safe
  const latinRatio = latin / total;
  const arabicRatio = arabic / total;
  if (latinRatio >= 0.85 && arabic === 0) return "en";
  if (latinRatio >= 0.9) return "en";
  if (arabicRatio >= 0.15) return "ur"; // Arabic-script present → Urdu-first product default
  return "en";
}

export function resolveProcessingLanguage(
  mode: ProcessingLanguage,
  text: string
): ResolvedLanguage {
  if (mode === "ur" || mode === "en" || mode === "ar") return mode;
  return detectProcessingLanguage(text);
}

export function directionForLanguage(lang: ResolvedLanguage): "rtl" | "ltr" {
  return lang === "en" ? "ltr" : "rtl";
}
