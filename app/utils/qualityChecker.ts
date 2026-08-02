export interface QualityReport {
  totalIssues: number;
  typography: {
    multipleSpaces: number;
    emptyLines: number;
    longParagraphs: number;
  };
  punctuation: {
    mixedPunctuation: number;
    wrongQuotes: number;
  };
  textQuality: {
    repeatedWords: number;
    mixedScript: number;
  };
  badges: string[];
}

export function checkTextQuality(input: string): QualityReport {
  let multipleSpaces = 0;
  let emptyLines = 0;
  let mixedPunctuation = 0;
  let wrongQuotes = 0;
  let repeatedWords = 0;
  let mixedScript = 0;
  let longParagraphs = 0;

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

  // 3. Mixed punctuation (Checking ASCII comma, semicolon, question mark when mixed with Arabic text)
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

  // 6. Mixed Script Detection (Latin alphabets inside Arabic script)
  const latinMatches = input.match(/[a-zA-Z]+/g);
  if (latinMatches) {
    mixedScript = latinMatches.length;
  }

  // 7. Line Length Warning (Paragraphs exceeding 250 characters)
  const paragraphs = input.split(/\n+/);
  paragraphs.forEach((p) => {
    if (p.trim().length > 250) {
      longParagraphs++;
    }
  });

  const totalIssues =
    multipleSpaces +
    emptyLines +
    mixedPunctuation +
    wrongQuotes +
    repeatedWords +
    mixedScript +
    longParagraphs;

  const badges: string[] = [];

  if (totalIssues === 0) {
    badges.push("✓ Publication Quality Passed");
  } else {
    if (multipleSpaces) badges.push("✓ Spacing Issues Detected");
    if (mixedPunctuation) badges.push("✓ Punctuation Issues Detected");
    if (wrongQuotes) badges.push("✓ Quote Formatting Issues");
    if (emptyLines) badges.push("✓ Layout Spacing Issues");
    if (repeatedWords) badges.push("✓ Repeated Words Found");
    if (mixedScript) badges.push("✓ Mixed Script Detected");
    if (longParagraphs) badges.push("✓ Long Paragraph Warning");
  }

  return {
    totalIssues,
    typography: {
      multipleSpaces,
      emptyLines,
      longParagraphs,
    },
    punctuation: {
      mixedPunctuation,
      wrongQuotes,
    },
    textQuality: {
      repeatedWords,
      mixedScript,
    },
    badges,
  };
}
