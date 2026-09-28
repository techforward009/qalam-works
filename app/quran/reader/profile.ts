/**
 * One layout profile. Page breaks come from these constants, not from the
 * viewport and not from a 604- or 548-page mushaf.
 * PDMS Saleem is a local reference face only. It is not bundled.
 * Production text uses Noto Naskh Arabic, already licensed in this app.
 * Amiri leaves the Indo-Pak end-of-ayah sign unenclosed, so it is only a fallback.
 */
export const QURAN_LAYOUT_PROFILE = {
  id: "qalam-indopak-v1",
  productionFont: "Noto Naskh Arabic",
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

export const QURAN_FONT_STACK =
  '"PDMS Saleem Quran", var(--font-naskh), "Noto Naskh Arabic", var(--font-amiri), Amiri, serif';
