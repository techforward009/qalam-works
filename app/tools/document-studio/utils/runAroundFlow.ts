import { resolvedRunAroundClearance } from "./runAround";

/** Page-pixel width below which a side of a box is too narrow to hold story text. */
export const RUN_AROUND_MIN_SEGMENT_PX = 8;
const PX_PER_MM = 96 / 25.4;

export interface RunAroundRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type RunAroundSide = "left" | "right" | "full";

export interface RunAroundSegment {
  left: number;
  right: number;
  side: RunAroundSide;
}

export interface SplitLine {
  /** Free pieces of the line, left to right. Empty when `skip` is set. */
  segments: RunAroundSegment[];
  /** The band overlaps an exclusion and neither side is wide enough. */
  skip: boolean;
}

export interface RunAroundPiece {
  from: number;
  to: number;
  left: number;
  right: number;
  side: RunAroundSide;
  /** Hole inserted after this piece, before the next piece on the same line. */
  gapAfter: number;
}

export interface RtlLineLayout {
  skip: boolean;
  /** Where skipped text should resume. Null when the band is used. */
  skipBottom: number | null;
  /** Pieces in RTL reading order: the right side, then the left side. */
  pieces: RunAroundPiece[];
  /** First glyph index that did not fit on this line. */
  next: number;
  /** Spacer before the first piece so a left-only run starts beside the box. */
  leadingGap: number;
}

/** Object-box fields the screen wrap needs. Rectangular boxes only. */
export interface RunAroundBox {
  page: number;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  kind: string;
  textShape?: string;
  angle1Deg?: number;
  runAround?: boolean;
  runAroundLeftMm?: number;
  runAroundRightMm?: number;
  runAroundTopMm?: number;
  runAroundBottomMm?: number;
}

function finite(value: number): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

/** Axis-aligned rectangles only. Ellipses, rounded boxes, lines, and rotated boxes stay unwrapped. */
export function isRectangularRunAroundBox(frame: Pick<RunAroundBox, "kind" | "textShape" | "angle1Deg">): boolean {
  if (frame.angle1Deg !== undefined && Math.abs(frame.angle1Deg) > 1e-9) return false;
  if (frame.kind === "text") return frame.textShape !== "ellipse";
  return frame.kind === "rect" || frame.kind === "picture-rect";
}

/** Box expanded by its clearances, in page millimetres. Unchecked and non-rectangles return null. */
export function runAroundExclusionMm(frame: RunAroundBox): (RunAroundRect & { page: number }) | null {
  if (frame.runAround !== true || !isRectangularRunAroundBox(frame)) return null;
  if (![frame.page, frame.xMm, frame.yMm, frame.wMm, frame.hMm].every(finite)) return null;
  if (!(frame.wMm > 0) || !(frame.hMm > 0)) return null;
  const clearance = resolvedRunAroundClearance(frame);
  return {
    page: frame.page,
    left: frame.xMm - clearance.leftMm,
    right: frame.xMm + frame.wMm + clearance.rightMm,
    top: frame.yMm - clearance.topMm,
    bottom: frame.yMm + frame.hMm + clearance.bottomMm,
  };
}

/** Same exclusion in unscaled page pixels, stacked by `pageStridePx`. */
export function runAroundExclusionPx(frame: RunAroundBox, pageStridePx: number): RunAroundRect | null {
  const mm = runAroundExclusionMm(frame);
  if (!mm || !finite(pageStridePx)) return null;
  const px = (value: number) => value * PX_PER_MM;
  const origin = (mm.page - 1) * pageStridePx;
  return {
    left: px(mm.left),
    right: px(mm.right),
    top: origin + px(mm.top),
    bottom: origin + px(mm.bottom),
  };
}

function verticalOverlap(a: RunAroundRect, b: RunAroundRect): boolean {
  return a.top < b.bottom && b.top < a.bottom;
}

function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  const sorted = intervals.filter(([start, end]) => end - start > 1e-6).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1e-6) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

function segmentSide(left: number, right: number, blocked: Array<[number, number]>): RunAroundSide {
  if (!blocked.length) return "full";
  // A segment whose left edge meets an obstacle sits on that obstacle's right.
  if (blocked.some(([, end]) => Math.abs(left - end) <= 1e-4)) return "right";
  if (blocked.some(([start]) => Math.abs(right - start) <= 1e-4)) return "left";
  return "full";
}

/**
 * Split one story line around rectangular exclusions.
 * Usable free intervals become segments on the left and right of each box.
 * A band that overlaps a box but has no wide enough side is skipped.
 */
export function splitLineAroundExclusions(
  line: RunAroundRect,
  exclusions: readonly RunAroundRect[],
  minWidth = 0,
): SplitLine {
  if (!(line.right > line.left) || !(line.bottom > line.top)) return { segments: [], skip: false };
  const blocked = mergeIntervals(
    exclusions
      .filter(exclusion => verticalOverlap(line, exclusion))
      .map(exclusion => [Math.max(line.left, exclusion.left), Math.min(line.right, exclusion.right)] as [number, number]),
  );
  if (!blocked.length) return { segments: [{ left: line.left, right: line.right, side: "full" }], skip: false };
  const segments: RunAroundSegment[] = [];
  let cursor = line.left;
  for (const [start, end] of blocked) {
    if (start - cursor >= minWidth && start - cursor > 1e-6) {
      segments.push({ left: cursor, right: start, side: segmentSide(cursor, start, blocked) });
    }
    cursor = Math.max(cursor, end);
  }
  if (line.right - cursor >= minWidth && line.right - cursor > 1e-6) {
    segments.push({ left: cursor, right: line.right, side: segmentSide(cursor, line.right, blocked) });
  }
  if (!segments.length) return { segments: [], skip: true };
  return { segments, skip: false };
}

/** How far to push text when this band cannot hold a segment. */
export function runAroundSkipBottom(line: RunAroundRect, exclusions: readonly RunAroundRect[], minWidth = 0): number {
  const height = Math.max(0, line.bottom - line.top);
  const bottoms = exclusions
    .filter(exclusion => verticalOverlap(line, exclusion))
    .map(exclusion => exclusion.bottom)
    .filter(bottom => bottom > line.top + 1e-6)
    .sort((a, b) => a - b);
  for (const bottom of bottoms) {
    const next = { ...line, top: bottom, bottom: bottom + height };
    if (!splitLineAroundExclusions(next, exclusions, minWidth).skip) return bottom;
  }
  return bottoms.length ? bottoms[bottoms.length - 1] : line.bottom;
}

function placeGlyphs(
  widths: readonly number[],
  segments: readonly RunAroundSegment[],
  start: number,
): { pieces: RunAroundPiece[]; next: number } {
  const ordered = [...segments].sort((a, b) => b.right - a.right || b.left - a.left);
  const pieces: RunAroundPiece[] = [];
  let index = start;
  for (const segment of ordered) {
    if (index >= widths.length) break;
    const capacity = segment.right - segment.left;
    const from = index;
    let used = 0;
    while (index < widths.length && used + widths[index] <= capacity + 1e-6) {
      used += widths[index];
      index += 1;
    }
    if (index === from) continue;
    pieces.push({ from, to: index, left: segment.left, right: segment.right, side: segment.side, gapAfter: 0 });
  }
  // A glyph wider than every side still has to move, or the line would never advance.
  if (!pieces.length && index === start && start < widths.length && ordered.length) {
    let widest = ordered[0];
    for (const segment of ordered) if (segment.right - segment.left > widest.right - widest.left) widest = segment;
    pieces.push({ from: start, to: start + 1, left: widest.left, right: widest.right, side: widest.side, gapAfter: 0 });
    index = start + 1;
  }
  for (let i = 0; i < pieces.length - 1; i++) pieces[i].gapAfter = Math.max(0, pieces[i].left - pieces[i + 1].right);
  return { pieces, next: index };
}

/**
 * Place RTL glyph advances on one line.
 * The right side is filled first, then the left side of the same line.
 * `start` is an index into `glyphWidths`.
 */
export function layoutRtlLineAroundExclusions(
  line: RunAroundRect,
  glyphWidths: readonly number[],
  exclusions: readonly RunAroundRect[],
  minWidth = 0,
  start = 0,
): RtlLineLayout {
  const split = splitLineAroundExclusions(line, exclusions, minWidth);
  if (split.skip) {
    return {
      skip: true,
      skipBottom: runAroundSkipBottom(line, exclusions, minWidth),
      pieces: [],
      next: start,
      leadingGap: 0,
    };
  }
  const placed = placeGlyphs(glyphWidths, split.segments, start);
  const first = placed.pieces[0];
  return {
    skip: false,
    skipBottom: null,
    pieces: placed.pieces,
    next: placed.next,
    leadingGap: first ? Math.max(0, line.right - first.right) : 0,
  };
}
