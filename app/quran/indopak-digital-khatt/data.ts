import { JUZ_STARTS } from "../reader/metadata";

export type DigitalKhattVerse = {
  chapter: number;
  verse: number;
  text: string;
};

/** Upstream snapshot: chapter number → its numbered ayahs. Text is not rewritten. */
export type DigitalKhattCorpus = Record<string, DigitalKhattVerse[]>;

export const DIGITAL_KHATT_EDITION = {
  id: "qalam-indopak-digitalkhatt-v1",
  name: "IndoPak — Digital Khatt",
  source: "DigitalKhatt / risan/quran-json",
  sourceUrl: "https://github.com/risan/quran-json",
  license: "MIT",
  corpusPath: "/quran/indopak-digital-khatt.json",
  fontFamily: "DigitalKhattIndoPak",
  fontSource: "DigitalKhatt / indopakfont v1.0.0-beta.1",
  fontLicense: "OFL-1.1",
  verseCount: 6236,
} as const;

export function isDigitalKhattCorpus(value: unknown): value is DigitalKhattCorpus {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const corpus = value as DigitalKhattCorpus;
  const first = corpus["1"]?.[0];
  return Boolean(first && typeof first.text === "string" && typeof first.verse === "number");
}

export function chapterVerses(corpus: DigitalKhattCorpus, surah: number): DigitalKhattVerse[] {
  return corpus[String(surah)] ?? [];
}

export function findDigitalKhattAyah(
  corpus: DigitalKhattCorpus,
  surah: number,
  ayah: number,
): DigitalKhattVerse | null {
  return chapterVerses(corpus, surah).find((verse) => verse.verse === ayah) ?? null;
}

export function flattenDigitalKhatt(corpus: DigitalKhattCorpus): DigitalKhattVerse[] {
  const verses: DigitalKhattVerse[] = [];
  for (let surah = 1; surah <= 114; surah += 1) verses.push(...chapterVerses(corpus, surah));
  return verses;
}

export function digitalKhattJuzOf(surah: number, ayah: number): number {
  let current = 1;
  for (const start of JUZ_STARTS) {
    if (surah > start.surah || (surah === start.surah && ayah >= start.ayah)) current = start.juz;
  }
  return current;
}

export function digitalKhattJuzStart(juz: number): { surah: number; ayah: number } | null {
  const start = JUZ_STARTS.find((item) => item.juz === juz);
  return start ? { surah: start.surah, ayah: start.ayah } : null;
}
