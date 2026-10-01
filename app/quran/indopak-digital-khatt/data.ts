import { JUZ_STARTS } from "../reader/metadata";
import { TANZIL_PAGE_STARTS } from "../reader/tanzilPageMap";

export type DigitalKhattVerse = {
  chapter: number;
  verse: number;
  text: string;
};

/** Upstream snapshot: chapter number → its numbered ayahs. Text is not rewritten. */
export type DigitalKhattCorpus = Record<string, DigitalKhattVerse[]>;

export type DigitalKhattPage = {
  page: number;
  fromIndex: number;
  toIndex: number;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
};

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
  pageCount: 604,
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

/**
 * Build the fixed 604-page view.
 *
 * The existing Qalam 604-page boundary map is page metadata only.
 * It does not modify the DigitalKhatt corpus text.
 */
export function buildDigitalKhattPages(corpus: DigitalKhattCorpus): DigitalKhattPage[] {
  if (TANZIL_PAGE_STARTS.length !== 604) {
    throw new Error(`Expected 604 page starts, received ${TANZIL_PAGE_STARTS.length}`);
  }

  const verses = flattenDigitalKhatt(corpus);
  const indexByKey = new Map(
    verses.map((verse, index) => [`${verse.chapter}:${verse.verse}`, index]),
  );

  const pages: DigitalKhattPage[] = [];

  for (let index = 0; index < TANZIL_PAGE_STARTS.length; index += 1) {
    const [page, startChapter, startVerse] = TANZIL_PAGE_STARTS[index];
    const fromIndex = indexByKey.get(`${startChapter}:${startVerse}`);

    if (fromIndex === undefined) {
      throw new Error(
        `DigitalKhatt page ${page} starts at missing ayah ${startChapter}:${startVerse}`,
      );
    }

    const next = TANZIL_PAGE_STARTS[index + 1];
    const nextIndex = next
      ? indexByKey.get(`${next[1]}:${next[2]}`)
      : verses.length;

    if (nextIndex === undefined) {
      throw new Error(
        `DigitalKhatt page ${page} ends before missing ayah ${next?.[1]}:${next?.[2]}`,
      );
    }

    const toIndex = nextIndex - 1;
    const first = verses[fromIndex];
    const last = verses[toIndex];

    if (!first || !last || toIndex < fromIndex) {
      throw new Error(`Invalid DigitalKhatt page range for page ${page}`);
    }

    pages.push({
      page,
      fromIndex,
      toIndex,
      startChapter: first.chapter,
      startVerse: first.verse,
      endChapter: last.chapter,
      endVerse: last.verse,
    });
  }

  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];

  if (
    pages.length !== 604 ||
    firstPage?.page !== 1 ||
    firstPage.startChapter !== 1 ||
    firstPage.startVerse !== 1 ||
    lastPage?.page !== 604 ||
    lastPage.endChapter !== 114 ||
    lastPage.endVerse !== 6
  ) {
    throw new Error("DigitalKhatt 604-page map failed integrity checks");
  }

  return pages;
}

export function digitalKhattPageOf(
  pages: readonly DigitalKhattPage[],
  surah: number,
  ayah: number,
): DigitalKhattPage | null {
  return (
    pages.find(
      (page) =>
        (surah > page.startChapter ||
          (surah === page.startChapter && ayah >= page.startVerse)) &&
        (surah < page.endChapter ||
          (surah === page.endChapter && ayah <= page.endVerse)),
    ) ?? null
  );
}

export function digitalKhattPageByNumber(
  pages: readonly DigitalKhattPage[],
  pageNumber: number,
): DigitalKhattPage | null {
  return pages[pageNumber - 1] ?? null;
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
