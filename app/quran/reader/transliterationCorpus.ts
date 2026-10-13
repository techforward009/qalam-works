import { HAFS_AYAH_COUNTS } from "../../tools/arabic-diacritics/quran/hafsCounts";
import type { QuranAyah } from "../../tools/arabic-diacritics/quran/types";

export const QURAN_TRANSLITERATION_AYAH_COUNT = 6236;
export const QURAN_TRANSLITERATION_CHUNK_SIZE = 256;
export const QURAN_TRANSLITERATION_CHUNK_COUNT = 25;

export const QURAN_TRANSLITERATION_SOURCE = {
  id: "transliteration-en",
  nameEn: "English transliteration",
  nameUr: "انگریزی تلفظ",
  copyright: "Publicly available. Downloaded from www.islamware.com",
  direction: "ltr" as const,
};

const SURAH_STARTS = HAFS_AYAH_COUNTS.reduce<number[]>((starts, _count, index) => {
  starts[index] = index === 0 ? 0 : starts[index - 1] + HAFS_AYAH_COUNTS[index - 1];
  return starts;
}, []);

const chunkCache = new Map<number, Promise<readonly string[]>>();

export function transliterationGlobalIndex(surah: number, ayah: number): number | null {
  const count = HAFS_AYAH_COUNTS[surah - 1];
  const start = SURAH_STARTS[surah - 1];
  if (!count || start === undefined || ayah < 1 || ayah > count) return null;
  return start + ayah - 1;
}

export function transliterationChunkPath(chunk: number): string {
  return "/quran/transliteration/" + String(chunk).padStart(2, "0") + ".json";
}

async function loadChunk(chunk: number): Promise<readonly string[]> {
  const cached = chunkCache.get(chunk);
  if (cached) return cached;
  const pending = fetch(transliterationChunkPath(chunk), { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) throw new Error("Transliteration chunk " + chunk + " could not be loaded.");
    const rows = await response.json() as unknown;
    if (!Array.isArray(rows) || rows.some((row) => typeof row !== "string")) {
      throw new Error("Transliteration chunk " + chunk + " is not a string list.");
    }
    return rows as string[];
  });
  chunkCache.set(chunk, pending);
  return pending;
}

export async function transliterationFor(surah: number, ayah: number): Promise<string | null> {
  const global = transliterationGlobalIndex(surah, ayah);
  if (global === null) return null;
  const chunk = Math.floor(global / QURAN_TRANSLITERATION_CHUNK_SIZE);
  const offset = global % QURAN_TRANSLITERATION_CHUNK_SIZE;
  const text = (await loadChunk(chunk))[offset];
  return typeof text === "string" && text.trim().length > 0 ? text : null;
}

export async function transliterationRowsForAyahs(
  ayahs: readonly QuranAyah[],
): Promise<readonly { ayah: QuranAyah; text: string | null }[]> {
  const chunks = [...new Set(
    ayahs
      .map((item) => transliterationGlobalIndex(item.surah, item.ayah))
      .filter((index): index is number => index !== null)
      .map((index) => Math.floor(index / QURAN_TRANSLITERATION_CHUNK_SIZE)),
  )];
  await Promise.all(chunks.map(loadChunk));
  return Promise.all(ayahs.map(async (ayah) => ({
    ayah,
    text: await transliterationFor(ayah.surah, ayah.ayah),
  })));
}
