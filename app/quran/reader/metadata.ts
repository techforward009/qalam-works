/** Display names only. Not Quran text and not a second corpus. */
export const SURAH_NAMES = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
  "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
  "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
  "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
  "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
  "المسد", "الإخلاص", "الفلق", "الناس",
] as const;

const JUZ_ORDINALS = [
  "",
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
  "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر", "الثامن عشر", "التاسع عشر", "العشرون",
  "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون", "الرابع والعشرون", "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون", "التاسع والعشرون", "الثلاثون",
] as const;

/** Hafs juz starts, checked against this corpus's opening words. Not page-derived. */
export const JUZ_STARTS: readonly { juz: number; surah: number; ayah: number }[] = [
  { juz: 1, surah: 1, ayah: 1 },
  { juz: 2, surah: 2, ayah: 142 },
  { juz: 3, surah: 2, ayah: 253 },
  { juz: 4, surah: 3, ayah: 92 },
  { juz: 5, surah: 4, ayah: 24 },
  { juz: 6, surah: 4, ayah: 148 },
  { juz: 7, surah: 5, ayah: 82 },
  { juz: 8, surah: 6, ayah: 111 },
  { juz: 9, surah: 7, ayah: 88 },
  { juz: 10, surah: 8, ayah: 41 },
  { juz: 11, surah: 9, ayah: 93 },
  { juz: 12, surah: 11, ayah: 6 },
  { juz: 13, surah: 12, ayah: 53 },
  { juz: 14, surah: 15, ayah: 1 },
  { juz: 15, surah: 17, ayah: 1 },
  { juz: 16, surah: 18, ayah: 75 },
  { juz: 17, surah: 21, ayah: 1 },
  { juz: 18, surah: 23, ayah: 1 },
  { juz: 19, surah: 25, ayah: 21 },
  { juz: 20, surah: 27, ayah: 56 },
  { juz: 21, surah: 29, ayah: 46 },
  { juz: 22, surah: 33, ayah: 31 },
  { juz: 23, surah: 36, ayah: 28 },
  { juz: 24, surah: 39, ayah: 32 },
  { juz: 25, surah: 41, ayah: 47 },
  { juz: 26, surah: 46, ayah: 1 },
  { juz: 27, surah: 51, ayah: 31 },
  { juz: 28, surah: 58, ayah: 1 },
  { juz: 29, surah: 67, ayah: 1 },
  { juz: 30, surah: 78, ayah: 1 },
];

/** Traditional Indo-Pak running heads. Display only; not Quran text. */
const JUZ_RUBRICS = [
  "",
  "الم",
  "سيقول",
  "تلك الرسل",
  "لن تنالوا",
  "والمحصنات",
  "لا يحب الله",
  "وإذا سمعوا",
  "ولو أننا",
  "قال الملأ",
  "واعلموا",
  "يعتذرون",
  "وما من دابة",
  "وما أبرئ",
  "ربما",
  "سبحان",
  "قال ألم",
  "اقترب",
  "قد أفلح",
  "وقال الذين",
  "أمن خلق",
  "اتل ما أوحي",
  "ومن يقنت",
  "وما لي",
  "فمن أظلم",
  "إليه يرد",
  "حم",
  "قال فما خطبكم",
  "قد سمع",
  "تبارك",
  "عم",
] as const;

export function surahTitle(surah: number): string {
  const name = SURAH_NAMES[surah - 1] ?? "";
  return name ? `سورة ${name}` : "";
}

export function juzTitle(juz: number): string {
  return `الجزء ${JUZ_ORDINALS[juz] ?? ""}`.trim();
}

/** Taj-style left head: surah name plus its number. */
export function surahRunningHead(surah: number): string {
  const name = SURAH_NAMES[surah - 1] ?? "";
  return name ? `${name}\u00a0${easternDigits(surah)}` : "";
}

/** Taj-style right head: the juz's traditional name plus its number. */
export function juzRunningHead(juz: number): string {
  const name = JUZ_RUBRICS[juz] ?? "";
  return name ? `${name}\u00a0${easternDigits(juz)}` : "";
}

export function easternDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)] ?? digit);
}
