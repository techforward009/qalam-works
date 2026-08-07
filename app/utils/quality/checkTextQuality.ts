export interface QualityReport {
  totalIssues: number;
  typography: {
    multipleSpaces: number;
    emptyLines: number;
    longParagraphs: number;
    missingSpaceAfterPunctuation: number;
  };
  punctuation: {
    mixedPunctuation: number;
    wrongQuotes: number;
    duplicatedPunctuation: number;
  };
  textQuality: {
    repeatedWords: number;
    mixedScript: number;
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
  mixedPunctuation: number;
  wrongQuotes: number;
  duplicatedPunctuation: number;
  repeatedWords: number;
  mixedScript: number;
}

function checkUniversal(
  text: string
): Pick<
  PartialCounts,
  "multipleSpaces" | "emptyLines" | "longParagraphs" | "wrongQuotes" | "duplicatedPunctuation" | "missingSpaceAfterPunctuation"
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

  return { multipleSpaces, emptyLines, longParagraphs, wrongQuotes, duplicatedPunctuation, missingSpaceAfterPunctuation };
}

function checkScriptSensitive(text: string): Pick<PartialCounts, "mixedPunctuation" | "repeatedWords" | "mixedScript"> {
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

  return { mixedPunctuation, repeatedWords, mixedScript };
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
    scriptSensitive.mixedPunctuation +
    scriptSensitive.repeatedWords +
    scriptSensitive.mixedScript;

  const badges: string[] = [];
  if (totalIssues === 0) {
    badges.push("✓ Publication Quality Passed");
  } else {
    if (universal.multipleSpaces) badges.push("✓ Spacing Issues Detected");
    if (scriptSensitive.mixedPunctuation) badges.push("✓ Punctuation Issues Detected");
    if (universal.wrongQuotes) badges.push("✓ Quote Formatting Issues");
    if (universal.duplicatedPunctuation) badges.push("✓ Duplicated Punctuation Found");
    if (universal.missingSpaceAfterPunctuation) badges.push("✓ Missing Space After Punctuation");
    if (universal.emptyLines) badges.push("✓ Layout Spacing Issues");
    if (scriptSensitive.repeatedWords) badges.push("✓ Repeated Words Found");
    if (scriptSensitive.mixedScript) badges.push("✓ Mixed Script Detected");
    if (universal.longParagraphs) badges.push("✓ Long Paragraph Warning");
  }

  return {
    totalIssues,
    typography: {
      multipleSpaces: universal.multipleSpaces,
      emptyLines: universal.emptyLines,
      longParagraphs: universal.longParagraphs,
      missingSpaceAfterPunctuation: universal.missingSpaceAfterPunctuation,
    },
    punctuation: {
      mixedPunctuation: scriptSensitive.mixedPunctuation,
      wrongQuotes: universal.wrongQuotes,
      duplicatedPunctuation: universal.duplicatedPunctuation,
    },
    textQuality: {
      repeatedWords: scriptSensitive.repeatedWords,
      mixedScript: scriptSensitive.mixedScript,
    },
    badges,
  };
}
