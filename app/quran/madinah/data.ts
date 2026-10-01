export type MadinahWord = {
  location: string;
  word_id: number;
  qpcV2: string;
  kind: "word" | "marker";
};

export type MadinahLine = {
  line: number;
  type: "text" | "surah_name" | "basmallah" | "blank";
  words: MadinahWord[];
  centered?: boolean;
  decor?: { surah?: number; glyph?: string };
};

export type MadinahPage = {
  page: number;
  source: string;
  lines: MadinahLine[];
};

export const MADINAH_V2_EDITION = {
  id: "qalam-madinah-v2-1421h",
  name: "Madinah Mushaf — Uthman Taha",
  subtitle: "KFGQPC V2 · 1421H · Hafs",
  pageCount: 604,
  lineCount: 15,
  localBase: "/quran/madinah-v2/pages",
  remoteBase:
    "https://raw.githubusercontent.com/manaf/KFGQPC-Madinah-Mushaf/main/data/pages",
  fontBase:
    "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2",
  basmalaFont:
    "https://cdn.jsdelivr.net/gh/nuqayah/qpc-fonts@master/mushaf-v2/QCF2BSML.ttf",
} as const;

/** Calligraphic Madinah basmala in QCF2BSML. Not the U+FDFD ligature. */
export const MADINAH_BASMALA_GLYPH = "\uFC21";
export const MADINAH_BASMALA_FAMILY = "QalamMadinahBasmala";

export function pageUrl(page: number, remote = false): string {
  const n = String(page).padStart(3, "0");
  const base = remote ? MADINAH_V2_EDITION.remoteBase : MADINAH_V2_EDITION.localBase;
  return `${base}/page-${n}.json`;
}

export function fontUrl(page: number): string {
  return `${MADINAH_V2_EDITION.fontBase}/p${page}.woff2`;
}

export function lineGlyphText(line: MadinahLine): string {
  return line.words.map((word) => word.qpcV2).join(" ");
}

export function locationsOnPage(page: MadinahPage): string[] {
  const values: string[] = [];
  for (const line of page.lines) {
    for (const word of line.words) values.push(word.location);
  }
  return values;
}
