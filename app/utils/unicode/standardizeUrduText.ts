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
// Only applied OUTSIDE {{ }}-protected segments, since these letters are
// correct as-is in classical Arabic (hadith, ayat) and should not be
// rewritten to Urdu forms.
const CHAR_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /ي/g, replacement: "ی", label: "ي → ی (عربی یے کو اردو یے میں تبدیل کیا گیا)" },
  { pattern: /ى/g, replacement: "ی", label: "ى → ی (الف مقصورہ کو اردو یے میں تبدیل کیا گیا)" },
  { pattern: /ك/g, replacement: "ک", label: "ك → ک (عربی کاف کو اردو کاف میں تبدیل کیا گیا)" },
  { pattern: /أ/g, replacement: "ا", label: "أ → ا (ہمزہ والا الف سادہ الف میں تبدیل کیا گیا)" },
  { pattern: /إ/g, replacement: "ا", label: "إ → ا (ہمزہ والا الف سادہ الف میں تبدیل کیا گیا)" },
];

// ASCII punctuation to Urdu/Arabic punctuation, with labels.
// Applied BOTH inside and outside {{ }}-protected segments, since correct
// punctuation spacing/style applies to Arabic text just as much as Urdu.
const PUNCTUATION_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /,/g, replacement: "،", label: "، (انگریزی کوما کو اردو کوما میں تبدیل کیا گیا)" },
  { pattern: /;/g, replacement: "؛", label: "؛ (انگریزی سیمی کولن کو اردو سیمی کولن میں تبدیل کیا گیا)" },
  { pattern: /\?/g, replacement: "؟", label: "؟ (انگریزی سوالیہ نشان کو اردو سوالیہ نشان میں تبدیل کیا گیا)" },
];

const SPACE_BEFORE_PUNCTUATION_REGEX = /[ \t]+([:،؛؟۔])/g;

// Marker regex: {{ ... }} — content inside gets punctuation/spacing cleanup
// but NOT character normalization. Used to protect quoted classical Arabic
// text from being rewritten into Urdu letter forms.
const PRESERVE_MARKER_REGEX = /\{\{([\s\S]*?)\}\}/g;
const PLACEHOLDER_PREFIX = "\u0000PRESERVED";
const PLACEHOLDER_SUFFIX = "\u0000";

/**
 * Runs whitespace cleanup + punctuation normalization on a piece of text.
 * Used for both the main (Urdu) text and the content inside {{ }} markers,
 * since correct punctuation spacing applies to Arabic quotations too.
 */
function cleanSpacingAndPunctuation(
  input: string,
  corrections: Map<string, number>
): { text: string; spacingFixes: number; punctuationFixes: number } {
  let text = input;
  let spacingFixes = 0;
  let punctuationFixes = 0;

  // Whitespace cleanup — preserves line breaks, only collapses repeated
  // spaces/tabs within a line and trims stray blank lines.
  {
    const originalLength = text.length;
    const cleanedLines = text
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim());
    const cleaned = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (cleaned !== text) {
      const fix = Math.abs(originalLength - cleaned.length) || 1;
      spacingFixes += fix;
      corrections.set(
        "اضافی خالی جگہیں اور خالی سطریں صاف کی گئیں",
        (corrections.get("اضافی خالی جگہیں اور خالی سطریں صاف کی گئیں") || 0) + fix
      );
      text = cleaned;
    }
  }

  // ASCII punctuation to Urdu/Arabic punctuation.
  for (const { pattern, replacement, label } of PUNCTUATION_NORMALIZATIONS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      punctuationFixes += matches.length;
      corrections.set(label, (corrections.get(label) || 0) + matches.length);
      text = text.replace(pattern, replacement);
    }
  }

  // Stray space before Urdu/Arabic punctuation marks.
  const matchesSpaceBeforePunctuation = text.match(SPACE_BEFORE_PUNCTUATION_REGEX);
  if (matchesSpaceBeforePunctuation) {
    punctuationFixes += matchesSpaceBeforePunctuation.length;
    const label = "رموز اوقاف (، ؛ ؟ : ۔) سے پہلے کی خالی جگہ ہٹائی گئی";
    corrections.set(label, (corrections.get(label) || 0) + matchesSpaceBeforePunctuation.length);
    text = text.replace(SPACE_BEFORE_PUNCTUATION_REGEX, "$1");
  }

  return { text, spacingFixes, punctuationFixes };
}

export function standardizeUrduText(input: string): StandardizeResult {
  const corrections = new Map<string, number>();
  let arabicNormalizations = 0;
  let spacingFixes = 0;
  let punctuationFixes = 0;

  // 0. Extract {{ }}-protected segments, process their punctuation/spacing
  // right away (but NOT character normalization), and hold the processed
  // result in `preserved` to be spliced back in verbatim at the end.
  const preserved: string[] = [];
  let text = input.replace(PRESERVE_MARKER_REGEX, (_match, inner: string) => {
    const result = cleanSpacingAndPunctuation(inner, corrections);
    spacingFixes += result.spacingFixes;
    punctuationFixes += result.punctuationFixes;
    preserved.push(result.text);
    return `${PLACEHOLDER_PREFIX}${preserved.length - 1}${PLACEHOLDER_SUFFIX}`;
  });

  // 1. Arabic/Persian character normalization — main text only, tracked
  // per character. Placeholders contain no Arabic/Urdu letters, so this
  // cannot touch protected content.
  for (const { pattern, replacement, label } of CHAR_NORMALIZATIONS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      corrections.set(label, (corrections.get(label) || 0) + matches.length);
      arabicNormalizations += matches.length;
      text = text.replace(pattern, replacement);
    }
  }

  // 2-3. Whitespace cleanup + punctuation normalization on the main text.
  {
    const result = cleanSpacingAndPunctuation(text, corrections);
    text = result.text;
    spacingFixes += result.spacingFixes;
    punctuationFixes += result.punctuationFixes;
  }

  // 4. Restore {{ }}-protected segments (already punctuation/spacing-cleaned).
  if (preserved.length > 0) {
    text = text.replace(
      new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, "g"),
      (_match, idx: string) => preserved[Number(idx)]
    );
  }

  const totalCorrections = arabicNormalizations + spacingFixes + punctuationFixes;

  // 5. Conditional Professional Badges
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
    corrections: Array.from(corrections.entries()).map(([label, count]) => ({ label, count })),
  };
}
