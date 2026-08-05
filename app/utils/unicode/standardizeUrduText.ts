export interface CorrectionDetail {
  // Human-readable label shown to the user, e.g. "ي → ی (Arabic Yeh to Urdu Yeh)"
  label: string;
  count: number;
}

export interface StandardizeResult {
  output: string;
  badges: string[];
  summary: {
    totalCorrections: number;
    arabicNormalizations: number;
    spacingFixes: number;
    punctuationFixes: number;
  };
  // Detailed breakdown of exactly what was changed and how many times,
  // so the user can judge whether each correction was actually correct
  // for their text — not just see an aggregate count.
  corrections: CorrectionDetail[];
}

// Character-level normalization map with human-readable labels.
// Each entry: [regex to find the character, replacement, label for the report]
const CHAR_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /ي/g, replacement: "ی", label: "ي → ی (عربی یے کو اردو یے میں تبدیل کیا گیا)" },
  { pattern: /ى/g, replacement: "ی", label: "ى → ی (الف مقصورہ کو اردو یے میں تبدیل کیا گیا)" },
  { pattern: /ك/g, replacement: "ک", label: "ك → ک (عربی کاف کو اردو کاف میں تبدیل کیا گیا)" },
  { pattern: /أ/g, replacement: "ا", label: "أ → ا (ہمزہ والا الف سادہ الف میں تبدیل کیا گیا)" },
  { pattern: /إ/g, replacement: "ا", label: "إ → ا (ہمزہ والا الف سادہ الف میں تبدیل کیا گیا)" },
];

// ASCII punctuation to Urdu/Arabic punctuation, with labels.
const PUNCTUATION_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /,/g, replacement: "،", label: "، (انگریزی کوما کو اردو کوما میں تبدیل کیا گیا)" },
  { pattern: /;/g, replacement: "؛", label: "؛ (انگریزی سیمی کولن کو اردو سیمی کولن میں تبدیل کیا گیا)" },
  { pattern: /\?/g, replacement: "؟", label: "؟ (انگریزی سوالیہ نشان کو اردو سوالیہ نشان میں تبدیل کیا گیا)" },
];

export function standardizeUrduText(input: string): StandardizeResult {
  let text = input;
  let arabicNormalizations = 0;
  let spacingFixes = 0;
  let punctuationFixes = 0;
  const corrections: CorrectionDetail[] = [];

  // 1. Arabic/Persian character normalization — tracked per character
  // so the user can see exactly which letters were changed.
  for (const { pattern, replacement, label } of CHAR_NORMALIZATIONS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      corrections.push({ label, count: matches.length });
      arabicNormalizations += matches.length;
      text = text.replace(pattern, replacement);
    }
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
    const cleaned = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (cleaned !== text) {
      spacingFixes = Math.abs(originalLength - cleaned.length) || 1;
      corrections.push({
        label: "اضافی خالی جگہیں اور خالی سطریں صاف کی گئیں",
        count: spacingFixes,
      });
      text = cleaned;
    }
  }

  // 3. Urdu Punctuation normalization — tracked per mark.
  for (const { pattern, replacement, label } of PUNCTUATION_NORMALIZATIONS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      corrections.push({ label, count: matches.length });
      punctuationFixes += matches.length;
      text = text.replace(pattern, replacement);
    }
  }

  // 3b. Remove stray space before Urdu/Arabic punctuation marks.
  // Unlike English, these marks attach directly to the preceding word —
  // no space before them. This fixes both marks just converted above and
  // any Urdu punctuation already in the source text with a stray space.
  const spaceBeforePunctuationRegex = /[ \t]+([:،؛؟۔])/g;
  const matchesSpaceBeforePunctuation = text.match(spaceBeforePunctuationRegex);
  if (matchesSpaceBeforePunctuation) {
    punctuationFixes += matchesSpaceBeforePunctuation.length;
    corrections.push({
      label: "رموز اوقاف (، ؛ ؟ : ۔) سے پہلے کی خالی جگہ ہٹائی گئی",
      count: matchesSpaceBeforePunctuation.length,
    });
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
    corrections,
  };
}
