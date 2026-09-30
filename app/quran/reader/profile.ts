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
 * Selected for superior web rendering and mark positioning compared to Asif.
 */

export const QURAN_LAYOUT_PROFILE = {
  /**
   * Reader profile identifier.
   */
  id: "qalam-indopak-v1",

  /**
   * Production Quran font.
   * UPDATED: Muhammadi Quranic (Primary Choice)
   * Reason: Better OpenType support for web browsers compared to Asif.
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
   * Optimized for Muhammadi/Al Qalam fonts.
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
 * Priority Order (UPDATED):
 * 1. Muhammadi Quranic (Primary - Best Web Rendering)
 * 2. Al Qalam Quran Majeed (Fallback 1 - Excellent Alternative)
 * 3. Asif Quranic (Fallback 2 - Desktop preferred)
 * 4. System Fonts
 *
 * The fallback order ensures readability even if the primary font fails to load.
 */
export const QURAN_FONT_STACK =
  '"Muhammadi Quranic", "Al Qalam Quran Majeed", "Asif Quranic", var(--font-naskh), "Noto Naskh Arabic", var(--font-amiri), Amiri, serif';
