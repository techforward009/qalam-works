/**
 * Qalam Works — Quran Reader Layout Profile
 *
 * Rendering model:
 * - Quran page numbers and ayah boundaries are fixed by Tanzil metadata.
 * - Page WIDTH is fixed for a stable reading column.
 * - Page HEIGHT is intentionally flexible and follows the amount of text
 *   contained on that page.
 *
 * IMPORTANT:
 * This profile controls presentation only.
 * It does not alter Quran text, normalization, search keys, or the source
 * Quran corpus.
 *
 * CURRENT FONT SELECTION: Muhammadi Quranic
 * Asif Quranic and Al Qalam Quran Majeed are not loaded.
 */

export const QURAN_LAYOUT_PROFILE = {
  /**
   * Reader profile identifier.
   */
  id: "qalam-indopak-v1",

  /**
   * Production Quran font: Muhammadi Quranic.
   * Asif Quranic and Al Qalam Quran Majeed are not used.
   */
  productionFont: "Muhammadi Quranic",

  /**
   * Reference-only font placeholder.
   * Kept for compatibility with existing code checks (model.ts, tests).
   * PDMS Saleem is NOT bundled.
   */
  referenceFont: "PDMS Saleem Quran", // Placeholder to prevent build errors
  pdmsBundled: false,                 // Explicitly false

  /**
   * Fixed reading-surface width.
   */
  pageWidthPx: 770,

  /**
   * Page height is content-driven.
   * Set to 0 to allow flexible height based on text content.
   */
  pageMinHeightPx: 0,

  /**
   * Maximum usable Quran text width inside the decorative frame.
   */
  textAreaWidthPx: 650,

  /**
   * Base Quran font size.
   */
  fontSizePx: 28,

  /**
   * Quran line rhythm.
   * Optimized for Muhammadi Quranic.
   */
  lineHeight: 2.2,

  /**
   * Retained for compatibility. No longer determines strict page breaks.
   */
  unitsPerLine: 42,
  linesPerPage: 15,

  /**
   * Retained as metadata.
   */
  surahHeaderLines: 2,
  bismillahLines: 2,
} as const;

/**
 * Quran Font Stack
 *
 * Quran text uses Muhammadi Quranic, then the bundled Naskh and Amiri faces.
 */
export const QURAN_FONT_STACK =
  '"Muhammadi Quranic", var(--font-naskh), "Noto Naskh Arabic", var(--font-amiri), Amiri, serif';
