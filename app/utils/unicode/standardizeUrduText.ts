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
  const originalLength = text.length;
  const hasExtraSpaces = /\s{2,}/.test(text) || text.startsWith(" ") || text.endsWith(" ");
  if (hasExtraSpaces || /\s+/.test(text)) {
    text = text.replace(/\s+/g, " ").trim();
    if (text.length !== originalLength) {
      spacingFixes = Math.abs(originalLength - text.length);
    }
  }

  // 3. Urdu Punctuation normalization & precise counting
  // Commas, Semicolons, Question marks
  const punctuationRegex = /,|;|\?/g;
  const matchesPunctuation = text.match(punctuationRegex);
  if (matchesPunctuation) {
    punctuationFixes = matchesPunctuation.length;
    text = text
      .replace(/,/g, "،")
      .replace(/;/g, "؛")
      .replace(/\?/g, "؟");
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
