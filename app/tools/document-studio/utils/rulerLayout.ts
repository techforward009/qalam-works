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

export type RulerTickKind = "major" | "minor";

export interface RulerTick {
  offsetPx: number;
  kind: RulerTickKind;
  label?: string;
}

export type RulerUnit = "cm" | "in";

export function rulerUnitForPage(size: ResolvedPageLayout["size"]): RulerUnit {
  return size === "letter" ? "in" : "cm";
}

/** Physical ticks from the page origin (left/top). Never mirrored for RTL. */
export function calculateRulerTicks(lengthPx: number, lengthMm: number, unit: RulerUnit): RulerTick[] {
  if (!(lengthPx > 0) || !(lengthMm > 0)) return [];
  const pxPerMm = lengthPx / lengthMm;
  const ticks: RulerTick[] = [];
  if (unit === "in") {
    const pxPerInch = pxPerMm * 25.4;
    const eighths = Math.floor((lengthMm / 25.4) * 8 + 0.01);
    for (let i = 0; i <= eighths; i++) {
      const offsetPx = (i / 8) * pxPerInch;
      if (offsetPx > lengthPx + 0.5) break;
      const major = i % 8 === 0;
      ticks.push({
        offsetPx,
        kind: major ? "major" : "minor",
        label: major ? String(i / 8) : undefined,
      });
    }
    return ticks;
  }
  const steps = Math.floor(lengthMm / 5 + 0.01);
  for (let i = 0; i <= steps; i++) {
    const mm = i * 5;
    const offsetPx = mm * pxPerMm;
    if (offsetPx > lengthPx + 0.5) break;
    const major = mm % 10 === 0;
    ticks.push({
      offsetPx,
      kind: major ? "major" : "minor",
      label: major ? String(mm / 10) : undefined,
    });
  }
  return ticks;
}

export interface VerticalRulerMetrics {
  scale: number;
  pageHeightPx: number;
  topMarginPx: number;
  bottomMarginPx: number;
  textAreaHeightPx: number;
}

export function calculateVerticalRulerMetrics(
  containerHeightPx: number,
  layout: ResolvedPageLayout,
): VerticalRulerMetrics {
  const pageHeightTwips = mmToTwips(layout.heightMm);
  if (containerHeightPx <= 0 || pageHeightTwips <= 0) {
    return { scale: 0, pageHeightPx: 0, topMarginPx: 0, bottomMarginPx: 0, textAreaHeightPx: 0 };
  }
  const scale = containerHeightPx / pageHeightTwips;
  const topMarginPx = mmToTwips(layout.margins.topMm) * scale;
  const bottomMarginPx = mmToTwips(layout.margins.bottomMm) * scale;
  return {
    scale,
    pageHeightPx: containerHeightPx,
    topMarginPx,
    bottomMarginPx,
    textAreaHeightPx: Math.max(0, containerHeightPx - topMarginPx - bottomMarginPx),
  };
}

/** Convert a pointer offset along a displayed ruler into millimetres of the physical page. */
export function pointerOffsetToMm(offsetPx: number, lengthPx: number, pageMm: number): number {
  if (!(lengthPx > 0) || !(pageMm > 0) || !Number.isFinite(offsetPx)) return 0;
  return (offsetPx / lengthPx) * pageMm;
}

export function marginMmFromPointer(args: {
  client: number;
  origin: number;
  lengthPx: number;
  pageMm: number;
  fromEnd?: boolean;
}): number {
  const offset = args.fromEnd ? args.origin + args.lengthPx - args.client : args.client - args.origin;
  return pointerOffsetToMm(offset, args.lengthPx, args.pageMm);
}
