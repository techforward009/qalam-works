// Visual Ruler: pure geometry calculations only, read-only, no dragging.
// Geometry comes from pageLayout.ts's ResolvedPageLayout (same source
// PDF/DOCX use) instead of fixed A4 constants, so the ruler correctly
// reflects A4/A5/Letter, portrait/landscape, and asymmetric margins.

import { mmToTwips, resolvePhysicalMargins, type ResolvedPageLayout } from "./pageLayout";

export const TWIPS_PER_INCH = 1440;

export interface RulerMetrics {
  /** Pixels per twip, at the given container width. Zero for a degenerate (non-positive) input. */
  scale: number;
  pageWidthPx: number;
  leftMarginPx: number;
  rightMarginPx: number;
  /** The printable area between the two margins. */
  textAreaWidthPx: number;
}

export type RulerDirection = "ltr" | "rtl";

/**
 * Pure — computes how a page (from resolved layout + direction) scales
 * to a given container width. Supports asymmetric left/right margins.
 * Degenerate inputs return an all-zero metrics object.
 */
export function calculateRulerMetrics(
  containerWidthPx: number,
  layout: ResolvedPageLayout,
  dir: RulerDirection
): RulerMetrics {
  const pageWidthTwips = mmToTwips(layout.widthMm);
  if (containerWidthPx <= 0 || pageWidthTwips <= 0) {
    return { scale: 0, pageWidthPx: 0, leftMarginPx: 0, rightMarginPx: 0, textAreaWidthPx: 0 };
  }
  const physical = resolvePhysicalMargins(layout.margins, dir);
  const scale = containerWidthPx / pageWidthTwips;
  const leftMarginPx = mmToTwips(physical.leftMm) * scale;
  const rightMarginPx = mmToTwips(physical.rightMm) * scale;
  return {
    scale,
    pageWidthPx: containerWidthPx,
    leftMarginPx,
    rightMarginPx,
    textAreaWidthPx: Math.max(0, containerWidthPx - leftMarginPx - rightMarginPx),
  };
}

export interface RulerMarginOffsets {
  /** Pixel offset from the ruler's LEFT edge to where the text/margin "start" (writing start) marker sits. */
  startOffsetPx: number;
  /** Pixel offset from the ruler's LEFT edge to where the "end" marker sits. */
  endOffsetPx: number;
}

/**
 * Pure — resolves LOGICAL margin positions ("where writing starts/ends")
 * into VISUAL pixel offsets from the ruler's left edge. For LTR, "start"
 * is the left margin; for RTL, "start" is the right margin.
 */
export function resolveVisualMarginOffsets(metrics: RulerMetrics, dir: RulerDirection): RulerMarginOffsets {
  if (dir === "ltr") {
    return { startOffsetPx: metrics.leftMarginPx, endOffsetPx: metrics.pageWidthPx - metrics.rightMarginPx };
  }
  return { startOffsetPx: metrics.pageWidthPx - metrics.rightMarginPx, endOffsetPx: metrics.leftMarginPx };
}

/**
 * Pure — converts a twips measurement to inches, for ruler tick labels.
 */
export function twipsToInches(twips: number): number {
  return twips / TWIPS_PER_INCH;
}

/**
 * Pure — generates evenly-spaced tick positions (in pixels from the
 * ruler's left edge) at each whole-inch mark across the page width.
 * Returns an empty array for a degenerate (zero-scale) metrics object.
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
