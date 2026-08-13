import type { ProcessingLanguage, ResolvedLanguage } from "./types";

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_LETTER = /[A-Za-z]/;

/**
 * Conservative local script detection — no network, no AI.
 *
 * LIMITATIONS:
 * - Unicode Arabic block is shared by Urdu, Arabic, Persian, etc.
 * - We NEVER auto-select "ur" or "ar" from script alone.
 * - Arabic-script (or mixed Latin + Arabic-script) with uncertain
 *   language → "rtl-neutral" (safe spacing only, no Urdu orthography maps).
 * - Predominantly / pure Latin → "en".
 * - Explicit user choice always overrides this function.
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
  if (total === 0) return "en"; // digits/punct only — English-safe neutral path

  const latinRatio = latin / total;

  // Obvious Latin-only or overwhelmingly Latin with no Arabic script
  if (arabic === 0) return "en";
  if (latinRatio >= 0.95 && arabic < 3) return "en";

  // Any meaningful Arabic-script presence without explicit language choice
  // → non-destructive RTL path (never assume Urdu)
  if (arabic > 0) return "rtl-neutral";

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
