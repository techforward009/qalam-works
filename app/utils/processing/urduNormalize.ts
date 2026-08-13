/**
 * Urdu-specific character + punctuation normalization.
 * Extracted from the historical standardizeUrduText engine.
 */

export interface UrduNormalizeResult {
  text: string;
  arabicNormalizations: number;
  spacingFixes: number;
  punctuationFixes: number;
  corrections: Map<string, number>;
}

const CHAR_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /ي/g, replacement: "ی", label: "ي → ی (عربی یے کو اردو یے میں تبدیل کیا گیا)" },
  { pattern: /ى/g, replacement: "ی", label: "ى → ی (الف مقصورہ کو اردو یے میں تبدیل کیا گیا)" },
  { pattern: /ك/g, replacement: "ک", label: "ك → ک (عربی کاف کو اردو کاف میں تبدیل کیا گیا)" },
  { pattern: /أ/g, replacement: "ا", label: "أ → ا (ہمزہ والا الف سادہ الف میں تبدیل کیا گیا — صرف اردو متن میں)" },
  { pattern: /إ/g, replacement: "ا", label: "إ → ا (ہمزہ والا الف سادہ الف میں تبدیل کیا گیا — صرف اردو متن میں)" },
];

const ARABIC_ONLY_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /ہ/g, replacement: "ه", label: "ہ → ه (اردو ہے کو عربی ہے میں تبدیل کیا گیا)" },
  { pattern: /ک/g, replacement: "ك", label: "ک → ك (اردو کاف کو عربی کاف میں تبدیل کیا گیا)" },
  { pattern: /ے/g, replacement: "ي", label: "ے → ي (اردو یے بڑی کو عربی یے میں تبدیل کیا گیا)" },
];

const PUNCTUATION_NORMALIZATIONS: { pattern: RegExp; replacement: string; label: string }[] = [
  { pattern: /,/g, replacement: "،", label: "، (انگریزی کوما کو اردو کوما میں تبدیل کیا گیا)" },
  { pattern: /;/g, replacement: "؛", label: "؛ (انگریزی سیمی کولن کو اردو سیمی کولن میں تبدیل کیا گیا)" },
  { pattern: /\?/g, replacement: "؟", label: "؟ (انگریزی سوالیہ نشان کو اردو سوالیہ نشان میں تبدیل کیا گیا)" },
];

const SPACE_BEFORE_PUNCTUATION_REGEX = /[ \t]+([:،؛؟۔])/g;
const DUPLICATED_PUNCTUATION_REGEX = /([.,!?;:،؛؟۔])\1+/g;
const MISSING_SPACE_AFTER_REGEX = /([)\]:])([A-Za-z0-9\u0600-\u06FF])/g;
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

function cleanSpacingAndPunctuationUrdu(
  input: string,
  corrections: Map<string, number>
): { text: string; spacingFixes: number; punctuationFixes: number } {
  let text = input;
  let spacingFixes = 0;
  let punctuationFixes = 0;

  const crlfMatches = text.match(/\r/g);
  if (crlfMatches && crlfMatches.length > 0) {
    const fix = crlfMatches.length;
    spacingFixes += fix;
    corrections.set(
      "لائن اینڈنگ (Windows CRLF) نارملائز کی گئی — فائل فارمیٹ کی پوشیدہ علامت، نظر آنے والی خالی جگہ نہیں",
      (corrections.get("لائن اینڈنگ (Windows CRLF) نارملائز کی گئی — فائل فارمیٹ کی پوشیدہ علامت، نظر آنے والی خالی جگہ نہیں") || 0) + fix
    );
    text = text.replace(/\r/g, "");
  }

  {
    const originalLength = text.length;
    const cleanedLines = text.split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim());
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

  const duplicatedMatches = text.match(DUPLICATED_PUNCTUATION_REGEX);
  if (duplicatedMatches) {
    punctuationFixes += duplicatedMatches.length;
    const label = "دہرائے گئے رموز اوقاف (مثلاً ؟؟ یا !!) کو ایک ہی نشان میں تبدیل کیا گیا";
    corrections.set(label, (corrections.get(label) || 0) + duplicatedMatches.length);
    text = text.replace(DUPLICATED_PUNCTUATION_REGEX, "$1");
  }

  const missingSpaceMatches = text.match(MISSING_SPACE_AFTER_REGEX);
  if (missingSpaceMatches) {
    spacingFixes += missingSpaceMatches.length;
    const label = "بند بریکٹ یا کولن کے بعد گمشدہ خالی جگہ شامل کی گئی";
    corrections.set(label, (corrections.get(label) || 0) + missingSpaceMatches.length);
    text = text.replace(MISSING_SPACE_AFTER_REGEX, "$1 $2");
  }

  return { text, spacingFixes, punctuationFixes };
}

/** Full Urdu path including {{ }} Arabic-protect segments. */
export function urduNormalize(input: string): UrduNormalizeResult {
  const corrections = new Map<string, number>();
  let arabicNormalizations = 0;
  let spacingFixes = 0;
  let punctuationFixes = 0;

  const preserved: string[] = [];
  let text = input.replace(PRESERVE_MARKER_REGEX, (_match, inner: string) => {
    const arabicFix = applyCharNormalizations(inner, ARABIC_ONLY_NORMALIZATIONS, corrections);
    arabicNormalizations += arabicFix.count;
    const result = cleanSpacingAndPunctuationUrdu(arabicFix.text, corrections);
    spacingFixes += result.spacingFixes;
    punctuationFixes += result.punctuationFixes;
    preserved.push(result.text);
    return `${PLACEHOLDER_PREFIX}${preserved.length - 1}${PLACEHOLDER_SUFFIX}`;
  });

  const urduFix = applyCharNormalizations(text, CHAR_NORMALIZATIONS, corrections);
  text = urduFix.text;
  arabicNormalizations += urduFix.count;

  {
    const result = cleanSpacingAndPunctuationUrdu(text, corrections);
    text = result.text;
    spacingFixes += result.spacingFixes;
    punctuationFixes += result.punctuationFixes;
  }

  if (preserved.length > 0) {
    text = text.replace(
      new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, "g"),
      (_match, idx: string) => preserved[Number(idx)]
    );
  }

  return { text, arabicNormalizations, spacingFixes, punctuationFixes, corrections };
}
