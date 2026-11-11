import { resolvedRunAroundClearance } from "./runAround";

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

interface FlowGlyph { pos: number; width: number }
interface FlowWidget { pos: number; kind: "gap" | "break" | "skip"; size: number; side: number }

/**
 * One function the PDF page can eval. Nested helpers stay in its source, so a
 * bundler cannot rewrite them into imports that do not exist in the browser.
 */
function runAroundEngineFactory() {
  const RUN_AROUND_MIN_SEGMENT_PX = 8;

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
    if (blocked.some(([, end]) => Math.abs(left - end) <= 1e-4)) return "right";
    if (blocked.some(([start]) => Math.abs(right - start) <= 1e-4)) return "left";
    return "full";
  }

  function isClusterExtender(code: number): boolean {
    if (code === 0x200c || code === 0x200d || code === 0x200b || code === 0x2060 || code === 0xfeff) return true;
    if (code >= 0xfe00 && code <= 0xfe0f) return true;
    if (code >= 0x0610 && code <= 0x061a) return true;
    if (code >= 0x064b && code <= 0x065f) return true;
    if (code === 0x0670) return true;
    if (code >= 0x06d6 && code <= 0x06dc) return true;
    if (code >= 0x06df && code <= 0x06e4) return true;
    if (code >= 0x06e7 && code <= 0x06e8) return true;
    if (code >= 0x06ea && code <= 0x06ed) return true;
    if (code >= 0x0300 && code <= 0x036f) return true;
    return false;
  }

  function graphemeEnd(text: string, index: number): number {
    if (index >= text.length) return text.length;
    const Segmenter = (Intl as { Segmenter?: new (locales?: string, options?: { granularity: "grapheme" }) => { segment: (input: string) => Iterable<{ segment: string }> } }).Segmenter;
    if (Segmenter) {
      const part = new Segmenter(undefined, { granularity: "grapheme" }).segment(text.slice(index))[Symbol.iterator]().next().value;
      const size = part?.segment.length ?? 1;
      return Math.min(text.length, index + Math.max(1, size));
    }
    let cursor = index + (text.codePointAt(index)! > 0xffff ? 2 : 1);
    while (cursor < text.length) {
      const code = text.codePointAt(cursor)!;
      if (code === 0x200d) {
        cursor += 1;
        if (cursor < text.length) cursor += text.codePointAt(cursor)! > 0xffff ? 2 : 1;
        continue;
      }
      if (!isClusterExtender(code)) break;
      cursor += code > 0xffff ? 2 : 1;
    }
    return cursor;
  }

  function splitLineAroundExclusions(line: RunAroundRect, exclusions: readonly RunAroundRect[], minWidth = 0): SplitLine {
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
      if (start - cursor >= minWidth && start - cursor > 1e-6) segments.push({ left: cursor, right: start, side: segmentSide(cursor, start, blocked) });
      cursor = Math.max(cursor, end);
    }
    if (line.right - cursor >= minWidth && line.right - cursor > 1e-6) segments.push({ left: cursor, right: line.right, side: segmentSide(cursor, line.right, blocked) });
    if (!segments.length) return { segments: [], skip: true };
    return { segments, skip: false };
  }

  function runAroundSkipBottom(line: RunAroundRect, exclusions: readonly RunAroundRect[], minWidth = 0): number {
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

  function placeGlyphs(widths: readonly number[], segments: readonly RunAroundSegment[], start: number, direction: "rtl" | "ltr"): { pieces: RunAroundPiece[]; next: number } {
    const ordered = direction === "ltr"
      ? [...segments].sort((a, b) => a.left - b.left || a.right - b.right)
      : [...segments].sort((a, b) => b.right - a.right || b.left - a.left);
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
    if (!pieces.length && index === start && start < widths.length && ordered.length) {
      let widest = ordered[0];
      for (const segment of ordered) if (segment.right - segment.left > widest.right - widest.left) widest = segment;
      pieces.push({ from: start, to: start + 1, left: widest.left, right: widest.right, side: widest.side, gapAfter: 0 });
      index = start + 1;
    }
    for (let i = 0; i < pieces.length - 1; i++) {
      pieces[i].gapAfter = direction === "ltr"
        ? Math.max(0, pieces[i + 1].left - pieces[i].right)
        : Math.max(0, pieces[i].left - pieces[i + 1].right);
    }
    return { pieces, next: index };
  }

  function layoutLineAroundExclusions(
    line: RunAroundRect,
    glyphWidths: readonly number[],
    exclusions: readonly RunAroundRect[],
    minWidth = 0,
    start = 0,
    direction: "rtl" | "ltr" = "rtl",
  ): RtlLineLayout {
    const split = splitLineAroundExclusions(line, exclusions, minWidth);
    if (split.skip) {
      return { skip: true, skipBottom: runAroundSkipBottom(line, exclusions, minWidth), pieces: [], next: start, leadingGap: 0 };
    }
    const placed = placeGlyphs(glyphWidths, split.segments, start, direction);
    const first = placed.pieces[0];
    const leadingGap = first
      ? direction === "ltr" ? Math.max(0, first.left - line.left) : Math.max(0, line.right - first.right)
      : 0;
    return { skip: false, skipBottom: null, pieces: placed.pieces, next: placed.next, leadingGap };
  }

  function planRunAroundWidgets(
    glyphs: readonly FlowGlyph[],
    overlapTop: number,
    lineHeight: number,
    edges: (firstLine: boolean) => { left: number; right: number },
    exclusions: readonly RunAroundRect[],
    direction: "rtl" | "ltr" = "rtl",
  ): FlowWidget[] {
    const widgets: FlowWidget[] = [];
    if (!glyphs.length || !(lineHeight > 0)) return widgets;
    const lowest = exclusions.reduce((max, exclusion) => Math.max(max, exclusion.bottom), Number.NEGATIVE_INFINITY);
    let index = 0;
    let y = overlapTop;
    let first = true;
    const widths = glyphs.map(glyph => glyph.width);
    for (let guard = 0; index < glyphs.length && guard < 400; guard += 1) {
      const edge = edges(first);
      first = false;
      const line = { left: edge.left, right: edge.right, top: y, bottom: y + lineHeight };
      const split = splitLineAroundExclusions(line, exclusions, RUN_AROUND_MIN_SEGMENT_PX);
      const hits = split.skip || split.segments.some(segment => segment.side !== "full");
      if (!hits) {
        if (!(y + lineHeight < lowest - 0.5)) break;
        const plain = layoutLineAroundExclusions(line, widths, [], 0, index, direction);
        if (plain.next === index) break;
        index = plain.next;
        y += lineHeight;
        if (index >= glyphs.length) break;
        widgets.push({ pos: glyphs[index].pos, kind: "break", size: 0, side: -2 });
        continue;
      }
      const layout = layoutLineAroundExclusions(line, widths, exclusions, RUN_AROUND_MIN_SEGMENT_PX, index, direction);
      if (layout.skip) {
        const bottom = layout.skipBottom ?? y + lineHeight;
        const height = Math.max(lineHeight, bottom - y);
        widgets.push({ pos: glyphs[index].pos, kind: "skip", size: height, side: -2 });
        if (!(height > 0.5) || !(y + height < lowest - 0.5)) break;
        y += height;
        continue;
      }
      if (!layout.pieces.length || layout.next === index) break;
      if (layout.leadingGap > 0.5) widgets.push({ pos: glyphs[layout.pieces[0].from].pos, kind: "gap", size: layout.leadingGap, side: -1 });
      for (const piece of layout.pieces) {
        if (piece.gapAfter > 0.5 && piece.to < glyphs.length) widgets.push({ pos: glyphs[piece.to].pos, kind: "gap", size: piece.gapAfter, side: -1 });
      }
      index = layout.next;
      y += lineHeight;
      if (index >= glyphs.length) break;
      widgets.push({ pos: glyphs[index].pos, kind: "break", size: 0, side: -2 });
    }
    return widgets;
  }

  function printSpacer(widget: FlowWidget): HTMLElement {
    if (widget.kind === "break") {
      const rule = document.createElement("br");
      rule.setAttribute("data-print-run-around", "break");
      rule.setAttribute("aria-hidden", "true");
      return rule;
    }
    const span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    span.setAttribute("data-print-run-around", widget.kind);
    if (widget.kind === "skip") {
      span.style.cssText = `display:block;clear:both;width:100%;height:${widget.size}px;margin:0;padding:0;border:0;`;
      return span;
    }
    const width = widget.size > 2 ? widget.size - 1 : widget.size;
    span.style.cssText = `display:inline-block;width:${width}px;height:0;font-size:0;line-height:0;vertical-align:baseline;unicode-bidi:isolate;direction:ltr;`;
    return span;
  }

  function applyStoryRunAround(root: HTMLElement, exclusions: readonly RunAroundRect[], direction: "rtl" | "ltr" = "rtl"): number {
    root.querySelectorAll("[data-print-run-around]").forEach(node => node.remove());
    if (!exclusions.length) return 0;
    const rootBox = root.getBoundingClientRect();
    let inserted = 0;
    for (const block of root.querySelectorAll<HTMLElement>("p, h1, h2, h3, h4, li")) {
      if (block.closest("table, [data-pdf-frame-source], [data-print-frame], [data-print-object-page]")) continue;
      const bounds = block.getBoundingClientRect();
      const style = getComputedStyle(block);
      const padLeft = parseFloat(style.paddingLeft) || 0;
      const padRight = parseFloat(style.paddingRight) || 0;
      const contentLeft = bounds.left - rootBox.left + padLeft;
      const contentRight = bounds.right - rootBox.left - padRight;
      const blockTop = bounds.top - rootBox.top;
      const blockBottom = bounds.bottom - rootBox.top;
      if (!(contentRight > contentLeft)) continue;
      if (!exclusions.some(exclusion => exclusion.top < blockBottom && exclusion.bottom > blockTop && exclusion.left < contentRight && exclusion.right > contentLeft)) continue;
      let lineHeight = parseFloat(style.lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) lineHeight = parseFloat(style.fontSize) || 16;
      const glyphs: Array<{ pos: number; width: number; node: Text; offset: number }> = [];
      let painted = 0;
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      for (let current = walker.nextNode() as Text | null; current; current = walker.nextNode() as Text | null) {
        const text = current.data;
        for (let offset = 0; offset < text.length && glyphs.length < 8000;) {
          const end = graphemeEnd(text, offset);
          const range = document.createRange();
          range.setStart(current, offset);
          range.setEnd(current, end);
          let width = 0;
          for (const rect of range.getClientRects()) {
            width = Math.max(width, rect.width);
            painted = Math.max(painted, rect.height);
          }
          glyphs.push({ pos: glyphs.length, width: width || (parseFloat(style.fontSize) || 16) * 0.5, node: current, offset });
          offset = end;
        }
      }
      if (painted > 0) lineHeight = Math.min(lineHeight, painted);
      if (!glyphs.length) continue;
      const planned = planRunAroundWidgets(glyphs, blockTop, lineHeight, () => ({ left: contentLeft, right: contentRight }), exclusions, direction);
      const ordered = [...planned].sort((a, b) => b.pos - a.pos || b.side - a.side);
      for (const widget of ordered) {
        const glyph = glyphs[widget.pos];
        if (!glyph?.node.parentNode) continue;
        const host = glyph.node.splitText(Math.min(glyph.offset, glyph.node.data.length));
        host.parentNode?.insertBefore(printSpacer(widget), host);
        inserted += 1;
      }
    }
    return inserted;
  }

  return {
    ["RUN_AROUND_MIN_SEGMENT_PX"]: RUN_AROUND_MIN_SEGMENT_PX,
    ["verticalOverlap"]: verticalOverlap,
    ["mergeIntervals"]: mergeIntervals,
    ["segmentSide"]: segmentSide,
    ["isClusterExtender"]: isClusterExtender,
    ["graphemeEnd"]: graphemeEnd,
    ["splitLineAroundExclusions"]: splitLineAroundExclusions,
    ["runAroundSkipBottom"]: runAroundSkipBottom,
    ["layoutLineAroundExclusions"]: layoutLineAroundExclusions,
    ["planRunAroundWidgets"]: planRunAroundWidgets,
    ["applyStoryRunAround"]: applyStoryRunAround,
  };
}

const runAroundEngine = runAroundEngineFactory();

export const RUN_AROUND_MIN_SEGMENT_PX: number = runAroundEngine.RUN_AROUND_MIN_SEGMENT_PX;
export const verticalOverlap: (a: RunAroundRect, b: RunAroundRect) => boolean = runAroundEngine.verticalOverlap;
export const mergeIntervals: (intervals: Array<[number, number]>) => Array<[number, number]> = runAroundEngine.mergeIntervals;
export const segmentSide: (left: number, right: number, blocked: Array<[number, number]>) => RunAroundSide = runAroundEngine.segmentSide;
export const isClusterExtender: (code: number) => boolean = runAroundEngine.isClusterExtender;
export const graphemeEnd: (text: string, index: number) => number = runAroundEngine.graphemeEnd;
export const splitLineAroundExclusions: (line: RunAroundRect, exclusions: readonly RunAroundRect[], minWidth?: number) => SplitLine = runAroundEngine.splitLineAroundExclusions;
export const runAroundSkipBottom: (line: RunAroundRect, exclusions: readonly RunAroundRect[], minWidth?: number) => number = runAroundEngine.runAroundSkipBottom;
export const layoutLineAroundExclusions: (
  line: RunAroundRect,
  glyphWidths: readonly number[],
  exclusions: readonly RunAroundRect[],
  minWidth?: number,
  start?: number,
  direction?: "rtl" | "ltr",
) => RtlLineLayout = runAroundEngine.layoutLineAroundExclusions;
export const planRunAroundWidgets: (
  glyphs: readonly FlowGlyph[],
  overlapTop: number,
  lineHeight: number,
  edges: (firstLine: boolean) => { left: number; right: number },
  exclusions: readonly RunAroundRect[],
  direction?: "rtl" | "ltr",
) => FlowWidget[] = runAroundEngine.planRunAroundWidgets;
export const applyStoryRunAround: (root: HTMLElement, exclusions: readonly RunAroundRect[], direction?: "rtl" | "ltr") => number = runAroundEngine.applyStoryRunAround;

/** Script for Puppeteer. The factory source includes placeGlyphs and the planner. */
export function runAroundBrowserProgram(): string {
  return `const __runAround=(${runAroundEngineFactory.toString()})();\nfunction applyStoryRunAround(root,exclusions,direction){return __runAround["applyStoryRunAround"](root,exclusions,direction);}\n`;
}

/** RTL wrapper kept for existing callers. */
export function layoutRtlLineAroundExclusions(
  line: RunAroundRect,
  glyphWidths: readonly number[],
  exclusions: readonly RunAroundRect[],
  minWidth = 0,
  start = 0,
): RtlLineLayout {
  return layoutLineAroundExclusions(line, glyphWidths, exclusions, minWidth, start, "rtl");
}
