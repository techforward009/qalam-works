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
   * Indicates Indo-Pak script layout version 1.
   */
  id: "qalam-indopak-v1",

  /**
   * Production Quran font.
   * CURRENTLY TESTING: Asif Quranic
   * Fallbacks: Muhammadi Quranic, Al Qalam Quran Majeed
   */
  productionFont: "Asif Quranic",

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
   * every page to a specific pixel height.
   */
  pageMinHeightPx: 0,

  /**
   * Maximum usable Quran text width inside the decorative frame.
   *
   * The browser will still determine the actual line wrapping based on
   * the font metrics, but this serves as a layout guide.
   */
  textAreaWidthPx: 650,

  /**
   * Base Quran font size.
   *
   * Reader scale controls (e.g., 0.85x, 1.2x) will multiply this value.
   */
  fontSizePx: 28,

  /**
   * Quran line rhythm.
   *
   * Optimized for Asif/Muhammadi/Al Qalam fonts to prevent mark collision
   * while maintaining a compact, readable flow.
   */
  lineHeight: 2.2,

  /**
   * Retained for compatibility with the older layout model and tests.
   *
   * These values no longer strictly determine page breaks in the new
   * flexible height model, but serve as a reference for expected density.
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
 * Priority Order (CURRENT TEST):
 * 1. Asif Quranic (Primary - Currently Testing)
 * 2. Muhammadi Quranic (Fallback 1)
 * 3. Al Qalam Quran Majeed (Fallback 2)
 * 4. Project/System Arabic fonts (Noto, Amiri, etc.)
 *
 * To switch back to Al Qalam later, simply move "Al Qalam Quran Majeed" 
 * to the front of this string.
 */
export const QURAN_FONT_STACK =
  '"Asif Quranic", "Muhammadi Quranic", "Al Qalam Quran Majeed", var(--font-naskh), "Noto Naskh Arabic", var(--font-amiri), Amiri, serif';
