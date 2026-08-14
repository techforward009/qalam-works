/**
 * Script-context analysis for safe Auto mixed-language processing.
 * Detection only — does not modify text.
 */

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F]/;

/** Letters strongly associated with Urdu orthography (not typical in classical Arabic). */
const URDU_SPECIFIC = /[\u0679\u067E\u0686\u0688\u0691\u06A9\u06AF\u06BE\u06C1\u06D2\u06BA]/; // ٹ پ چ ڈ ڑ ک گ ھ ہ ے ں

/**
 * Classical / religious Arabic phrases that must not receive Urdu letter maps in Auto.
 * Explicit Arabic mode still preserves everything; this only gates Auto mixed path.
 */
const PROTECTED_ARABIC_PHRASES = [
  /عليه\s+السلام/,
  /عليهم\s+السلام/,
  /صلى\s+الله\s+عليه/,
  /صلی\s+اللہ\s+علیہ/,
  /رضي\s+الله/,
  /رضی\s+اللہ/,
  /بسم\s+الله/,
  /بسم\s+اللہ/,
  /القرآن/,
  /القران/,
  /سبحانه\s+وتعالی/,
  /سبحانه\s+وتعالى/,
  /ﷺ/,
  /ﷻ/,
];

export interface ScriptContext {
  hasArabicScript: boolean;
  hasLatin: boolean;
  hasUrduSpecific: boolean;
  /** Latin + Arabic script both present → Urdu publishing-style mixed doc. */
  isMixed: boolean;
}

export function analyzeScriptContext(text: string): ScriptContext {
  const sample = text.slice(0, 12000);
  let arabic = 0;
  let latin = 0;
  let urduSpecific = 0;
  for (const ch of sample) {
    if (ARABIC_SCRIPT.test(ch)) arabic++;
    else if (LATIN_LETTER.test(ch)) latin++;
    if (URDU_SPECIFIC.test(ch)) urduSpecific++;
  }
  const hasArabicScript = arabic > 0;
  const hasLatin = latin > 0;
  return {
    hasArabicScript,
    hasLatin,
    hasUrduSpecific: urduSpecific > 0,
    isMixed: hasArabicScript && hasLatin,
  };
}

export function isProtectedArabicText(text: string): boolean {
  return PROTECTED_ARABIC_PHRASES.some((re) => re.test(text));
}

/**
 * Decide whether an Arabic-script segment may receive Urdu maps under Auto.
 *
 * Rules:
 * - Never for pure Arabic-script documents (no Latin) → caller uses rtl-neutral.
 * - Never for protected religious/classical phrases.
 * - Yes when document is mixed Latin+Arabic (Urdu-first publishing context)
 *   or the segment/document contains Urdu-specific letters.
 */
export function allowUrduNormalizationInAuto(
  segmentText: string,
  documentContext: ScriptContext
): boolean {
  if (isProtectedArabicText(segmentText)) return false;
  if (documentContext.hasUrduSpecific) return true;
  if (documentContext.isMixed) return true;
  return false;
}
