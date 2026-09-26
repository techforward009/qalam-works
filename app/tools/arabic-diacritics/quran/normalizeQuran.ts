import { skeleton } from "../engine/skeleton";

/** Urdu-only letters. Bari yeh is folded only for other tokens. */
const HARD_URDU = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06AF\u06BA]/;

const URDU_YE_WORDS = new Set(["\u06C1\u06D2", "\u06BE\u06D2", "\u0647\u06D2"]);

/**
 * Comparison key for Quran matching. Not an output form.
 * Folds ک ی ے ہ ھ ۃ the same way as the general skeleton, and drops harakat.
 * The stored reference string is never passed through this for display.
 */
export function quranMatchKey(text: string): string {
  if (HARD_URDU.test(text) || URDU_YE_WORDS.has(text)) return "";
  const folded = text.replace(/\u06D2/g, "\u064A");
  return skeleton(folded);
}

export function quranKeyStable(text: string): boolean {
  const once = quranMatchKey(text);
  return quranMatchKey(once) === once;
}
