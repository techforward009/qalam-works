/**
 * Presentation-only Quran reader rules. The corpus and original Surah banner
 * metadata remain untouched; only the displayed title omits vowel marks.
 */
export function displaySurahBannerName(name: string): string {
  return name.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/gu, "");
}

/** Respect a reader's explicit saved selection before choosing the mobile default. */
export function initialQuranDisplayScale(
  stored: string | null,
  isMobile: boolean,
): number {
  const selected = stored === null ? NaN : Number(stored);
  return selected === 0.85 || selected === 1 || selected === 1.12
    ? selected
    : isMobile ? 0.85 : 1;
}
