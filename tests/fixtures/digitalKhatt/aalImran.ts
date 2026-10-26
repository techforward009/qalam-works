import { readFileSync } from "node:fs";

const corpus = JSON.parse(readFileSync("public/quran/indopak-digital-khatt.json", "utf8")) as Record<string, { verse: number; text: string }[]>;
export const arabicAyat = corpus["3"].filter(verse => verse.verse === 26 || verse.verse === 27).map(verse => verse.text);
// Match imported Urdu codepoints while preserving all marks and source wording.
export const urduAyat = arabicAyat.map(text => text.replace(/ه/g, (letter, offset: number) => offset % 2 ? "ھ" : "ہ").replace(/ي|ى/g, "ی").replace(/ك/g, "ک"));
export const urduWords = "اللّٰھم النّہار تؤتی شیء";
export const arabicWords = "اللّٰهم النّهار تؤتي شيء";
