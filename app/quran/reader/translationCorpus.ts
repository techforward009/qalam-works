import { HAFS_AYAH_COUNTS } from "../../tools/arabic-diacritics/quran/hafsCounts";
import type { QuranAyah } from "../../tools/arabic-diacritics/quran/types";

export type QuranTranslationLocale = "ur" | "en";
export type QuranTranslationPair = readonly [urdu: string, english: string];

export const QURAN_TRANSLATION_AYAH_COUNT = 6236;
export const QURAN_TRANSLATION_CHUNK_SIZE = 256;
export const QURAN_TRANSLATION_CHUNK_COUNT = 25;

export const QURAN_READER_TRANSLATION_SOURCES = {
  ur: {
    translatorUr: "علامہ شیخ محسن علی نجفی",
    translatorEn: "Shaykh Mohsin Ali Najafi",
  },
  en: {
    translatorUr: "علی قلی قرائی",
    translatorEn: "Ali Quli Qara'i",
  },
} as const;

const SURAH_STARTS = HAFS_AYAH_COUNTS.reduce<number[]>((starts, _count, index) => {
  starts[index] = index === 0 ? 0 : starts[index - 1] + HAFS_AYAH_COUNTS[index - 1];
  return starts;
}, []);

const chunkCache = new Map<number, Promise<readonly QuranTranslationPair[]>>();

export function translationGlobalIndex(surah: number, ayah: number): number | null {
  const count = HAFS_AYAH_COUNTS[surah - 1];
  const start = SURAH_STARTS[surah - 1];
  if (!count || start === undefined || ayah < 1 || ayah > count) return null;
  return start + ayah - 1;
}

export function translationChunkIndex(surah: number, ayah: number): number | null {
  const index = translationGlobalIndex(surah, ayah);
  return index === null ? null : Math.floor(index / QURAN_TRANSLATION_CHUNK_SIZE);
}

export function translationChunkPath(chunk: number): string {
  return "/quran/translations/" + String(chunk).padStart(2, "0") + ".json";
}

async function loadChunk(chunk: number): Promise<readonly QuranTranslationPair[]> {
  const cached = chunkCache.get(chunk);
  if (cached) return cached;
  const pending = fetch(translationChunkPath(chunk), { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) throw new Error("Quran translation chunk " + chunk + " could not be loaded.");
    return response.json() as Promise<QuranTranslationPair[]>;
  });
  chunkCache.set(chunk, pending);
  return pending;
}

export async function quranTranslationFor(
  surah: number,
  ayah: number,
  locale: QuranTranslationLocale,
): Promise<string | null> {
  const global = translationGlobalIndex(surah, ayah);
  if (global === null) return null;
  const chunk = Math.floor(global / QURAN_TRANSLATION_CHUNK_SIZE);
  const offset = global % QURAN_TRANSLATION_CHUNK_SIZE;
  const pair = (await loadChunk(chunk))[offset];
  return pair?.[locale === "ur" ? 0 : 1] ?? null;
}

export async function translationRowsForAyahs(
  ayahs: readonly QuranAyah[],
  locale: QuranTranslationLocale,
): Promise<readonly { ayah: QuranAyah; text: string }[]> {
  const chunkIds = [...new Set(
    ayahs
      .map((item) => translationChunkIndex(item.surah, item.ayah))
      .filter((item): item is number => item !== null),
  )];
  await Promise.all(chunkIds.map(loadChunk));
  const rows = await Promise.all(
    ayahs.map(async (ayah) => ({
      ayah,
      text: (await quranTranslationFor(ayah.surah, ayah.ayah, locale)) ?? "",
    })),
  );
  return rows.filter((row) => row.text);
}

export async function translationTextForAyahs(
  ayahs: readonly QuranAyah[],
  locale: QuranTranslationLocale,
): Promise<string> {
  const rows = await translationRowsForAyahs(ayahs, locale);
  return rows.map(({ ayah, text }) => ayah.surah + ":" + ayah.ayah + "  " + text).join("\n\n");
}
