import { VOCALIZED_BY_SKELETON } from "./lexicon";
import { hasVowelMark, skeleton } from "./skeleton";

/**
 * Arabic orthography, applied before Indo-Pakistani diacritization.
 * This module does not add harakat.
 *
 * A token is Arabic-target only when its folded skeleton is a known lexical
 * item, or a listed incomplete spelling of one. Urdu, Persian, Latin, digits,
 * and unknown Arabic are returned unchanged.
 *
 * An omitted ا، و، or ي is restored only from RECOVERED_SPELLINGS. Each entry
 * is exactly one of those letters, and the short spelling is not itself a
 * lexicon word. Near-misses that are different words (تتقوا, جمیع, نرانہ)
 * are not repaired.
 */

const LETTER_FOLD: Record<string, string> = {
  "\u06A9": "\u0643",
  "\u06CC": "\u064A",
  "\u06C1": "\u0647",
  "\u06BE": "\u0647",
  "\u06C3": "\u0629",
};

/** Urdu bari yeh. Mapped to Arabic ي only when the result is a known Arabic word. */
const BARI_YEH = "\u06D2";

/** Letters that mark the token as Urdu rather than Arabic-target text. */
const HARD_URDU = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06AF\u06BA]/;

/**
 * Urdu copula. Folding bari yeh here would collide with Arabic ھی.
 * ہے / ھے / هے stay as written.
 */
const URDU_YE_WORDS = new Set(["\u06C1\u06D2", "\u06BE\u06D2", "\u0647\u06D2"]);

export const RECOVERED_SPELLINGS: ReadonlyArray<{
  incomplete: string;
  complete: string;
  letter: "\u0627" | "\u0648" | "\u064A";
}> = [
  { incomplete: "تتوقو", complete: "تتوقوا", letter: "\u0627" },
  { incomplete: "وتتوقو", complete: "وتتوقوا", letter: "\u0627" },
  { incomplete: "لتعتبرو", complete: "لتعتبروا", letter: "\u0627" },
  { incomplete: "وتتوصلو", complete: "وتتوصلوا", letter: "\u0627" },
  { incomplete: "امرو", complete: "امروا", letter: "\u0627" },
];

/** Spurious space inside one known word. Exact pair only; not a general joiner. */
export const BROKEN_SPELLINGS: ReadonlyArray<{ left: string; right: string; complete: string }> = [
  { left: "وتتو", right: "قوا", complete: "وتتوقوا" },
];

function omitsExactlyOne(complete: string, incomplete: string, letter: string): boolean {
  const full = skeleton(complete);
  const short = skeleton(incomplete);
  if (short.length + 1 !== full.length) return false;
  for (let i = 0; i < full.length; i += 1) {
    if (full[i] !== letter) continue;
    if (full.slice(0, i) + full.slice(i + 1) === short) return true;
  }
  return false;
}

for (const item of RECOVERED_SPELLINGS) {
  if (!omitsExactlyOne(item.complete, item.incomplete, item.letter)) {
    throw new Error(`Invalid Arabic spelling recovery: ${item.incomplete}`);
  }
  if (VOCALIZED_BY_SKELETON.has(skeleton(item.incomplete))) {
    throw new Error(`Recovery collides with a lexicon word: ${item.incomplete}`);
  }
  if (!VOCALIZED_BY_SKELETON.has(skeleton(item.complete))) {
    throw new Error(`Recovered spelling is not in the lexicon: ${item.complete}`);
  }
}

const RECOVERY_BY_SKELETON = new Map(
  RECOVERED_SPELLINGS.map((item) => [skeleton(item.incomplete), item.complete]),
);

function foldLetters(core: string): string {
  let out = "";
  for (const ch of core) {
    if (ch === BARI_YEH) {
      out += "\u064A";
      continue;
    }
    out += LETTER_FOLD[ch] ?? ch;
  }
  return out;
}

/**
 * Normalize Arabic-target letters and restore a listed missing letter.
 * Returns the original token when the word is not Arabic-target.
 */
export function prepareArabicToken(core: string): string {
  if (core.length === 0 || hasVowelMark(core) || HARD_URDU.test(core) || URDU_YE_WORDS.has(core)) {
    return core;
  }
  const folded = foldLetters(core);
  const key = skeleton(folded);
  if (key.length === 0) return core;
  if (VOCALIZED_BY_SKELETON.has(key)) return folded;
  const recovered = RECOVERY_BY_SKELETON.get(key);
  if (recovered && VOCALIZED_BY_SKELETON.has(skeleton(recovered))) return recovered;
  return core;
}

/** Join a listed broken spelling. Null when the pair is not that exact case. */
export function joinBrokenSpelling(left: string, right: string): string | null {
  if (hasVowelMark(left) || hasVowelMark(right)) return null;
  if (HARD_URDU.test(left) || HARD_URDU.test(right)) return null;
  const leftKey = skeleton(left);
  const rightKey = skeleton(right);
  for (const item of BROKEN_SPELLINGS) {
    if (leftKey === skeleton(item.left) && rightKey === skeleton(item.right)) return item.complete;
  }
  return null;
}
