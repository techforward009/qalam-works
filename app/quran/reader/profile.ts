/**
 * Qalam Works — Quran Reader Layout Profile
 *
 * Rendering-first profile:
 * - Quran source text remains unchanged.
 * - Page geometry is controlled here, not by viewport size.
 * - The layout is inspired by the reading surface proportions used by
 *   Tanzil's embedded Quran viewer.
 *
 * IMPORTANT:
 * This file controls presentation only.
 * It does not alter Quran text, normalization, search keys, or page source data.
 */
export const QURAN_LAYOUT_PROFILE = {
  id: "qalam-indopak-v1",

  /**
   * Production Quran font.
   *
   * The font is kept separate from the Quran source text because
   * Unicode text and OpenType rendering are independent layers.
   */
  productionFont: "Al Qalam Quran Majeed",

  /**
   * Reference-only font name.
   * PDMS Saleem is not bundled with the application.
   */
  referenceFont: "PDMS Saleem Quran",
  pdmsBundled: false,

  /**
   * Reading surface geometry.
   *
   * Tanzil documents a 770 × 1000 px embedded Quran surface.
   * We use the same outer proportions here as a visual reference,
   * while keeping Qalam's own synthetic page model intact.
   */
  pageWidthPx: 770,
  pageMinHeightPx: 1000,

  /**
   * Usable Quran text area.
   *
   * This remains narrower than the outer page so that the Arabic text
   * has comfortable side breathing room and a book-like reading column.
   */
  textAreaWidthPx: 650,

  /**
   * Base Quran font size.
   *
   * Scale controls in the reader may multiply this value.
   */
  fontSizePx: 28,

  /**
   * Vertical rhythm of Quran paragraphs.
   *
   * Slightly tighter than the previous 2.35 value to make the page
   * feel denser and closer to a traditional Quran reading surface.
   */
  lineHeight: 2.2,

  /**
   * Synthetic pagination controls.
   *
   * These values are intentionally unchanged for now because the
   * current task is visual refinement, not corpus/page migration.
   */
  unitsPerLine: 42,
  linesPerPage: 15,

  /**
   * Layout reservation values used by the page model.
   */
  surahHeaderLines: 2,
  bismillahLines: 2,
} as const;

/**
 * Quran Font Stack
 *
 * Priority:
 * 1. Al Qalam Quran Majeed
 * 2. Muhammadi Quranic
 * 3. Asif Quranic
 * 4. Project/system Arabic fonts
 *
 * The fallback order is intentionally retained so that a font-loading
 * problem does not leave the Quran unreadable.
 */
export const QURAN_FONT_STACK =
  '"Al Qalam Quran Majeed", "Muhammadi Quranic", "Asif Quranic", var(--font-naskh), "Noto Naskh Arabic", var(--font-amiri), Amiri, serif';
