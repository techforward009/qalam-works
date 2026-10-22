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
