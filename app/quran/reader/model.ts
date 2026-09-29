import { ahmedgrafQuranReference } from "../../tools/arabic-diacritics/quran/ahmedgrafProvider";
import { quranMatchKey } from "../../tools/arabic-diacritics/quran/normalizeQuran";
import type { QuranAyah } from "../../tools/arabic-diacritics/quran/types";
import { JUZ_STARTS } from "./metadata";
import { TANZIL_PAGE_STARTS } from "./tanzilPageMap";
import { QURAN_LAYOUT_PROFILE } from "./profile";

const END_SIGN = "\u06dd";

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
  ayahs.map((ayah, index) => [
    ayah.id,
    index,
  ]),
);

const indexByAyah = new Map(
  ayahs.map((ayah, index) => [
    `${ayah.surah}:${ayah.ayah}`,
    index,
  ]),
);

/**
 * Extract the Bismillah prefix from the first Quran record.
 *
 * This is used only for visual splitting.
 * The source Quran text itself is never rewritten.
 */
function bismillahPrefix(): string {
  const first =
    byIndex[0]?.text ?? "";

  const at =
    first.indexOf(
      END_SIGN,
    );

  return (
    at >= 0
      ? first.slice(
          0,
          at,
        )
      : first
  ).trim();
}

const BISMILLAH_PREFIX =
  bismillahPrefix();

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
 * Count approximate visual units.
 *
 * This function is retained for diagnostics / compatibility only.
 * It is no longer used to determine Quran page boundaries.
 */
export function layoutUnits(
  text: string,
): number {
  let units = 0;

  for (const ch of text) {
    if (ZERO_WIDTH.test(ch)) {
      continue;
    }

    units +=
      ch === " " ||
      ch === "\t"
        ? 0.35
        : 1;
  }

  return units;
}

function pageRef(
  fromIndex: number,
  toIndex: number,
  page: number,
): QuranPageRef {
  const start =
    byIndex[fromIndex];

  const end =
    byIndex[toIndex];

  if (!start || !end) {
    throw new Error(
      `Quran page ${page} is outside the Quran corpus`,
    );
  }

  return {
    page,
    fromIndex,
    toIndex,
    surahStart:
      start.surah,
    ayahStart:
      start.ayah,
    surahEnd:
      end.surah,
    ayahEnd:
      end.ayah,
  };
}

/**
 * Resolve a Tanzil page-map tuple to the corresponding corpus index.
 */
function indexForPageStart(
  page: number,
  surah: number,
  ayah: number,
): number {
  const key = `${surah}:${ayah}`;

  const index =
    indexByAyah.get(key);

  if (index === undefined) {
    throw new Error(
      `Tanzil page ${page} starts at missing Quran ayah ${key}`,
    );
  }

  return index;
}

/**
 * Build the fixed 604-page map.
 *
 * The page boundaries come from Tanzil metadata.
 *
 * The source Quran corpus remains ahmedgrafQuranReference.
 * This file only maps existing ayahs into fixed page ranges.
 */
function buildPages(): QuranPageRef[] {
  if (
    TANZIL_PAGE_STARTS.length !==
    604
  ) {
    throw new Error(
      `Expected 604 Tanzil page starts, received ${TANZIL_PAGE_STARTS.length}`,
    );
  }

  const pages: QuranPageRef[] =
    [];

  let previousStart =
    -1;

  for (
    let i = 0;
    i <
    TANZIL_PAGE_STARTS.length;
    i += 1
  ) {
    const [
      page,
      surah,
      ayah,
    ] =
      TANZIL_PAGE_STARTS[i];

    const startIndex =
      indexForPageStart(
        page,
        surah,
        ayah,
      );

    /**
     * Page starts must move strictly forward.
     */
    if (
      startIndex <=
      previousStart
    ) {
      throw new Error(
        `Invalid Tanzil page order at page ${page}`,
      );
    }

    previousStart =
      startIndex;

    const next =
      TANZIL_PAGE_STARTS[
        i + 1
      ];

    const endIndex =
      next
        ? indexForPageStart(
            next[0],
            next[1],
            next[2],
          ) - 1
        : byIndex.length - 1;

    if (
      endIndex <
      startIndex
    ) {
      throw new Error(
        `Invalid Quran range for page ${page}`,
      );
    }

    pages.push(
      pageRef(
        startIndex,
        endIndex,
        page,
      ),
    );
  }

  /**
   * Final integrity checks.
   */
  if (
    pages.length !==
    604
  ) {
    throw new Error(
      `Expected 604 Quran pages, received ${pages.length}`,
    );
  }

  const first =
    pages[0];

  const last =
    pages[
      pages.length - 1
    ];

  if (
    first?.page !== 1 ||
    first.surahStart !== 1 ||
    first.ayahStart !== 1
  ) {
    throw new Error(
      "Quran page 1 must start at 1:1",
    );
  }

  if (
    last?.page !== 604 ||
    last.surahEnd !== 114 ||
    last.ayahEnd !== 6
  ) {
    throw new Error(
      "Quran page 604 must end at 114:6",
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

for (
  const page of quranPages
) {
  for (
    let index =
      page.fromIndex;
    index <=
      page.toIndex;
    index += 1
  ) {
    if (
      pageByIndex[index] !==
      undefined
    ) {
      throw new Error(
        `Ayah index ${index} is assigned to more than one Quran page`,
      );
    }

    pageByIndex[index] =
      page.page;
  }
}

/**
 * Every corpus ayah must belong to exactly one fixed page.
 */
for (
  let index = 0;
  index < byIndex.length;
  index += 1
) {
  if (
    pageByIndex[index] ===
    undefined
  ) {
    throw new Error(
      `Ayah index ${index} is missing from the Quran page map`,
    );
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
    indexById.get(
      found.id,
    );

  if (
    index === undefined
  ) {
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
      (ayah) =>
        ayah.text,
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
        surah:
          next.surah,
        ayah:
          next.ayah,
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
        surah ===
          start.surah &&
        ayah >=
          start.ayah
      )
    ) {
      current =
        start.juz;
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

  const hits: SearchHit[] =
    [];

  for (
    const ayah of byIndex
  ) {
    const words =
      wordKeys(
        ayah.text,
      );

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
              index +
                offset
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
    family:
      pdmsAvailable
        ? QURAN_LAYOUT_PROFILE.referenceFont
        : QURAN_LAYOUT_PROFILE.productionFont,

    bundled: false,

    profile:
      QURAN_LAYOUT_PROFILE.id,
  };
}
