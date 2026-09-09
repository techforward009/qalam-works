// Maintenance Batch (2026-08-09) — single source of truth for regex/
// character-set patterns that were previously defined identically in
// BOTH app/utils/quality/checkTextQuality.ts and
// app/tools/document-studio/utils/generateDocumentSuggestions.ts (found
// duplicated during the Document Intelligence audit — 8 exact-copy
// patterns). Extracting them here means a future change only needs to
// happen in one place, and detection/suggestion generation can never
// silently drift apart on what counts as an issue.
//
// Pure constants and pure helper functions only — no DocNode, no React,
// no I/O. Both consumer files import from here instead of redefining.

// Same {{ }} preserve-marker convention used throughout the app —
// content inside is treated as a protected classical Arabic quotation,
// exempt from the script-sensitive checks that use this.
export const PRESERVE_MARKER_REGEX = /\{\{([\s\S]*?)\}\}/g;

// Space/tab runs of 2 or more.
export const MULTIPLE_SPACES_REGEX = /[ \t]{2,}/g;

// Straight/ASCII quotation marks (should be curly in published text).
export const STRAIGHT_QUOTES_REGEX = /["']/g;

// Curly double-quote characters, used to check open/close balance.
export const CURLY_QUOTE_OPEN_REGEX = /\u201C/g;
export const CURLY_QUOTE_CLOSE_REGEX = /\u201D/g;

// A single punctuation mark repeated 2+ times in a row ("؟؟", "!!", "..").
export const DUPLICATED_PUNCTUATION_REGEX = /([.,!?;:،؛؟۔])\1+/g;

// A closing bracket/paren/colon, or terminal punctuation (comma/
// exclamation/question mark, ASCII or Urdu-Arabic form), immediately
// followed by a letter or digit with no space — EXCEPT a comma directly
// between two digits (a thousands separator like "1,000"/"10,000"),
// which is valid formatting, not a missing space. { and [ are excluded
// to avoid interaction with the {{ }} preserve-marker syntax elsewhere.
export const MISSING_SPACE_AFTER_PUNCTUATION_REGEX =
  /(?<!\d),[A-Za-z0-9\u0600-\u06FF]|[)\]:!?،؟۔][A-Za-z0-9\u0600-\u06FF]/g;

// A space immediately BEFORE a terminal punctuation mark ("لفظ ،" instead
// of "لفظ،") — Urdu/Arabic convention attaches punctuation directly to
// the preceding word, like English.
export const SPACE_BEFORE_PUNCTUATION_REGEX = / [.,!?;:،؛؟۔]/g;

// Tatweel/kashida (ـ, U+0640) — a decorative Arabic elongation character,
// almost always an accidental copy-paste artifact in ordinary prose.
export const TATWEEL_REGEX = /\u0640/g;

// Arabic-form letters (ي ى ك أ إ) appearing in what should be Urdu prose —
// the exact same five characters standardizeUrduText.ts's
// CHAR_NORMALIZATIONS already corrects (ي→ی, ى→ی, ك→ک, أ→ا, إ→ا).
export const ARABIC_FORM_LETTERS_REGEX = /[\u064A\u0649\u0643\u0623\u0625]/g;

// Latin letter runs — used both to flag "mixed script" and, in
// generateDocumentSuggestions.ts, for the mixed-script advisory.
export const LATIN_LETTERS_REGEX = /[a-zA-Z]+/g;

export const ARABIC_SCRIPT_CHAR = /[\u0600-\u06FF]/g;
export const LATIN_CHAR = /[a-zA-Z]/g;

/** Same 90% threshold Document Studio language stats use. */
export const SCRIPT_DOMINANT_PERCENT = 90;

export type ParagraphScriptContext = "arabic" | "latin" | "mixed" | "none";

export function scriptContextForText(text: string): ParagraphScriptContext {
  const arabic = (text.match(ARABIC_SCRIPT_CHAR) ?? []).length;
  const latin = (text.match(LATIN_CHAR) ?? []).length;
  const total = arabic + latin;
  if (total === 0) return "none";
  const latinPercent = (latin / total) * 100;
  const arabicPercent = (arabic / total) * 100;
  if (latinPercent >= SCRIPT_DOMINANT_PERCENT) return "latin";
  if (arabicPercent >= SCRIPT_DOMINANT_PERCENT) return "arabic";
  return "mixed";
}

export function isArabicScriptContext(context: ParagraphScriptContext): boolean {
  return context === "arabic" || context === "mixed";
}

/** Paragraphs whose Latin letters may be treated as mixed-script. */
export function splitParagraphs(text: string): string[] {
  return text.split(/\n/);
}

export function arabicContextText(text: string): string {
  return splitParagraphs(text)
    .filter((paragraph) => isArabicScriptContext(scriptContextForText(paragraph)))
    .join("\n");
}

export function hasInconsistentPunctuationStyle(text: string): boolean {
  const hasAsciiComma = /,/.test(text);
  const hasArabicComma = /،/.test(text);
  const hasAsciiSemicolon = /;/.test(text);
  const hasArabicSemicolon = /؛/.test(text);
  const hasAsciiQuestion = /\?/.test(text);
  const hasArabicQuestion = /؟/.test(text);
  return (
    (hasAsciiComma && hasArabicComma) ||
    (hasAsciiSemicolon && hasArabicSemicolon) ||
    (hasAsciiQuestion && hasArabicQuestion)
  );
}

export function countLatinRunsInArabicContext(text: string): number {
  let count = 0;
  for (const paragraph of splitParagraphs(text)) {
    if (!isArabicScriptContext(scriptContextForText(paragraph))) continue;
    const matches = paragraph.match(freshRegex(LATIN_LETTERS_REGEX));
    if (matches) count += matches.length;
  }
  return count;
}

export function countAsciiPunctuationInArabicContext(text: string): number {
  let count = 0;
  for (const paragraph of splitParagraphs(text)) {
    if (!isArabicScriptContext(scriptContextForText(paragraph))) continue;
    const matches = paragraph.match(freshRegex(ASCII_PUNCTUATION_REGEX));
    if (matches) count += matches.length;
  }
  return count;
}

// ASCII comma/semicolon/question-mark mixed into Urdu/Arabic text.
export const ASCII_PUNCTUATION_REGEX = /[;,?]/g;

// Numeral system ranges (2026-08-09 Maintenance Batch, completing the
// pattern-sharing started earlier) — previously duplicated identically
// in buildDocumentStats.ts (with a /g flag, used via .match()) and
// generateDocumentSuggestions.ts (without /g, used via .test()).
// Exported here WITHOUT the /g flag: a global-flag regex is stateful for
// BOTH .exec() AND .test() (confirmed empirically — .test() on a shared
// g-flagged regex can silently return the wrong boolean on a later call
// depending on leftover lastIndex, the same class of bug .exec() has).
// Any consumer that needs "find all matches" (.match() with implied
// global behavior) should construct its own instance via
// `new RegExp(WESTERN_DIGIT_CHAR.source, "g")` — matching this module's
// exec()-loop safety convention.
export const WESTERN_DIGIT_CHAR = /[0-9]/;
export const ARABIC_INDIC_DIGIT_CHAR = /[\u0660-\u0669]/;
export const URDU_INDIC_DIGIT_CHAR = /[\u06F0-\u06F9]/;

/** Constructs a fresh, independent RegExp from a shared pattern's source/flags — safe to use in any stateful context (`.exec()` loops, or `.match()`/`.test()` with a forced "g" flag) without risking lastIndex leakage into other callers. */
export function freshRegex(pattern: RegExp, forceFlags?: string): RegExp {
  return new RegExp(pattern.source, forceFlags ?? pattern.flags);
}

/** Replaces {{ }}-protected content with equal-length whitespace, preserving character offsets for position-based extraction. */
export function stripProtectedMarkers(text: string): string {
  return text.replace(PRESERVE_MARKER_REGEX, (m) => " ".repeat(m.length));
}
