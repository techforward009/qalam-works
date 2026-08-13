/**
 * Arabic-safe cleanup: neutral spacing only + optional safe spacing
 * around Arabic punctuation. Does NOT rewrite ي ك أ إ.
 */

export interface ArabicSafeResult {
  text: string;
  spacingFixes: number;
  punctuationFixes: number;
  corrections: Map<string, number>;
}

const SPACE_BEFORE_ARABIC_PUNCT = /[ \t]+([،؛؟۔:])/g;

export function arabicSafeCleanup(input: string): ArabicSafeResult {
  const corrections = new Map<string, number>();
  let text = input;
  let spacingFixes = 0;
  let punctuationFixes = 0;

  const before = text.match(SPACE_BEFORE_ARABIC_PUNCT);
  if (before) {
    punctuationFixes += before.length;
    corrections.set("Space before Arabic punctuation removed", before.length);
    text = text.replace(SPACE_BEFORE_ARABIC_PUNCT, "$1");
  }

  return { text, spacingFixes, punctuationFixes, corrections };
}
