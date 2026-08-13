import {
  PRESERVE_MARKER_REGEX,
  MULTIPLE_SPACES_REGEX,
  STRAIGHT_QUOTES_REGEX,
  CURLY_QUOTE_OPEN_REGEX,
  CURLY_QUOTE_CLOSE_REGEX,
  DUPLICATED_PUNCTUATION_REGEX,
  MISSING_SPACE_AFTER_PUNCTUATION_REGEX,
  SPACE_BEFORE_PUNCTUATION_REGEX,
  TATWEEL_REGEX,
  ARABIC_FORM_LETTERS_REGEX,
  LATIN_LETTERS_REGEX,
  ASCII_PUNCTUATION_REGEX,
} from "./sharedTextPatterns";
import type { ProcessingLanguage, ResolvedLanguage } from "../processing/types";
import { resolveProcessingLanguage } from "../processing/detectLanguage";

export interface QualityReport {
  totalIssues: number;
  typography: {
    multipleSpaces: number;
    emptyLines: number;
    longParagraphs: number;
    missingSpaceAfterPunctuation: number;
    // Advanced Typography Analyzer (2026-08-09):
    spaceBeforePunctuation: number;
    tatweelCount: number;
  };
  punctuation: {
    mixedPunctuation: number;
    wrongQuotes: number;
    duplicatedPunctuation: number;
    // Advanced Typography Analyzer (2026-08-09):
    inconsistentPunctuationStyle: boolean;
  };
  textQuality: {
    repeatedWords: number;
    mixedScript: number;
    mixedUrduArabicForms: number;
  };
  badges: string[];
}

interface PartialCounts {
  multipleSpaces: number;
  emptyLines: number;
  longParagraphs: number;
  missingSpaceAfterPunctuation: number;
  spaceBeforePunctuation: number;
  tatweelCount: number;
  mixedPunctuation: number;
  wrongQuotes: number;
  duplicatedPunctuation: number;
  inconsistentPunctuationStyle: boolean;
  repeatedWords: number;
  mixedScript: number;
  mixedUrduArabicForms: number;
}

function checkUniversal(
  text: string
): Pick<
  PartialCounts,
  | "multipleSpaces"
  | "emptyLines"
  | "longParagraphs"
  | "wrongQuotes"
  | "duplicatedPunctuation"
  | "missingSpaceAfterPunctuation"
  | "spaceBeforePunctuation"
  | "tatweelCount"
  | "inconsistentPunctuationStyle"
> {
  // Multiple spaces — space/tab runs only, NOT newlines (newlines are
  // "Empty Lines", a separate issue; counting both from the same runs
  // double-reported the same whitespace before).
  const spaceMatches = text.match(MULTIPLE_SPACES_REGEX);
  const multipleSpaces = spaceMatches ? spaceMatches.length : 0;

  // Empty lines — a blank line (possibly with stray whitespace) between
  // two lines of content.
  const emptyLineMatches = text.match(/\n[ \t]*\n/g);
  const emptyLines = emptyLineMatches ? emptyLineMatches.length : 0;

  // Long paragraphs — over 250 characters, checked per paragraph (split on
  // blank lines) rather than per single line, so a multi-line paragraph
  // isn't under-counted.
  let longParagraphs = 0;
  const paragraphs = text.split(/\n\s*\n/);
  paragraphs.forEach((p) => {
    if (p.replace(/\s+/g, " ").trim().length > 250) {
      longParagraphs++;
    }
  });

  // Straight/ASCII quotation marks — typographically these should be
  // curly quotes in published text, regardless of script.
  const quoteMatches = text.match(STRAIGHT_QUOTES_REGEX);
  const straightQuotes = quoteMatches ? quoteMatches.length : 0;

  // Unmatched curly double quotes — e.g. a closing " with no opening "
  // anywhere before it (found 2026-08-07: a document missing its opening
  // quote read as "0 punctuation issues", because straight-quote counting
  // alone doesn't see curly quotes at all, correct or not — it was never
  // checking whether they're actually paired). Deliberately limited to the
  // double curly pair only: the single curly pair (' ') is also the
  // ordinary typographic apostrophe (e.g. "don't"), so counting open/close
  // imbalance there would flag normal apostrophe use as a false positive.
  const openCurly = (text.match(CURLY_QUOTE_OPEN_REGEX) || []).length;
  const closeCurly = (text.match(CURLY_QUOTE_CLOSE_REGEX) || []).length;
  const unmatchedCurlyQuotes = Math.abs(openCurly - closeCurly);

  const wrongQuotes = straightQuotes + unmatchedCurlyQuotes;

  // Any single punctuation mark repeated 2+ times in a row — "؟؟", "!!",
  // "۔۔", "،،", ".." — almost always an accidental double keystroke, in any
  // script. Deliberately not script-sensitive (unlike mixedPunctuation
  // below) since a doubled mark is a mistake regardless of which script's
  // punctuation it is. Quote characters are intentionally excluded here —
  // they already have their own, more precise unmatched-pair check above;
  // counting them again under a generic "duplicated" rule would double-flag
  // the same underlying defect under two different names.
  const duplicatedMatches = text.match(DUPLICATED_PUNCTUATION_REGEX);
  const duplicatedPunctuation = duplicatedMatches ? duplicatedMatches.length : 0;

  // A closing bracket/paren/colon, or terminal punctuation (comma/
  // exclamation/question mark, ASCII or Urdu-Arabic form) immediately
  // followed by a letter or digit with no space (found 2026-08-07:
  // "(المتوفی:179ھ)نے" — missing space after both ":" and ")"; extended
  // 2026-08-09 per Batch 1 to also cover "لفظ,اگلا"/"لفظ؟اگلا"/
  // "لفظ!اگلا"-style cases; extended again 2026-08-09 Maintenance Batch
  // to exclude a comma between two digits — "1,000"/"10,000" is a valid
  // thousands separator, not a missing space).
  const missingSpaceMatches = text.match(MISSING_SPACE_AFTER_PUNCTUATION_REGEX);
  const missingSpaceAfterPunctuation = missingSpaceMatches ? missingSpaceMatches.length : 0;

  // Advanced Typography Analyzer (2026-08-09) — a space immediately
  // BEFORE a terminal punctuation mark ("لفظ ،" instead of "لفظ،"). Urdu/
  // Arabic convention (like English) attaches terminal punctuation
  // directly to the preceding word with no space, so a preceding space is
  // a formatting defect, not a style choice.
  const spaceBeforeMatches = text.match(SPACE_BEFORE_PUNCTUATION_REGEX);
  const spaceBeforePunctuation = spaceBeforeMatches ? spaceBeforeMatches.length : 0;

  // Advanced Typography Analyzer (2026-08-09) — tatweel/kashida (ـ,
  // U+0640), a decorative Arabic elongation character used for visual
  // justification in calligraphy/typesetting. In ordinary digital prose
  // it's almost always an accidental artifact from copy-pasting
  // pre-formatted Arabic text, not an intentional typographic choice —
  // flagged for review, not auto-removed (that's a correction, not
  // detection, and out of scope here).
  const tatweelMatches = text.match(TATWEEL_REGEX);
  const tatweelCount = tatweelMatches ? tatweelMatches.length : 0;

  // Advanced Typography Analyzer (2026-08-09) — flags when a document
  // uses BOTH the ASCII and the Urdu/Arabic form of the same punctuation
  // mark somewhere in it (e.g. both "," and "،" present) — a genuine
  // style-consistency signal distinct from mixedPunctuation below (which
  // just counts ASCII occurrences regardless of whether the Arabic form
  // is ALSO present elsewhere). A document that consistently uses one
  // convention throughout is not flagged, even if that convention is
  // ASCII throughout.
  const hasAsciiComma = /,/.test(text);
  const hasArabicComma = /،/.test(text);
  const hasAsciiSemicolon = /;/.test(text);
  const hasArabicSemicolon = /؛/.test(text);
  const hasAsciiQuestion = /\?/.test(text);
  const hasArabicQuestion = /؟/.test(text);
  const inconsistentPunctuationStyle =
    (hasAsciiComma && hasArabicComma) ||
    (hasAsciiSemicolon && hasArabicSemicolon) ||
    (hasAsciiQuestion && hasArabicQuestion);

  return {
    multipleSpaces,
    emptyLines,
    longParagraphs,
    wrongQuotes,
    duplicatedPunctuation,
    missingSpaceAfterPunctuation,
    spaceBeforePunctuation,
    tatweelCount,
    inconsistentPunctuationStyle,
  };
}

function checkScriptSensitive(
  text: string,
  mode: ResolvedLanguage
): Pick<PartialCounts, "mixedPunctuation" | "repeatedWords" | "mixedScript" | "mixedUrduArabicForms"> {
  const hasArabicScript = /[\u0600-\u06FF]/.test(text);

  // ASCII punctuation mixed into Arabic-script text only (not pure English).
  let mixedPunctuation = 0;
  if (mode === "ur" && hasArabicScript) {
    const englishPunctuation = text.match(ASCII_PUNCTUATION_REGEX);
    mixedPunctuation = englishPunctuation ? englishPunctuation.length : 0;
  }

  let repeatedWords = 0;
  const words = text.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    if (words[i] && words[i] === words[i - 1]) {
      repeatedWords++;
    }
  }

  // mixedScript: Latin runs ONLY when Arabic-script is also present.
  // Pure English must not be flagged as "mixed script".
  // In English mode, never flag. In Arabic mode, Latin is informational (still counted for mixed docs).
  const latinMatches = text.match(LATIN_LETTERS_REGEX);
  let mixedScript = 0;
  if (mode !== "en" && hasArabicScript && latinMatches) {
    mixedScript = latinMatches.length;
  }

  // Urdu/Arabic form mismatch only meaningful in Urdu mode.
  let mixedUrduArabicForms = 0;
  if (mode === "ur") {
    const arabicFormMatches = text.match(ARABIC_FORM_LETTERS_REGEX);
    mixedUrduArabicForms = arabicFormMatches ? arabicFormMatches.length : 0;
  }

  return { mixedPunctuation, repeatedWords, mixedScript, mixedUrduArabicForms };
}

export function checkTextQuality(
  input: string,
  mode: ProcessingLanguage = "ur"
): QualityReport {
  const resolved = resolveProcessingLanguage(mode, input);
  const universal = checkUniversal(input);

  const textWithoutProtected = input.replace(PRESERVE_MARKER_REGEX, " ");
  const scriptSensitive = checkScriptSensitive(textWithoutProtected, resolved);

  const totalIssues =
    universal.multipleSpaces +
    universal.emptyLines +
    universal.longParagraphs +
    universal.wrongQuotes +
    universal.duplicatedPunctuation +
    universal.missingSpaceAfterPunctuation +
    universal.spaceBeforePunctuation +
    universal.tatweelCount +
    (universal.inconsistentPunctuationStyle ? 1 : 0) +
    scriptSensitive.mixedPunctuation +
    scriptSensitive.repeatedWords +
    scriptSensitive.mixedScript +
    scriptSensitive.mixedUrduArabicForms;

  const badges: string[] = [];
  if (totalIssues === 0) {
    badges.push("✓ Publication Quality Passed");
  } else {
    if (universal.multipleSpaces) badges.push("✓ Spacing Issues Detected");
    if (scriptSensitive.mixedPunctuation) badges.push("✓ Punctuation Issues Detected");
    if (universal.wrongQuotes) badges.push("✓ Quote Formatting Issues");
    if (universal.duplicatedPunctuation) badges.push("✓ Duplicated Punctuation Found");
    if (universal.missingSpaceAfterPunctuation) badges.push("✓ Missing Space After Punctuation");
    if (universal.spaceBeforePunctuation) badges.push("✓ Space Before Punctuation");
    if (universal.tatweelCount) badges.push("✓ Tatweel (Kashida) Characters Found");
    if (universal.inconsistentPunctuationStyle) badges.push("✓ Inconsistent Punctuation Style");
    if (universal.emptyLines) badges.push("✓ Layout Spacing Issues");
    if (scriptSensitive.repeatedWords) badges.push("✓ Repeated Words Found");
    if (scriptSensitive.mixedScript) badges.push("✓ Mixed Script Detected");
    if (scriptSensitive.mixedUrduArabicForms) badges.push("✓ Mixed Urdu/Arabic Character Forms");
    if (universal.longParagraphs) badges.push("✓ Long Paragraph Warning");
  }

  return {
    totalIssues,
    typography: {
      multipleSpaces: universal.multipleSpaces,
      emptyLines: universal.emptyLines,
      longParagraphs: universal.longParagraphs,
      missingSpaceAfterPunctuation: universal.missingSpaceAfterPunctuation,
      spaceBeforePunctuation: universal.spaceBeforePunctuation,
      tatweelCount: universal.tatweelCount,
    },
    punctuation: {
      mixedPunctuation: scriptSensitive.mixedPunctuation,
      wrongQuotes: universal.wrongQuotes,
      duplicatedPunctuation: universal.duplicatedPunctuation,
      inconsistentPunctuationStyle: universal.inconsistentPunctuationStyle,
    },
    textQuality: {
      repeatedWords: scriptSensitive.repeatedWords,
      mixedScript: scriptSensitive.mixedScript,
      mixedUrduArabicForms: scriptSensitive.mixedUrduArabicForms,
    },
    badges,
  };
}
