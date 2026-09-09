import {
  MULTIPLE_SPACES_REGEX,
  STRAIGHT_QUOTES_REGEX,
  CURLY_QUOTE_OPEN_REGEX,
  CURLY_QUOTE_CLOSE_REGEX,
  DUPLICATED_PUNCTUATION_REGEX,
  MISSING_SPACE_AFTER_PUNCTUATION_REGEX,
  SPACE_BEFORE_PUNCTUATION_REGEX,
  TATWEEL_REGEX,
  ARABIC_FORM_LETTERS_REGEX,
  arabicContextText,
  hasInconsistentPunctuationStyle,
  splitParagraphs,
} from "./sharedTextPatterns";
import { analyzeDocumentRuns, countLatinIntrusions } from "./analyzeLanguageRuns";
import { maskProtectedTokens } from "./protectedTokens";
import { analyzeContextualPunctuation, countContextualPunctuationIssues } from "./analyzeContextualPunctuation";
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
  text: string,
  masked: string,
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
  const quoteMatches = masked.match(STRAIGHT_QUOTES_REGEX);
  const straightQuotes = quoteMatches ? quoteMatches.length : 0;

  const openCurly = (masked.match(CURLY_QUOTE_OPEN_REGEX) || []).length;
  const closeCurly = (masked.match(CURLY_QUOTE_CLOSE_REGEX) || []).length;
  const unmatchedCurlyQuotes = Math.abs(openCurly - closeCurly);

  const wrongQuotes = straightQuotes + unmatchedCurlyQuotes;

  const duplicatedMatches = masked.match(DUPLICATED_PUNCTUATION_REGEX);
  const duplicatedPunctuation = duplicatedMatches ? duplicatedMatches.length : 0;

  const missingSpaceMatches = masked.match(MISSING_SPACE_AFTER_PUNCTUATION_REGEX);
  const missingSpaceAfterPunctuation = missingSpaceMatches ? missingSpaceMatches.length : 0;

  const spaceBeforeMatches = masked.match(SPACE_BEFORE_PUNCTUATION_REGEX);
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

  return {
    multipleSpaces,
    emptyLines,
    longParagraphs,
    wrongQuotes,
    duplicatedPunctuation,
    missingSpaceAfterPunctuation,
    spaceBeforePunctuation,
    tatweelCount,
  };
}

function checkScriptSensitive(
  text: string,
  masked: string,
  mode: ResolvedLanguage
): Pick<PartialCounts, "mixedPunctuation" | "repeatedWords" | "mixedScript" | "mixedUrduArabicForms" | "inconsistentPunctuationStyle"> {
  let mixedPunctuation = 0;
  let mixedScript = 0;
  if (mode === "ur" || mode === "ar") {
    mixedPunctuation = countContextualPunctuationIssues(
      analyzeContextualPunctuation(analyzeDocumentRuns(splitParagraphs(text)), mode),
    );
    mixedScript = countLatinIntrusions(text);
  }

  let repeatedWords = 0;
  const words = text.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    if (words[i] && words[i] === words[i - 1]) {
      repeatedWords++;
    }
  }

  let mixedUrduArabicForms = 0;
  if (mode === "ur") {
    const arabicFormMatches = masked.match(ARABIC_FORM_LETTERS_REGEX);
    mixedUrduArabicForms = arabicFormMatches ? arabicFormMatches.length : 0;
  }

  const inconsistentPunctuationStyle = hasInconsistentPunctuationStyle(arabicContextText(masked));

  return { mixedPunctuation, repeatedWords, mixedScript, mixedUrduArabicForms, inconsistentPunctuationStyle };
}

export function checkTextQuality(
  input: string,
  mode: ProcessingLanguage | ResolvedLanguage = "ur"
): QualityReport {
  // Accept either explicit ProcessingLanguage or an already-resolved mode
  // (e.g. "rtl-neutral" from processText).
  const resolved: ResolvedLanguage =
    mode === "ur" || mode === "en" || mode === "ar" || mode === "rtl-neutral"
      ? mode
      : resolveProcessingLanguage(mode, input);
  const masked = maskProtectedTokens(input);
  const universal = checkUniversal(input, masked);
  const scriptSensitive = checkScriptSensitive(input, masked, resolved);

  const totalIssues =
    universal.multipleSpaces +
    universal.emptyLines +
    universal.longParagraphs +
    universal.wrongQuotes +
    universal.duplicatedPunctuation +
    universal.missingSpaceAfterPunctuation +
    universal.spaceBeforePunctuation +
    universal.tatweelCount +
    (scriptSensitive.inconsistentPunctuationStyle ? 1 : 0) +
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
    if (scriptSensitive.inconsistentPunctuationStyle) badges.push("✓ Inconsistent Punctuation Style");
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
      inconsistentPunctuationStyle: scriptSensitive.inconsistentPunctuationStyle,
    },
    textQuality: {
      repeatedWords: scriptSensitive.repeatedWords,
      mixedScript: scriptSensitive.mixedScript,
      mixedUrduArabicForms: scriptSensitive.mixedUrduArabicForms,
    },
    badges,
  };
}
