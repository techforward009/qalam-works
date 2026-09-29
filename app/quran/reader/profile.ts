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
 */

export const QURAN_LAYOUT_PROFILE = {
  /**
   * Reader profile identifier.
   */
  id: "qalam-indopak-v1",

  /**
   * Production Quran font.
   */
  productionFont: "Al Qalam Quran Majeed",

  /**
   * Reference-only font.
   * PDMS Saleem is not bundled with the application.
   */
  referenceFont: "PDMS Saleem Quran",
  pdmsBundled: false,

  /**
   * Fixed reading-surface width.
   *
   * 770px is retained as the desktop reference width used by the
   * Tanzil-style reader layout.
   */
  pageWidthPx: 770,

  /**
   * IMPORTANT:
   *
   * Page height is now content-driven.
   *
   * QuranReader.tsx still reads this property and applies it as
   * minHeight, therefore zero is used rather than removing the property
   * entirely. This prevents an old fixed-height assumption from forcing
   * every page to 1000px.
   */
  pageMinHeightPx: 0,

  /**
   * Maximum usable Quran text width inside the decorative frame.
   *
   * The browser will still determine the actual line wrapping.
   */
  textAreaWidthPx: 650,

  /**
   * Base Quran font size.
   *
   * Reader scale controls may multiply this value.
   */
  fontSizePx: 28,

  /**
   * Quran line rhythm.
   *
   * This remains comfortable for Arabic reading while allowing the
   * content-driven page height to remain compact on short pages.
   */
  lineHeight: 2.2,

  /**
   * Retained for compatibility with the older layout model and tests.
   *
   * These values no longer determine page breaks.
   * Fixed page boundaries now come from TANZIL_PAGE_STARTS.
   */
  unitsPerLine: 42,
  linesPerPage: 15,

  /**
   * Retained as metadata for layout consumers.
   *
   * These values no longer control pagination because page boundaries
   * are fixed by the Tanzil page map.
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
 * The fallback order is intentionally retained so that a temporary
 * font-loading problem does not make the Quran unreadable.
 */
export const QURAN_FONT_STACK =
  '"Al Qalam Quran Majeed", "Muhammadi Quranic", "Asif Quranic", var(--font-naskh), "Noto Naskh Arabic", var(--font-amiri), Amiri, serif';
