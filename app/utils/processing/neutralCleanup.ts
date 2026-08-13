/**
 * Language-neutral spacing / line-ending cleanup.
 * Does NOT rewrite letters or convert Latin punctuation to Arabic forms.
 */

export interface NeutralCleanupResult {
  text: string;
  spacingFixes: number;
  corrections: Map<string, number>;
}

const DUPLICATED_PUNCTUATION_REGEX = /([.,!?;:،؛؟۔])\1+/g;
const MISSING_SPACE_AFTER_REGEX = /([)\]:])([A-Za-z0-9\u0600-\u06FF])/g;

export function neutralCleanup(input: string): NeutralCleanupResult {
  const corrections = new Map<string, number>();
  let text = input;
  let spacingFixes = 0;

  const crlfMatches = text.match(/\r/g);
  if (crlfMatches && crlfMatches.length > 0) {
    spacingFixes += crlfMatches.length;
    corrections.set("CRLF line endings normalized", crlfMatches.length);
    text = text.replace(/\r/g, "");
  }

  {
    const originalLength = text.length;
    const cleanedLines = text
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim());
    const cleaned = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (cleaned !== text) {
      const fix = Math.abs(originalLength - cleaned.length) || 1;
      spacingFixes += fix;
      corrections.set("Extra spaces / blank lines cleaned", fix);
      text = cleaned;
    }
  }

  const duplicatedMatches = text.match(DUPLICATED_PUNCTUATION_REGEX);
  if (duplicatedMatches) {
    spacingFixes += duplicatedMatches.length;
    corrections.set("Duplicated punctuation collapsed", duplicatedMatches.length);
    text = text.replace(DUPLICATED_PUNCTUATION_REGEX, "$1");
  }

  const missingSpaceMatches = text.match(MISSING_SPACE_AFTER_REGEX);
  if (missingSpaceMatches) {
    spacingFixes += missingSpaceMatches.length;
    corrections.set("Missing space after bracket/colon inserted", missingSpaceMatches.length);
    text = text.replace(MISSING_SPACE_AFTER_REGEX, "$1 $2");
  }

  return { text, spacingFixes, corrections };
}
