export interface CorrectionDetail {
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
  corrections: CorrectionDetail[];
}

// Character-level normalization map (Urdu-side). Only applied OUTSIDE
// {{ }}-protected segments, since these letters are correct as-is in
// classical Arabic (hadith, ayat) and should not be rewritten to Urdu forms.
// The Alif-Hamza fix (أ/إ → ا) is safe here specifically because standard
// Urdu orthography doesn't use hamza-on-alif at all — its presence in Urdu
// prose is almost always a stray Arabic-keyboard artifact, not intentional.
const CHAR_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /ي/g, replacement: "ی", label: "ي → ی (عربی یے کو اردو یے میں تبدیل کیا گیا)" },
  { pattern: /ى/g, replacement: "ی", label: "ى → ی (الف مقصورہ کو اردو یے میں تبدیل کیا گیا)" },
  { pattern: /ك/g, replacement: "ک", label: "ك → ک (عربی کاف کو اردو کاف میں تبدیل کیا گیا)" },
  { pattern: /أ/g, replacement: "ا", label: "أ → ا (ہمزہ والا الف سادہ الف میں تبدیل کیا گیا — صرف اردو متن میں)" },
  { pattern: /إ/g, replacement: "ا", label: "إ → ا (ہمزہ والا الف سادہ الف میں تبدیل کیا گیا — صرف اردو متن میں)" },
];

// Character-level normalization map (Arabic-side). Only applied INSIDE
// {{ }}-protected segments — the reverse direction of CHAR_NORMALIZATIONS.
const ARABIC_ONLY_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /ہ/g, replacement: "ه", label: "ہ → ه (اردو ہے کو عربی ہے میں تبدیل کیا گیا)" },
  { pattern: /ک/g, replacement: "ك", label: "ک → ك (اردو کاف کو عربی کاف میں تبدیل کیا گیا)" },
  { pattern: /ے/g, replacement: "ي", label: "ے → ي (اردو یے بڑی کو عربی یے میں تبدیل کیا گیا)" },
];

// ASCII punctuation to Urdu/Arabic punctuation. Applied BOTH inside and
// outside {{ }}-protected segments.
const PUNCTUATION_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /,/g, replacement: "،", label: "، (انگریزی کوما کو اردو کوما میں تبدیل کیا گیا)" },
  { pattern: /;/g, replacement: "؛", label: "؛ (انگریزی سیمی کولن کو اردو سیمی کولن میں تبدیل کیا گیا)" },
  { pattern: /\?/g, replacement: "؟", label: "؟ (انگریزی سوالیہ نشان کو اردو سوالیہ نشان میں تبدیل کیا گیا)" },
];

const SPACE_BEFORE_PUNCTUATION_REGEX = /[ \t]+([:،؛؟۔])/g;

const PRESERVE_MARKER_REGEX = /\{\{([\s\S]*?)\}\}/g;
const PLACEHOLDER_PREFIX = "\u0000PRESERVED";
const PLACEHOLDER_SUFFIX = "\u0000";

function applyCharNormalizations(
  input: string,
  rules: { pattern: RegExp; replacement: string; label: string }[],
  corrections: Map<string, number>
): { text: string; count: number } {
  let text = input;
  let count = 0;
  for (const { pattern, replacement, label } of rules) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      count += matches.length;
      corrections.set(label, (corrections.get(label) || 0) + matches.length);
      text = text.replace(pattern, replacement);
    }
  }
  return { text, count };
}

function cleanSpacingAndPunctuation(
  input: string,
  corrections: Map<string, number>
): { text: string; spacingFixes: number; punctuationFixes: number } {
  let text = input;
  let spacingFixes = 0;
  let punctuationFixes = 0;

  // Normalize Windows-style line endings (CRLF, \r\n) to plain \n first.
  // Counted under its own label — separate from "extra spaces" — since
  // it's an invisible file-format artifact (common when files are saved
  // from Windows Notepad), not a visible spacing mistake in the text.
  const crlfMatches = text.match(/\r/g);
  if (crlfMatches && crlfMatches.length > 0) {
    const fix = crlfMatches.length;
    spacingFixes += fix;
    const label = "لائن اینڈنگ (Windows CRLF) نارملائز کی گئی — فائل فارمیٹ کی پوشیدہ علامت، نظر آنے والی خالی جگہ نہیں";
    corrections.set(label, (corrections.get(label) || 0) + fix);
    text = text.replace(/\r/g, "");
  }

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
      const label = "اضافی خالی جگہیں اور خالی سطریں صاف کی گئیں";
      corrections.set(label, (corrections.get(label) || 0) + fix);
      text = cleaned;
    }
  }

  const punctResult = applyCharNormalizations(text, PUNCTUATION_NORMALIZATIONS, corrections);
  text = punctResult.text;
  punctuationFixes += punctResult.count;

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

  // 0. Extract {{ }}-protected segments and process them as Arabic text.
  const preserved: string[] = [];
  let text = input.replace(PRESERVE_MARKER_REGEX, (_match, inner: string) => {
    const arabicFix = applyCharNormalizations(inner, ARABIC_ONLY_NORMALIZATIONS, corrections);
    arabicNormalizations += arabicFix.count;

    const result = cleanSpacingAndPunctuation(arabicFix.text, corrections);
    spacingFixes += result.spacingFixes;
    punctuationFixes += result.punctuationFixes;

    preserved.push(result.text);
    return `${PLACEHOLDER_PREFIX}${preserved.length - 1}${PLACEHOLDER_SUFFIX}`;
  });

  // 1. Urdu-side character normalization on the main text only.
  const urduFix = applyCharNormalizations(text, CHAR_NORMALIZATIONS, corrections);
  text = urduFix.text;
  arabicNormalizations += urduFix.count;

  // 2-3. Whitespace cleanup + punctuation normalization on the main text.
  {
    const result = cleanSpacingAndPunctuation(text, corrections);
    text = result.text;
    spacingFixes += result.spacingFixes;
    punctuationFixes += result.punctuationFixes;
  }

  // 4. Restore {{ }}-protected segments.
  if (preserved.length > 0) {
    text = text.replace(
      new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, "g"),
      (_match, idx: string) => preserved[Number(idx)]
    );
  }

  const totalCorrections = arabicNormalizations + spacingFixes + punctuationFixes;

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
