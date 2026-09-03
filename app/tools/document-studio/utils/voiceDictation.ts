/**
 * Qalam Works — Voice Dictation Utility (Phase 1)
 *
 * Pure, deterministic transformation of a speech transcript.
 * Rules:
 *  - Convert explicit spoken commands to their punctuation equivalents.
 *  - Commands are detected only as isolated tokens (whitespace-bounded),
 *    not inside other words, to avoid destructive false-positive replacement.
 *  - Longer phrases (e.g. "نیا پیراگراف") are matched before shorter overlapping
 *    ones (e.g. "نقطہ") — order in COMMANDS list matters.
 *  - No LLM rewriting. Transcript content is preserved except explicit commands.
 *  - Safe for mixed Urdu/English text: English commands work in English/mixed modes.
 */

export type DictationLanguage = "ur" | "en" | "mixed";

/** A spoken command → replacement pair. */
interface CommandRule {
  pattern: RegExp;
  replacement: string;
}

// ── Command rules ─────────────────────────────────────────────────────────────
//
// Boundary strategy: (?<!\S) = preceded by whitespace or start-of-string,
//                    (?!\S)  = followed by whitespace or end-of-string.
// This approximates a Unicode-safe word boundary that works for Arabic/Urdu.
// Longer multi-word Urdu phrases come before single-word ones.

const URDU_COMMANDS: CommandRule[] = [
  // Paragraph break (longer phrase first)
  { pattern: /(?<!\S)نیا پیراگراف(?!\S)/g,  replacement: "\n\n" },
  // Line break
  { pattern: /(?<!\S)نئی لائن(?!\S)/g,       replacement: "\n" },
  // Period / full stop
  { pattern: /(?<!\S)فل اسٹاپ(?!\S)/g,       replacement: "۔" },
  { pattern: /(?<!\S)نقطہ(?!\S)/g,           replacement: "۔" },
  // Comma
  { pattern: /(?<!\S)کاما(?!\S)/g,           replacement: "،" },
  { pattern: /(?<!\S)کوما(?!\S)/g,           replacement: "،" },
  // Question mark
  { pattern: /(?<!\S)سوالیہ نشان(?!\S)/g,    replacement: "؟" },
  // Exclamation
  { pattern: /(?<!\S)تعجب(?!\S)/g,           replacement: "!" },
  // Colon
  { pattern: /(?<!\S)سمیہ(?!\S)/g,           replacement: ":" },
  // Semicolon
  { pattern: /(?<!\S)سیمی کولن(?!\S)/g,      replacement: "؛" },
];

const ENGLISH_COMMANDS: CommandRule[] = [
  // Paragraph break (longer phrase first)
  { pattern: /(?<!\S)new paragraph(?!\S)/gi,      replacement: "\n\n" },
  // Line break
  { pattern: /(?<!\S)new line(?!\S)/gi,           replacement: "\n" },
  { pattern: /(?<!\S)newline(?!\S)/gi,            replacement: "\n" },
  // Period / full stop
  { pattern: /(?<!\S)full stop(?!\S)/gi,          replacement: "." },
  { pattern: /(?<!\S)period(?!\S)/gi,             replacement: "." },
  // Comma
  { pattern: /(?<!\S)comma(?!\S)/gi,              replacement: "," },
  // Question mark
  { pattern: /(?<!\S)question mark(?!\S)/gi,      replacement: "?" },
  // Exclamation
  { pattern: /(?<!\S)exclamation mark(?!\S)/gi,   replacement: "!" },
  { pattern: /(?<!\S)exclamation point(?!\S)/gi,  replacement: "!" },
  // Colon
  { pattern: /(?<!\S)colon(?!\S)/gi,              replacement: ":" },
  // Semicolon
  { pattern: /(?<!\S)semicolon(?!\S)/gi,          replacement: ";" },
  // Dash
  { pattern: /(?<!\S)dash(?!\S)/gi,               replacement: "—" },
];

// ── Space cleanup ─────────────────────────────────────────────────────────────
// After command substitution, remove any space(s) that appear immediately
// before a punctuation mark (e.g. " ۔" → "۔").

const PRE_PUNCT_SPACE = /\s+([\u0021\u002C\u002E\u003A\u003B\u003F\u0021\u060C\u061B\u061F\u06D4\u2014!,.:;?—])/g;

function cleanSpacesBeforePunctuation(s: string): string {
  // 1. Remove spaces immediately before sentence-level punctuation
  s = s.replace(PRE_PUNCT_SPACE, "$1");
  // 2. Remove spaces immediately before AND after newlines (from spoken commands)
  s = s.replace(/ +(\n+)/g, "$1");
  s = s.replace(/(\n+) +/g, "$1");
  // 3. Em-dash: remove spaces on both sides (spoken "dash" implies tight attachment)
  s = s.replace(/ *— */g, "—");
  return s;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Process a raw speech transcript:
 * 1. Apply the appropriate command rules for the given dictation language.
 * 2. Clean up spaces before punctuation marks that were created by substitution.
 * 3. Trim leading/trailing whitespace.
 *
 * Returns the processed string.
 * Empty input returns an empty string.
 * Content that contains no commands is returned unchanged (after space cleanup).
 */
export function processVoiceTranscript(
  raw: string,
  lang: DictationLanguage = "mixed"
): string {
  if (!raw || !raw.trim()) return "";

  const rules: CommandRule[] = [
    ...(lang === "ur" ? URDU_COMMANDS : []),
    ...(lang === "en" ? ENGLISH_COMMANDS : []),
    ...(lang === "mixed" ? [...URDU_COMMANDS, ...ENGLISH_COMMANDS] : []),
  ];

  let result = raw;
  for (const { pattern, replacement } of rules) {
    // Reset lastIndex between applies (regex reuse safety)
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }

  result = cleanSpacesBeforePunctuation(result);
  // Normalize runs of more than two newlines to a maximum of two
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trim();
}

/**
 * Split a processed transcript into segments for TipTap insertion.
 * Returns a list of `{ text, isParagraphBreak }` entries.
 * Paragraph breaks (`\n\n`) produce `isParagraphBreak: true` entries.
 * Line breaks (`\n`) become spaces in the text (TipTap hard-break handling
 * is done at the call site).
 *
 * This function is exported for testability; the caller decides how to
 * map segments to TipTap content nodes.
 */
export interface TranscriptSegment {
  text: string;
  /** True if this entry represents a paragraph boundary (not inline text). */
  isParagraphBreak: boolean;
}

export function splitTranscriptIntoSegments(
  processed: string
): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const parts = processed.split(/(\n\n)/);
  for (const part of parts) {
    if (part === "\n\n") {
      segments.push({ text: "", isParagraphBreak: true });
    } else if (part) {
      // Within a paragraph, \n becomes a plain space (conservative MVP behavior)
      segments.push({ text: part.replace(/\n/g, " "), isParagraphBreak: false });
    }
  }
  return segments.filter(s => s.isParagraphBreak || s.text.trim().length > 0);
}
