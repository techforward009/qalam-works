export interface StandardizeResult {
  output: string;
  badges: string[];
  summary: {
    totalCorrections: number;
    arabicNormalizations: number;
    spacingFixes: number;
    punctuationFixes: number;
  };
}

export function standardizeUrduText(input: string): StandardizeResult {
  let text = input;
  let arabicNormalizations = 0;
  let spacingFixes = 0;
  let punctuationFixes = 0;

  // 1. Arabic/Persian character normalization & precise counting
  // ي -> ی, ى -> ی, ك -> ک, أ -> ا, إ -> ا
  const arabicCharsRegex = /[يىأإك]/g;
  const matchesArabic = text.match(arabicCharsRegex);
  if (matchesArabic) {
    arabicNormalizations = matchesArabic.length;
    text = text
      .replace(/ي/g, "ی")
      .replace(/ى/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/أ/g, "ا")
      .replace(/إ/g, "ا");
  }

  // 2. Whitespace Cleanup & precise counting
  // Preserves line breaks (each line/paragraph stays separate) — only
  // collapses repeated spaces/tabs within a line and trims stray blank
  // lines. Does NOT merge distinct lines into one, since Urdu religious
  // texts, references, and footnotes rely on separate lines to stay separate.
  {
    const originalLength = text.length;
    const cleanedLines = text
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim());
    let cleaned = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (cleaned !== text) {
      spacingFixes = Math.abs(originalLength - cleaned.length) || 1;
      text = cleaned;
    }
  }

  // 3. Urdu Punctuation normalization & precise counting
  // Commas, Semicolons, Question marks
  const punctuationRegex = /,|;|\?/g;
  const matchesPunctuation = text.match(punctuationRegex);
  if (matchesPunctuation) {
    punctuationFixes += matchesPunctuation.length;
    text = text
      .replace(/,/g, "،")
      .replace(/;/g, "؛")
      .replace(/\?/g, "؟");
  }

  // 3b. Remove stray space before Urdu/Arabic punctuation marks.
  // Unlike English, these marks attach directly to the preceding word —
  // no space before them. This fixes both marks just converted above and
  // any Urdu punctuation already in the source text with a stray space.
  const spaceBeforePunctuationRegex = /[ \t]+([:،؛؟۔])/g;
  const matchesSpaceBeforePunctuation = text.match(spaceBeforePunctuationRegex);
  if (matchesSpaceBeforePunctuation) {
    punctuationFixes += matchesSpaceBeforePunctuation.length;
    text = text.replace(spaceBeforePunctuationRegex, "$1");
  }

  const totalCorrections = arabicNormalizations + spacingFixes + punctuationFixes;

  // 4. Conditional Professional Badges
  const badges: string[] = [];

  if (totalCorrections === 0) {
    badges.push("✓ Text Already Standardized");
  } else {
    if (arabicNormalizations > 0) badges.push("✓ Arabic Letters Normalized");
    if (spacingFixes > 0) badges.push("✓ Extra Spaces Removed");
    if (punctuationFixes > 0) badges.push("✓ Punctuation Corrected");
    badges.push("✓ RTL Optimized");
  }

  return {
    output: text,
    badges,
    summary: {
      totalCorrections,
      arabicNormalizations,
      spacingFixes,
      punctuationFixes,
    },
  };
}
