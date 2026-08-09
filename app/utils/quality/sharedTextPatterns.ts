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

// ASCII comma/semicolon/question-mark mixed into Urdu/Arabic text.
export const ASCII_PUNCTUATION_REGEX = /[;,?]/g;

/** Replaces {{ }}-protected content with equal-length whitespace, preserving character offsets for position-based extraction. */
export function stripProtectedMarkers(text: string): string {
  return text.replace(PRESERVE_MARKER_REGEX, (m) => " ".repeat(m.length));
}
