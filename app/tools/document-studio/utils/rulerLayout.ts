// Word-like Professional Editing Layer — Phase 1 (2026-08-09). Visual
// Ruler: pure geometry calculations only, no editor state, no
// formatting attributes, no dragging. The ruler is a read-only visual
// guide reflecting the SAME page geometry the DOCX export actually
// produces — nothing here changes editor behavior or document data.
//
// PAGE_WIDTH_TWIPS/PAGE_MARGIN_TWIPS intentionally MATCH
// buildDocxDocument.ts's PAGE_SIZE_A4/PAGE_MARGIN constants exactly
// (A4 = 210mm × 297mm ≈ 11906 × 16838 twips; 1-inch margins = 1440
// twips), kept as independent constants here rather than imported —
// buildDocxDocument.ts is explicitly out of scope to touch this phase,
// and duplicating a handful of fixed, well-known page-geometry numbers
// is a far smaller risk than adding an import dependency on a frozen,
// stable export file.

export const TWIPS_PER_INCH = 1440;
export const PAGE_WIDTH_TWIPS = 11906; // A4 width, twips (matches buildDocxDocument.ts's PAGE_SIZE_A4.width)
export const PAGE_HEIGHT_TWIPS = 16838; // A4 height, twips (matches buildDocxDocument.ts's PAGE_SIZE_A4.height)
export const PAGE_MARGIN_TWIPS = 1440; // 1 inch, all sides (matches buildDocxDocument.ts's PAGE_MARGIN)

export interface RulerMetrics {
  /** Pixels per twip, at the given container width. Zero for a degenerate (non-positive) input. */
  scale: number;
  pageWidthPx: number;
  marginWidthPx: number;
  /** The printable area between the two margins. */
  textAreaWidthPx: number;
}

/**
 * Pure — computes how an A4 page (and its margins) would be scaled to
 * fit a given container width in pixels. Degenerate inputs (zero or
 * negative width) return an all-zero metrics object rather than
 * producing NaN/Infinity, so a not-yet-measured container never renders
 * a broken ruler.
 */
export function calculateRulerMetrics(
  containerWidthPx: number,
  pageWidthTwips: number = PAGE_WIDTH_TWIPS,
  marginTwips: number = PAGE_MARGIN_TWIPS
): RulerMetrics {
  if (containerWidthPx <= 0 || pageWidthTwips <= 0) {
    return { scale: 0, pageWidthPx: 0, marginWidthPx: 0, textAreaWidthPx: 0 };
  }
  const scale = containerWidthPx / pageWidthTwips;
  const marginWidthPx = marginTwips * scale;
  return {
    scale,
    pageWidthPx: containerWidthPx,
    marginWidthPx,
    textAreaWidthPx: Math.max(0, containerWidthPx - marginWidthPx * 2),
  };
}

export type RulerDirection = "ltr" | "rtl";

export interface RulerMarginOffsets {
  /** Pixel offset from the ruler's LEFT edge to where the text/margin "start" (writing start) marker sits. */
  startOffsetPx: number;
  /** Pixel offset from the ruler's LEFT edge to where the "end" marker sits. */
  endOffsetPx: number;
}

/**
 * Pure — resolves LOGICAL margin positions ("where writing starts/ends")
 * into VISUAL pixel offsets from the ruler's left edge, based on reading
 * direction. For LTR, "start" is the left margin; for RTL, "start" is
 * the right margin — this is what makes the ruler direction-aware,
 * independent of calculateRulerMetrics (which only computes sizes, not
 * direction).
 */
export function resolveVisualMarginOffsets(metrics: RulerMetrics, dir: RulerDirection): RulerMarginOffsets {
  if (dir === "ltr") {
    return { startOffsetPx: metrics.marginWidthPx, endOffsetPx: metrics.pageWidthPx - metrics.marginWidthPx };
  }
  return { startOffsetPx: metrics.pageWidthPx - metrics.marginWidthPx, endOffsetPx: metrics.marginWidthPx };
}

/**
 * Pure — converts a twips measurement to inches, for ruler tick labels
 * (e.g. "1 in" markers along the ruler).
 */
export function twipsToInches(twips: number): number {
  return twips / TWIPS_PER_INCH;
}

/**
 * Pure — generates evenly-spaced tick positions (in pixels from the
 * ruler's left edge) at each whole-inch mark across the page width, for
 * rendering ruler gradations. Returns an empty array for a degenerate
 * (zero-scale) metrics object rather than dividing by zero.
 */
export function calculateInchTickPositions(metrics: RulerMetrics): number[] {
  if (metrics.scale <= 0) return [];
  const inchWidthPx = TWIPS_PER_INCH * metrics.scale;
  const tickCount = Math.floor(metrics.pageWidthPx / inchWidthPx);
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(i * inchWidthPx);
  }
  return ticks;
}
