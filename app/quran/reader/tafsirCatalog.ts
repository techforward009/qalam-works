export type TafsirLanguage = "ur" | "ar" | "fa";

export type TafsirWork = {
  id: string;
  titleEn: string;
  titleUr: string;
  authorEn: string;
  authorUr: string;
  language: TafsirLanguage;
  direction: "rtl";
};

/** Catalog only. No commentary text is stored until a licensed source is added. */
export const TAFSIR_WORKS: readonly TafsirWork[] = [
  {
    id: "nemuneh",
    titleEn: "Tafsir Nemuneh",
    titleUr: "تفسیر نمونہ",
    authorEn: "Ayatollah Naser Makarem Shirazi",
    authorUr: "آیت اللہ ناصر مکارم شیرازی",
    language: "fa",
    direction: "rtl",
  },
  {
    id: "kawthar",
    titleEn: "Tafsir al-Kawthar",
    titleUr: "تفسیر الکوثر",
    authorEn: "Allama Sheikh Mohsin Ali Najafi",
    authorUr: "علامہ شیخ محسن علی نجفی",
    language: "ur",
    direction: "rtl",
  },
  {
    id: "mizan",
    titleEn: "Al-Mizan fi Tafsir al-Quran",
    titleUr: "المیزان فی تفسیر القرآن",
    authorEn: "Allama Muhammad Husayn Tabatabai",
    authorUr: "علامہ محمد حسین طباطبائی",
    language: "ar",
    direction: "rtl",
  },
  {
    id: "majma",
    titleEn: "Majma al-Bayan",
    titleUr: "مجمع البیان",
    authorEn: "Shaykh al-Tabarsi",
    authorUr: "شیخ طبرسی",
    language: "ar",
    direction: "rtl",
  },
  {
    id: "safi",
    titleEn: "Tafsir al-Safi",
    titleUr: "تفسیر الصافی",
    authorEn: "Mulla Muhsin Fayz Kashani",
    authorUr: "ملا محسن فیض کاشانی",
    language: "ar",
    direction: "rtl",
  },
];

export type TafsirEntry = {
  work: TafsirWork;
  surah: number;
  ayah: number;
  text: string;
  volume: string | null;
  page: string | null;
};

export function tafsirWorkById(id: string): TafsirWork | null {
  return TAFSIR_WORKS.find((work) => work.id === id) ?? null;
}

/** Returns licensed commentary only. This repository has none, so the result is always null. */
export function tafsirForAyah(_workId: string, _surah: number, _ayah: number): TafsirEntry | null {
  return null;
}
