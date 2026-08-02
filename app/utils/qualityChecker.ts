export interface QualityReport {
  totalIssues: number;

  typography: {
    multipleSpaces: number;
    emptyLines: number;
  };

  punctuation: {
    mixedPunctuation: number;
    wrongQuotes: number;
  };

  textQuality: {
    repeatedWords: number;
  };

  badges: string[];
}

export function checkTextQuality(input: string): QualityReport {
  let multipleSpaces = 0;
  let emptyLines = 0;
  let mixedPunctuation = 0;
  let wrongQuotes = 0;
  let repeatedWords = 0;

  // 1. Multiple spaces
  const spaceMatches = input.match(/\s{2,}/g);
  if (spaceMatches) {
    multipleSpaces = spaceMatches.length;
  }

  // 2. Empty lines
  const emptyLineMatches = input.match(/\n\s*\n/g);
  if (emptyLineMatches) {
    emptyLines = emptyLineMatches.length;
  }

  // 3. Mixed punctuation
  const englishPunctuation = input.match(/[;,?]/g);
  if (englishPunctuation) {
    mixedPunctuation = englishPunctuation.length;
  }

  // 4. Wrong quotation marks
  const quoteMatches = input.match(/["']/g);
  if (quoteMatches) {
    wrongQuotes = quoteMatches.length;
  }

  // 5. Repeated words
  const words = input.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    if (words[i] && words[i] === words[i - 1]) {
      repeatedWords++;
    }
  }

  const totalIssues =
    multipleSpaces +
    emptyLines +
    mixedPunctuation +
    wrongQuotes +
    repeatedWords;

  const badges: string[] = [];

  if (totalIssues === 0) {
    badges.push("✓ Publication Quality Passed");
  } else {
    if (multipleSpaces) badges.push("✓ Spacing Issues Detected");
    if (mixedPunctuation) badges.push("✓ Punctuation Issues Detected");
    if (wrongQuotes) badges.push("✓ Quote Formatting Issues");
    if (emptyLines) badges.push("✓ Layout Spacing Issues");
    if (repeatedWords) badges.push("✓ Repeated Words Found");
  }

  return {
    totalIssues,
    typography: {
      multipleSpaces,
      emptyLines,
    },
    punctuation: {
      mixedPunctuation,
      wrongQuotes,
    },
    textQuality: {
      repeatedWords,
    },
    badges,
  };
}
