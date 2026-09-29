/**
 * One layout profile. Page breaks come from these constants, not from the
 * viewport and not from a 604- or 548-page mushaf.
 *
 * The production Quran Reader now uses "Al Qalam Quran Majeed" as its primary web font.
 * This font provides correct OpenType positioning for Quranic marks (U+06D7, U+06E4, etc.).
 * "Al Majeed Quranic" is retained as a fallback.
 * PDMS Saleem is retained only as a local/reference face and is not bundled.
 *
 * Page geometry and pagination values are intentionally unchanged for now.
 * They will be re-evaluated after visual review with the production font.
 */
export const QURAN_LAYOUT_PROFILE = {
  id: "qalam-indopak-v1",
  productionFont: "Al Qalam Quran Majeed", // Updated to match new @font-face
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

// Updated Stack: New font first, then fallbacks
export const QURAN_FONT_STACK =
  '"Al Qalam Quran Majeed", "Al Majeed Quranic", var(--font-naskh), "Noto Naskh Arabic", var(--font-amiri), Amiri, serif';
