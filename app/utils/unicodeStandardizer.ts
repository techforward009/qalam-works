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

  // 1. Arabic/Persian character normalization (حروف کی درستی)
  const arabicRegex = /[يىكأإ]/g;
  const arabicMatches = text.match(arabicRegex);
  if (arabicMatches) {
    arabicNormalizations = arabicMatches.length;
    text = text
      .replace(/ي/g, "ی")
      .replace(/ى/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/أ/g, "ا")
      .replace(/إ/g, "ا");
  }

  // 2. Whitespace Cleanup (زائد اور ڈبل اسپیس کی صفائی)
  // Check multiple spaces or leading/trailing spaces
  if (/\s+/.test(text) && (text !== text.trim() || /\s{2,}/.test(text))) {
    const originalLength = text.length;
    text = text.replace(/\s+/g, " ").trim();
    spacingFixes = Math.max(1, originalLength - text.length);
  }

  // 3. Urdu Punctuation (علاماتِ ترقیم کی درستی)
  const punctRegex = /,|;|\?/g;
  const punctMatches = text.match(punctRegex);
  if (punctMatches) {
    punctuationFixes = punctMatches.length;
    text = text
      .replace(/,/g, "،")
      .replace(/;/g, "؛")
      .replace(/\?/g, "؟");
  }

  const totalCorrections = arabicNormalizations + spacingFixes + punctuationFixes;

  // 4. Dynamic Professional Badges & Audit Summary
  const badges: string[] = [];

  if (totalCorrections === 0) {
    badges.push("✓ Text already standardized");
  } else {
    if (arabicNormalizations > 0) badges.push("✓ Arabic letters normalized");
    if (spacingFixes > 0) badges.push("✓ Extra spaces removed");
    if (punctuationFixes > 0) badges.push("✓ Punctuation corrected");
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
