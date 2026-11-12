import { SURAH_NAMES } from "./metadata";

/** English transliteration aliases aligned by index with the existing Arabic Surah names. */
export const SURAH_ENGLISH_NAMES = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
  "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah",
  "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat",
  "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
] as const;

if (SURAH_ENGLISH_NAMES.length !== SURAH_NAMES.length) {
  throw new Error("English Surah search aliases must align with SURAH_NAMES");
}

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/gu, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

export function normalizeSurahQuery(value: string): string {
  return normalizeDigits(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/gu, "")
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/[يى]/gu, "ی")
    .replace(/ك/gu, "ک")
    .replace(/[ةه]/gu, "ہ")
    .trim();
}

export function findSurahNumbers(query: string): number[] {
  const needle = normalizeSurahQuery(query);
  if (!needle) return SURAH_NAMES.map((_, index) => index + 1);
  if (/^\d+$/u.test(needle)) {
    const exactNumber = needle.replace(/^0+(?=\d)/u, "");
    return SURAH_NAMES.flatMap((_, index) => String(index + 1) === exactNumber ? [index + 1] : []);
  }
  return SURAH_NAMES.flatMap((arabicName, index) => {
    const englishName = SURAH_ENGLISH_NAMES[index] ?? "";
    const number = String(index + 1);
    return normalizeSurahQuery(arabicName).includes(needle) ||
      normalizeSurahQuery(englishName).includes(needle) ||
      number.includes(needle)
      ? [index + 1]
      : [];
  });
}
