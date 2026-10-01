export type QuranReaderCopy = {
  search: string;
  browse: string;
  copy: string;
  copyDone: string;
  display: string;
  size: string;
  small: string;
  medium: string;
  large: string;
  surah: string;
  ayah: string;
  juz: string;
  page: string;
  noResults: string;
  nextPage: string;
  previousPage: string;
  goToPage: string;
  loading: string;
  notFound: string;
  pageCouldNotLoad: string;
  allEditions: string;
  matchingFontForWord: string;
  qalamCredit: string;
  digitalCredit: string;
  madinahCredit: string;
};

export const QURAN_READER_COPY: Record<"en" | "ur", QuranReaderCopy> = {
  en: {
    search: "Search",
    browse: "Browse",
    copy: "Copy current page",
    copyDone: "Copied",
    display: "Display",
    size: "Size",
    small: "Small",
    medium: "Medium",
    large: "Large",
    surah: "Surah",
    ayah: "Ayah",
    juz: "Juz",
    page: "Page",
    noResults: "No results found.",
    nextPage: "Next Page →",
    previousPage: "← Previous Page",
    goToPage: "Go to page",
    loading: "Loading…",
    notFound: "This ayah could not be found.",
    pageCouldNotLoad: "This page could not be loaded.",
    allEditions: "All Quran Editions",
    matchingFontForWord: "Matching font for Word",
    qalamCredit: "Text: IndoPak Quran Text v1.0, AhmedGraf · Font: Muhammadi Quranic.",
    digitalCredit: "Text: DigitalKhatt IndoPak · Font: DigitalKhatt.",
    madinahCredit: "Madinah Mushaf: KFGQPC · Layout: QUL · QCF V2 page fonts served from Quran Foundation CDN.",
  },
  ur: {
    search: "تلاش",
    browse: "براؤز",
    copy: "موجودہ صفحہ نقل کریں",
    copyDone: "نقل ہوگئی",
    display: "نمایش",
    size: "سائز",
    small: "چھوٹا",
    medium: "درمیانہ",
    large: "بڑا",
    surah: "سورۃ",
    ayah: "آیت",
    juz: "پارہ",
    page: "صفحہ",
    noResults: "کوئی نتیجہ نہیں ملا۔",
    nextPage: "اگلا صفحہ →",
    previousPage: "← پچھلا صفحہ",
    goToPage: "صفحہ کھولیں",
    loading: "لوڈ ہورہا ہے…",
    notFound: "یہ آیت نہیں مل سکی۔",
    pageCouldNotLoad: "یہ صفحہ نہیں کھل سکا۔",
    allEditions: "قرآن کے تمام ایڈیشنز",
    matchingFontForWord: "Word کے لیے متعلقہ فونٹ",
    qalamCredit: "متن: احمد گراف کا انڈو پاک قرآنی متن، نسخہ 1.0 · فونٹ: Muhammadi Quranic۔",
    digitalCredit: "متن: DigitalKhatt انڈو پاک · فونٹ: DigitalKhatt۔",
    madinahCredit: "مصحف مدینہ: KFGQPC · لے آؤٹ: QUL · QCF V2 کے صفحہ وار فونٹس Quran Foundation CDN سے۔",
  },
} as const;
