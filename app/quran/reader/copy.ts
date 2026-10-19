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
    qalamCredit: "Text: DigitalKhatt IndoPak (MIT; risan/quran-json CC BY-SA 4.0) · Font: DigitalKhatt (OFL-1.1).",
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
    qalamCredit: "متن: ڈیجیٹل خط انڈو پاک (MIT؛ مجموعہ CC BY-SA 4.0) · فونٹ: ڈیجیٹل خط (OFL-1.1)۔",
    digitalCredit: "متن: DigitalKhatt انڈو پاک · فونٹ: DigitalKhatt۔",
    madinahCredit: "مصحف مدینہ: KFGQPC · لے آؤٹ: QUL · QCF V2 کے صفحہ وار فونٹس Quran Foundation CDN سے۔",
  },
} as const;
