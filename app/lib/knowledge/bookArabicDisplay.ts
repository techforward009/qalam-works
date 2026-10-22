/**
 * Display-only, one-code-unit-to-one-code-unit replacements for Arabic book
 * records originally typed with Urdu/Persian keyboard code points.
 * Do NOT apply to stored text, copy data, translations, or citation offsets.
 */
const aliases: Readonly<Record<string, string>> = {
  "ی": "ي", // Farsi yeh -> Arabic yeh
  "ک": "ك", // Keheh -> Arabic kaf
  "ہ": "ه", // Heh goal -> Arabic heh
};

export function displayArabicBookText(original: string): string {
  return original.replace(/[یکہ]/gu, character => aliases[character] ?? character);
}

/** Keep parenthesized Arabic quotations in one right-to-left directional isolate.
 * No code points are inserted in the text itself, and concatenating these
 * segments reconstructs the exact display text. Latin parentheses in English
 * prose and source reference identifiers are never processed here.
 */
export type ArabicBookDisplaySegment = { text: string; isolateRtl: boolean };

export function splitArabicBookParentheses(displayText: string): ArabicBookDisplaySegment[] {
  const pieces: ArabicBookDisplaySegment[] = [];
  const pattern = /\([^()\r\n]{1,220}\)/gu;
  let cursor = 0;
  for (const match of displayText.matchAll(pattern)) {
    const start = match.index;
    const candidate = match[0];
    if (!/[\u0621-\u064A\u0671-\u06D3]/u.test(candidate)) continue;
    if (start > cursor) pieces.push({ text: displayText.slice(cursor, start), isolateRtl: false });
    pieces.push({ text: candidate, isolateRtl: true });
    cursor = start + candidate.length;
  }
  if (cursor < displayText.length) pieces.push({ text: displayText.slice(cursor), isolateRtl: false });
  return pieces;
}
