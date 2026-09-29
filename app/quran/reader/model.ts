import { ahmedgrafQuranReference } from "../../tools/arabic-diacritics/quran/ahmedgrafProvider";
import { quranMatchKey } from "../../tools/arabic-diacritics/quran/normalizeQuran";
import type { QuranAyah } from "../../tools/arabic-diacritics/quran/types";
import { JUZ_STARTS } from "./metadata";
import { QURAN_LAYOUT_PROFILE } from "./profile";

const END_SIGN = "\u06dd";

/**
 * Quranic combining marks and layout-only characters.
 *
 * These characters are preserved in the source text. They are ignored
 * only for synthetic pagination estimates.
 */
const ZERO_WIDTH =
  /[\u0640\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/u;

export type QuranPageRef = {
  page: number;
  fromIndex: number;
  toIndex: number;
  surahStart: number;
  ayahStart: number;
  surahEnd: number;
  ayahEnd: number;
};

export type DisplayPiece = {
  kind: "bismillah" | "body";
  text: string;
};

export type SearchHit = {
  surah: number;
  ayah: number;
  id: string;
};

const ayahs = ahmedgrafQuranReference.listAyahs();

const byIndex = ayahs;

const indexById = new Map(
  ayahs.map((ayah, index) => [ayah.id, index]),
);

/**
 * Extract the Bismillah prefix from the first Quran record.
 *
 * This is used only for visual splitting. The underlying source text
 * remains untouched.
 */
function bismillahPrefix(): string {
  const first = byIndex[0]?.text ?? "";
  const at = first.indexOf(END_SIGN);

  return (at >= 0 ? first.slice(0, at) : first).trim();
}

const BISMILLAH_PREFIX = bismillahPrefix();

export function displayPieces(
  ayah: QuranAyah,
): DisplayPiece[] {
  if (
    ayah.surah !== 1 &&
    ayah.surah !== 9 &&
    ayah.ayah === 1 &&
    ayah.text.startsWith(
      `${BISMILLAH_PREFIX} `,
    )
  ) {
    return [
      {
        kind: "bismillah",
        text: BISMILLAH_PREFIX,
      },
      {
        kind: "body",
        text: ayah.text.slice(
          BISMILLAH_PREFIX.length,
        ),
      },
    ];
  }

  return [
    {
      kind: "body",
      text: ayah.text,
    },
  ];
}

/**
 * Synthetic visual width estimate.
 *
 * Quran source text is not altered here.
 * Combining/layout marks are excluded from the estimate because their
 * advance width is normally supplied by the base glyph/OpenType layout.
 */
export function layoutUnits(text: string): number {
  let units = 0;

  for (const ch of text) {
    if (ZERO_WIDTH.test(ch)) {
      continue;
    }

    units +=
      ch === " " || ch === "\t"
        ? 0.35
        : 1;
  }

  return units;
}

/**
 * Estimate the number of visual lines occupied by a text fragment.
 *
 * The production page is intentionally allowed to carry slightly more
 * Quran text than the previous synthetic pagination pass. This keeps the
 * 770 × 1000 reading surface from looking sparsely populated while still
 * leaving the actual browser layout responsible for line wrapping.
 */
function lineCount(text: string): number {
  if (!text.trim()) {
    return 0;
  }

  const units = layoutUnits(text);

  /**
   * The previous profile used 42 units per synthetic line.
   * A slightly higher value packs the page more densely.
   *
   * This is a pagination estimate only; it does not modify the text.
   */
  const packingUnitsPerLine =
    Math.max(
      QURAN_LAYOUT_PROFILE.unitsPerLine,
      46,
    );

  return Math.max(
    1,
    Math.ceil(
      units / packingUnitsPerLine,
    ),
  );
}

/**
 * Estimate the visual cost of one ayah.
 *
 * Surah headings and Bismillah are given a compact reservation so that
 * they do not consume excessive pagination budget compared with the
 * actual reading surface.
 */
function ayahCost(
  ayah: QuranAyah,
): number {
  const pieces = displayPieces(ayah);

  let lines =
    ayah.ayah === 1
      ? Math.max(
          1,
          QURAN_LAYOUT_PROFILE
            .surahHeaderLines - 1,
        )
      : 0;

  if (
    pieces[0]?.kind ===
    "bismillah"
  ) {
    lines += Math.max(
      1,
      QURAN_LAYOUT_PROFILE
        .bismillahLines - 1,
    );
  }

  lines += lineCount(
    pieces[
      pieces.length - 1
    ]?.text ?? "",
  );

  return lines;
}

function pageRef(
  fromIndex: number,
  toIndex: number,
  page: number,
): QuranPageRef {
  const start = byIndex[fromIndex];
  const end = byIndex[toIndex];

  if (!start || !end) {
    throw new Error(
      "page range is outside the Quran",
    );
  }

  return {
    page,
    fromIndex,
    toIndex,
    surahStart: start.surah,
    ayahStart: start.ayah,
    surahEnd: end.surah,
    ayahEnd: end.ayah,
  };
}

/**
 * Build synthetic reading pages.
 *
 * This is deliberately NOT a Mushaf-page migration.
 * There is no replacement of the Quran corpus and no new external
 * page-map source here.
 *
 * The goal is only to make each Qalam reading page visually fuller.
 */
function buildPages(): QuranPageRef[] {
  const pages: QuranPageRef[] = [];

  let from = 0;
  let used = 0;

  /**
   * Give the reading surface a little more vertical content than the
   * previous 15-line estimate.
   *
   * The actual CSS/browser wrapping still determines the true visual
   * line breaks.
   */
  const pageBudget =
    Math.max(
      QURAN_LAYOUT_PROFILE.linesPerPage,
      QURAN_LAYOUT_PROFILE.linesPerPage + 2,
    );

  for (
    let index = 0;
    index < byIndex.length;
    index += 1
  ) {
    const ayah = byIndex[index];

    if (!ayah) {
      continue;
    }

    const cost = ayahCost(ayah);

    if (
      index > from &&
      used + cost > pageBudget
    ) {
      pages.push(
        pageRef(
          from,
          index - 1,
          pages.length + 1,
        ),
      );

      from = index;
      used = 0;
    }

    used += cost;

    /**
     * Prevent an unusually long ayah from causing an endless or empty
     * page boundary.
     */
    if (
      cost > pageBudget
    ) {
      pages.push(
        pageRef(
          from,
          index,
          pages.length + 1,
        ),
      );

      from = index + 1;
      used = 0;
    }
  }

  if (
    from < byIndex.length
  ) {
    pages.push(
      pageRef(
        from,
        byIndex.length - 1,
        pages.length + 1,
      ),
    );
  }

  return pages;
}

export const quranPages: readonly QuranPageRef[] =
  buildPages();

const pageByIndex =
  new Array<number>(
    byIndex.length,
  );

for (const page of quranPages) {
  for (
    let index = page.fromIndex;
    index <= page.toIndex;
    index += 1
  ) {
    pageByIndex[index] =
      page.page;
  }
}

function requireAyah(
  surah: number,
  ayah: number,
): {
  ayah: QuranAyah;
  index: number;
} | null {
  const found =
    ahmedgrafQuranReference.getAyah(
      surah,
      ayah,
    );

  if (!found) {
    return null;
  }

  const index =
    indexById.get(found.id);

  if (index === undefined) {
    return null;
  }

  return {
    ayah: found,
    index,
  };
}

export function getReaderAyah(
  surah: number,
  ayah: number,
): QuranAyah | null {
  return (
    requireAyah(
      surah,
      ayah,
    )?.ayah ?? null
  );
}

export function pageCount(): number {
  return quranPages.length;
}

export function pageOf(
  surah: number,
  ayah: number,
): QuranPageRef | null {
  const found =
    requireAyah(
      surah,
      ayah,
    );

  if (!found) {
    return null;
  }

  const page =
    pageByIndex[
      found.index
    ];

  return (
    quranPages[
      page - 1
    ] ?? null
  );
}

export function pageByNumber(
  page: number,
): QuranPageRef | null {
  return (
    quranPages[
      page - 1
    ] ?? null
  );
}

export function ayahsOnPage(
  page: number,
): readonly QuranAyah[] {
  const ref =
    pageByNumber(page);

  if (!ref) {
    return [];
  }

  return byIndex.slice(
    ref.fromIndex,
    ref.toIndex + 1,
  );
}

export function copyPageText(
  page: number,
): string {
  return ayahsOnPage(page)
    .map(
      (ayah) => ayah.text,
    )
    .join("\n");
}

export function adjacentAyah(
  surah: number,
  ayah: number,
  step: -1 | 1,
): {
  surah: number;
  ayah: number;
} | null {
  const found =
    requireAyah(
      surah,
      ayah,
    );

  if (!found) {
    return null;
  }

  const next =
    byIndex[
      found.index + step
    ];

  return next
    ? {
        surah: next.surah,
        ayah: next.ayah,
      }
    : null;
}

export function adjacentPage(
  page: number,
  step: -1 | 1,
): QuranPageRef | null {
  return pageByNumber(
    page + step,
  );
}

export function juzOf(
  surah: number,
  ayah: number,
): number {
  let current = 1;

  for (
    const start of JUZ_STARTS
  ) {
    if (
      surah > start.surah ||
      (
        surah === start.surah &&
        ayah >= start.ayah
      )
    ) {
      current = start.juz;
    }
  }

  return current;
}

export function juzStart(
  juz: number,
): {
  surah: number;
  ayah: number;
} | null {
  const start =
    JUZ_STARTS.find(
      (item) =>
        item.juz === juz,
    );

  return start
    ? {
        surah:
          start.surah,
        ayah:
          start.ayah,
      }
    : null;
}

function wordKeys(
  text: string,
): string[] {
  return text
    .split(/\s+/)
    .map((word) =>
      quranMatchKey(word),
    )
    .filter(
      (key) =>
        key.length > 0,
    );
}

export function searchQuran(
  query: string,
  limit = 30,
): SearchHit[] {
  const needles =
    wordKeys(query);

  if (
    needles.length === 0
  ) {
    return [];
  }

  const hits: SearchHit[] = [];

  for (
    const ayah of byIndex
  ) {
    const words =
      wordKeys(ayah.text);

    let found = false;

    for (
      let index = 0;
      index <=
        words.length -
          needles.length;
      index += 1
    ) {
      found =
        needles.every(
          (
            needle,
            offset,
          ) =>
            words[
              index + offset
            ] === needle,
        );

      if (found) {
        break;
      }
    }

    if (found) {
      hits.push({
        surah:
          ayah.surah,
        ayah:
          ayah.ayah,
        id:
          ayah.id,
      });

      if (
        hits.length >=
        limit
      ) {
        break;
      }
    }
  }

  return hits;
}

export function selectQuranFont(
  pdmsAvailable: boolean,
): {
  family: string;
  bundled: false;
  profile: string;
} {
  return {
    family: pdmsAvailable
      ? QURAN_LAYOUT_PROFILE.referenceFont
      : QURAN_LAYOUT_PROFILE.productionFont,

    bundled: false,

    profile:
      QURAN_LAYOUT_PROFILE.id,
  };
}
