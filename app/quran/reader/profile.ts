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
 * CURRENT FONT SELECTION: DigitalKhatt IndoPak
 * Selected for superior web rendering and mark positioning compared to Asif.
 */

export const QURAN_LAYOUT_PROFILE = {
  /**
   * Reader profile identifier.
   */
  id: "qalam-indopak-v1",

  /**
   * Production Quran font.
   * UPDATED: DigitalKhatt IndoPak (OFL-1.1)
   * Uses the DigitalKhatt IndoPak script's matching open font.
   */
  productionFont: "DigitalKhattIndoPak",

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
   * DigitalKhatt IndoPak typography.
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
 * 1. DigitalKhatt IndoPak (local OFL-1.1 font)
 * 2. Local Digital Khatt regular and standard Naskh fallbacks.
 * Never load a restricted public Muhammadi asset.
 */
export const QURAN_FONT_STACK =
  '"DigitalKhatt Indo-Pak", "Digital Khatt IndoPak Book", "Noto Naskh Arabic", serif';
