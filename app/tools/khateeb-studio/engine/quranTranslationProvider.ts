import { QURAN_TRANSLATIONS_SEGMENT_01 } from "./quranTranslations/segment01";
import { QURAN_TRANSLATIONS_SEGMENT_02 } from "./quranTranslations/segment02";
import { QURAN_TRANSLATIONS_SEGMENT_03 } from "./quranTranslations/segment03";
import { QURAN_TRANSLATIONS_SEGMENT_04 } from "./quranTranslations/segment04";
import { QURAN_TRANSLATIONS_SEGMENT_05 } from "./quranTranslations/segment05";
import { QURAN_TRANSLATIONS_SEGMENT_06 } from "./quranTranslations/segment06";

export type QuranTranslationLocale = "ur" | "en";
export type QuranLocation = { surah: number; ayah: number };

type QuranTranslationPair = { ur: string; en: string };

const QURAN_TRANSLATIONS: Record<string, QuranTranslationPair> = {
  ...QURAN_TRANSLATIONS_SEGMENT_01,
  ...QURAN_TRANSLATIONS_SEGMENT_02,
  ...QURAN_TRANSLATIONS_SEGMENT_03,
  ...QURAN_TRANSLATIONS_SEGMENT_04,
  ...QURAN_TRANSLATIONS_SEGMENT_05,
  ...QURAN_TRANSLATIONS_SEGMENT_06,
};

export const QURAN_TRANSLATION_SOURCES = {
  ur: {
    translatorUr: "علامہ شیخ محسن علی نجفی",
    translatorEn: "Shaykh Mohsin Ali Najafi",
    sourceLabelUr: "ترجمۂ قرآن — علامہ شیخ محسن علی نجفی",
    sourceLabelEn: "Qur'an translation — Shaykh Mohsin Ali Najafi",
  },
  en: {
    translatorUr: "علی قلی قرائی",
    translatorEn: "Ali Quli Qara'i",
    sourceLabelUr: "انگریزی ترجمۂ قرآن — علی قلی قرائی",
    sourceLabelEn: "Qur'an translation — Ali Quli Qara'i",
  },
} as const;

export function quranTranslationFor(
  surah: number,
  ayah: number,
  locale: QuranTranslationLocale,
): string | null {
  return QURAN_TRANSLATIONS[`${surah}:${ayah}`]?.[locale] ?? null;
}

export function quranTranslationCoverageCount(): number {
  return Object.keys(QURAN_TRANSLATIONS).length;
}

export function quranLocationsFromReference(reference: string): QuranLocation[] {
  const locations: QuranLocation[] = [];
  const seen = new Set<string>();
  const pattern = /(\d{1,3}):(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?/gu;

  for (const match of reference.matchAll(pattern)) {
    const surah = Number(match[1]);
    const start = Number(match[2]);
    const end = match[3] ? Number(match[3]) : start;
    if (surah < 1 || surah > 114 || start < 1 || end < start || end - start > 20) {
      continue;
    }
    for (let ayah = start; ayah <= end; ayah += 1) {
      const key = `${surah}:${ayah}`;
      if (seen.has(key)) continue;
      seen.add(key);
      locations.push({ surah, ayah });
    }
  }

  return locations;
}
