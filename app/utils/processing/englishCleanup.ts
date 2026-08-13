/**
 * English-safe cleanup: fix spacing around Latin punctuation without
 * converting punctuation to Arabic/Urdu forms.
 */

export interface EnglishCleanupResult {
  text: string;
  spacingFixes: number;
  punctuationFixes: number;
  corrections: Map<string, number>;
}

export function englishCleanup(input: string): EnglishCleanupResult {
  const corrections = new Map<string, number>();
  let text = input;
  let spacingFixes = 0;
  let punctuationFixes = 0;

  // Space before Latin terminal punctuation → remove ("word ," → "word,")
  const spaceBefore = text.match(/[ \t]+([.,!?;:])/g);
  if (spaceBefore) {
    punctuationFixes += spaceBefore.length;
    corrections.set("Space before English punctuation removed", spaceBefore.length);
    text = text.replace(/[ \t]+([.,!?;:])/g, "$1");
  }

  // Missing space after , ; : when followed by a letter ("test,with" → "test, with")
  // Exclude digit,digit thousands separators.
  const missingAfter = text.match(/(?<!\d)([,;:])(?=[A-Za-z])/g);
  if (missingAfter) {
    spacingFixes += missingAfter.length;
    corrections.set("Missing space after English punctuation inserted", missingAfter.length);
    text = text.replace(/(?<!\d)([,;:])(?=[A-Za-z])/g, "$1 ");
  }

  // Missing space after ! or ? when followed by a letter.
  // Do NOT auto-space after "." — domains (qalamworks.com) and decimals
  // would break. Sentence boundaries are left to the author.
  const missingSentence = text.match(/([!?])([A-Za-z])/g);
  if (missingSentence) {
    spacingFixes += missingSentence.length;
    corrections.set("Missing space after sentence punctuation inserted", missingSentence.length);
    text = text.replace(/([!?])([A-Za-z])/g, "$1 $2");
  }

  return { text, spacingFixes, punctuationFixes, corrections };
}
