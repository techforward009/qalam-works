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

// Same {{ }} preserve-marker convention as the Unicode Standardizer.
// Content inside is treated as a classical Arabic quotation — checks that
// would false-positive on legitimate Arabic patterns (rhetorical word
// repetition, Arabic punctuation, non-Latin script by definition) are
// skipped for that content specifically.
const PRESERVE_MARKER_REGEX = /\{\{([\s\S]*?)\}\}/g;

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
  const spaceMatches = text.match(/[ \t]{2,}/g);
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
  const quoteMatches = text.match(/["']/g);
  const straightQuotes = quoteMatches ? quoteMatches.length : 0;

  // Unmatched curly double quotes — e.g. a closing " with no opening "
  // anywhere before it (found 2026-08-07: a document missing its opening
  // quote read as "0 punctuation issues", because straight-quote counting
  // alone doesn't see curly quotes at all, correct or not — it was never
  // checking whether they're actually paired). Deliberately limited to the
  // double curly pair only: the single curly pair (' ') is also the
  // ordinary typographic apostrophe (e.g. "don't"), so counting open/close
  // imbalance there would flag normal apostrophe use as a false positive.
  const openCurly = (text.match(/\u201C/g) || []).length;
  const closeCurly = (text.match(/\u201D/g) || []).length;
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
  const duplicatedMatches = text.match(/([.,!?;:،؛؟۔])\1+/g);
  const duplicatedPunctuation = duplicatedMatches ? duplicatedMatches.length : 0;

  // A closing bracket/paren or colon immediately followed by a letter or
  // digit with no space (found 2026-08-07: "(المتوفی:179ھ)نے" — missing
  // space both after the colon before "179" and after ")" before "نے").
  // Limited to ) ] : specifically (not { } or [ ) to avoid any interaction
  // with the {{ }} preserve-marker syntax elsewhere in the codebase.
  const missingSpaceMatches = text.match(/[)\]:][A-Za-z0-9\u0600-\u06FF]/g);
  const missingSpaceAfterPunctuation = missingSpaceMatches ? missingSpaceMatches.length : 0;

  // Advanced Typography Analyzer (2026-08-09) — a space immediately
  // BEFORE a terminal punctuation mark ("لفظ ،" instead of "لفظ،"). Urdu/
  // Arabic convention (like English) attaches terminal punctuation
  // directly to the preceding word with no space, so a preceding space is
  // a formatting defect, not a style choice. Limited to the same
  // comma/semicolon/question/full-stop marks already covered by the
  // duplicated-punctuation check above, in both ASCII and Urdu/Arabic
  // form, for the same reasons (colon/brackets excluded to avoid
  // interaction with other conventions elsewhere in the codebase).
  const spaceBeforeMatches = text.match(/ [.,!?;:،؛؟۔]/g);
  const spaceBeforePunctuation = spaceBeforeMatches ? spaceBeforeMatches.length : 0;

  // Advanced Typography Analyzer (2026-08-09) — tatweel/kashida (ـ,
  // U+0640), a decorative Arabic elongation character used for visual
  // justification in calligraphy/typesetting. In ordinary digital prose
  // it's almost always an accidental artifact from copy-pasting
  // pre-formatted Arabic text, not an intentional typographic choice —
  // flagged for review, not auto-removed (that's a correction, not
  // detection, and out of scope here).
  const tatweelMatches = text.match(/\u0640/g);
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

function checkScriptSensitive(text: string): Pick<PartialCounts, "mixedPunctuation" | "repeatedWords" | "mixedScript" | "mixedUrduArabicForms"> {
  // ASCII comma/semicolon/question mark mixed into Urdu/Arabic text.
  const englishPunctuation = text.match(/[;,?]/g);
  const mixedPunctuation = englishPunctuation ? englishPunctuation.length : 0;

  // Repeated adjacent words — often an accidental typo, but can be
  // intentional rhetorical repetition in genuine Arabic quotations (which
  // is exactly why this check is skipped inside {{ }} markers).
  let repeatedWords = 0;
  const words = text.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    if (words[i] && words[i] === words[i - 1]) {
      repeatedWords++;
    }
  }

  // Latin letters inside Arabic-script text — often a real typo, but can
  // be an intentional abbreviation, citation, or loanword.
  const latinMatches = text.match(/[a-zA-Z]+/g);
  const mixedScript = latinMatches ? latinMatches.length : 0;

  // Arabic-form letters (ي ى ك أ إ) appearing in what should be Urdu
  // prose — the exact same five characters app/utils/unicode/
  // standardizeUrduText.ts's CHAR_NORMALIZATIONS already corrects (ي→ی,
  // ى→ی, ك→ک, أ→ا, إ→ا). This is detection only (no correction here);
  // reuses that established mapping rather than inventing a new one, so
  // "mixed Urdu/Arabic characters" means the same thing everywhere in
  // the app. Skipped inside {{ }} markers for the same reason
  // standardizeUrduText.ts skips them there — protected classical Arabic
  // quotations correctly use these forms.
  const arabicFormMatches = text.match(/[\u064A\u0649\u0643\u0623\u0625]/g);
  const mixedUrduArabicForms = arabicFormMatches ? arabicFormMatches.length : 0;

  return { mixedPunctuation, repeatedWords, mixedScript, mixedUrduArabicForms };
}

export function checkTextQuality(input: string): QualityReport {
  // Split into protected ({{ }}) and normal segments. Universal checks run
  // on the FULL original text (so line/paragraph structure across
  // boundaries stays correct). Script-sensitive checks run only on the
  // text with {{ }} content removed, then again on each {{ }} segment
  // individually is skipped entirely — protected content is exempt from
  // these three checks by design.
  const universal = checkUniversal(input);

  const textWithoutProtected = input.replace(PRESERVE_MARKER_REGEX, " ");
  const scriptSensitive = checkScriptSensitive(textWithoutProtected);

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
