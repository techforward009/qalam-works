/**
 * One layout profile. Page breaks come from these constants, not from the
 * viewport and not from a 604- or 548-page mushaf.
 *
 * PRIMARY FONT: "Al Qalam Quran Majeed"
 * This modern font provides correct OpenType positioning for complex Quranic 
 * marks (U+06D7, U+06E4, U+06ED, etc.) solving previous rendering overlaps.
 *
 * FALLBACK STACK:
 * 1. Muhammadi Quranic
 * 2. Asif Quranic
 * 3. System Naskh fonts
 *
 * PDMS Saleem is retained only as a local/reference face and is not bundled.
 * Page geometry values are stable; minor visual tweaks may follow final review.
 */
export const QURAN_LAYOUT_PROFILE = {
  id: "qalam-indopak-v1",
  productionFont: "Al Qalam Quran Majeed",
  referenceFont: "PDMS Saleem Quran",
  pdmsBundled: false,
  pageWidthPx: 760,
  pageMinHeightPx: 980,
  textAreaWidthPx: 640,
  fontSizePx: 28,
  lineHeight: 2.35,
  unitsPerLine: 42,
  linesPerPage: 15,
  surahHeaderLines: 2,
  bismillahLines: 2,
} as const;

/**
 * Font Stack Priority:
 * 1. Al Qalam Quran Majeed (Primary - Best OpenType support)
 * 2. Muhammadi Quranic (Fallback 1)
 * 3. Asif Quranic (Fallback 2)
 * 4. System Web Fonts (Noto, Amiri, etc.)
 */
export const QURAN_FONT_STACK =
  '"Al Qalam Quran Majeed", "Muhammadi Quranic", "Asif Quranic", var(--font-naskh), "Noto Naskh Arabic", var(--font-amiri), Amiri, serif';
