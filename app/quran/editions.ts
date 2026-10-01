export type QuranEditionId = "qalam-indopak" | "digital-khatt" | "madinah-v2";

type LocalizedText = { en: string; ur: string };

type QuranEditionProvenance = {
  textSource: string;
  textSourceUrl?: string;
  textLicense?: string;
  fontSource: string;
  fontSourceUrl?: string;
  fontLicense?: string;
  layoutSource?: string;
  layoutSourceUrl?: string;
};

export type QuranEdition = {
  id: QuranEditionId;
  name: LocalizedText;
  shortName: LocalizedText;
  description: LocalizedText;
  detail: LocalizedText;
  rendering: LocalizedText;
  route: string;
  pageCount: number;
  lineCount: number | null;
  layoutModel: "flowing-text-with-page-boundaries" | "native-15-line-page-layout";
  provenance: QuranEditionProvenance;
};

export const QURAN_EDITIONS: readonly QuranEdition[] = [
  {
    id: "qalam-indopak",
    name: { en: "IndoPak — AhmedGraf", ur: "انڈو پاک — احمد گراف" },
    shortName: { en: "AhmedGraf", ur: "احمد گراف" },
    description: {
      en: "IndoPak Quran text from AhmedGraf.",
      ur: "احمد گراف کا انڈو پاک قرآنی متن۔",
    },
    detail: { en: "604 pages · Qalam reader", ur: "604 صفحات · Qalam ریڈر" },
    rendering: { en: "AhmedGraf text + Font", ur: "احمد گراف کا انڈو پاک متن + فونٹ" },
    route: "/quran/1/1",
    pageCount: 604,
    lineCount: null,
    layoutModel: "flowing-text-with-page-boundaries",
    provenance: {
      textSource: "AhmedGraf · Indo-Pak Quran Text v1.0",
      textSourceUrl: "http://ahmedgraf.com",
      fontSource: "Muhammadi Quranic · Qalam Works Vercel Blob",
      fontSourceUrl: "https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/muhammadi-quranic-400.woff2",
    },
  },
  {
    id: "digital-khatt",
    name: { en: "IndoPak — Digital Khatt", ur: "انڈو پاک — ڈیجیٹل خط" },
    shortName: { en: "Digital Khatt", ur: "ڈیجیٹل خط" },
    description: {
      en: "DigitalKhatt IndoPak Quran text with its matching DigitalKhatt font.",
      ur: "DigitalKhatt کے انڈو پاک قرآنی متن کو اسی کے متعلقہ فونٹ کے ساتھ پیش کیا گیا ہے۔",
    },
    detail: { en: "604 pages · DigitalKhatt", ur: "604 صفحات · DigitalKhatt" },
    rendering: { en: "DigitalKhatt text + matching font", ur: "DigitalKhatt متن + متعلقہ فونٹ" },
    route: "/quran/indopak-digital-khatt/1/1",
    pageCount: 604,
    lineCount: null,
    layoutModel: "flowing-text-with-page-boundaries",
    provenance: {
      textSource: "DigitalKhatt / risan/quran-json",
      textSourceUrl: "https://github.com/risan/quran-json",
      textLicense: "MIT",
      fontSource: "DigitalKhatt / indopakfont v1.0.0-beta.1",
      fontSourceUrl: "https://github.com/DigitalKhatt/indopakfont",
      fontLicense: "OFL-1.1",
    },
  },
  {
    id: "madinah-v2",
    name: { en: "Madinah Mushaf — Uthman Taha", ur: "مصحف مدینہ — عثمان طہ" },
    shortName: { en: "Madinah Mushaf", ur: "مصحف مدینہ" },
    description: {
      en: "KFGQPC V2 Madinah Mushaf with page-specific QCF glyph fonts and QUL layout data.",
      ur: "KFGQPC V2 مدنی مصحف کو صفحہ وار QCF فونٹس اور QUL لے آؤٹ ڈیٹا کے ساتھ پیش کیا گیا ہے۔",
    },
    detail: { en: "604 pages · 15 lines · 1421H", ur: "604 صفحات · 15 سطریں · 1421ھ" },
    rendering: { en: "QCF V2 page glyphs + QUL layout", ur: "QCF V2 صفحہ وار حروف + QUL لے آؤٹ" },
    route: "/quran/madinah/1/1",
    pageCount: 604,
    lineCount: 15,
    layoutModel: "native-15-line-page-layout",
    provenance: {
      textSource: "QCF V2 page data · QUL SQLite-derived layout",
      textSourceUrl: "https://github.com/manaf/KFGQPC-Madinah-Mushaf",
      fontSource: "QCF V2 page-specific fonts",
      fontSourceUrl: "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2",
      layoutSource: "QUL page layout data",
      layoutSourceUrl: "https://github.com/manaf/KFGQPC-Madinah-Mushaf",
    },
  },
] as const;

export function getQuranEdition(id: QuranEditionId): QuranEdition {
  return QURAN_EDITIONS.find((edition) => edition.id === id) ?? QURAN_EDITIONS[0];
}
