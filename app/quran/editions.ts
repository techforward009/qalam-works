export type QuranEditionId = "qalam-indopak" | "digital-khatt" | "madinah-v2";

export type QuranEdition = {
  id: QuranEditionId;
  name: string;
  shortName: string;
  description: string;
  detail: string;
  route: string;
  pageCount: number;
  lineCount: number;
  rendering: string;
};

export const QURAN_EDITIONS: readonly QuranEdition[] = [
  {
    id: "qalam-indopak",
    name: "Qalam IndoPak",
    shortName: "Qalam IndoPak",
    description: "IndoPak Quran text from AhmedGraf.",
    detail: "604 pages · Qalam web rendering",
    route: "/quran/1/1",
    pageCount: 604,
    lineCount: 15,
    rendering: "Unicode text + Qalam renderer",
  },
  {
    id: "digital-khatt",
    name: "IndoPak — Digital Khatt",
    shortName: "Digital Khatt",
    description: "DigitalKhatt IndoPak text with its matching DigitalKhatt font.",
    detail: "604 pages · DigitalKhatt",
    route: "/quran/indopak-digital-khatt/1/1",
    pageCount: 604,
    lineCount: 15,
    rendering: "DigitalKhatt corpus + DigitalKhatt font",
  },
  {
    id: "madinah-v2",
    name: "Madinah Mushaf — Uthman Taha",
    shortName: "Madinah Mushaf",
    description: "KFGQPC V2 Madinah Mushaf rendering with page-specific QCF glyph fonts.",
    detail: "604 pages · 15 lines · 1421H",
    route: "/quran/madinah/1/1",
    pageCount: 604,
    lineCount: 15,
    rendering: "QCF V2 page glyphs + QUL layout",
  },
] as const;

export function getQuranEdition(id: QuranEditionId): QuranEdition {
  return QURAN_EDITIONS.find((edition) => edition.id === id) ?? QURAN_EDITIONS[0];
}
