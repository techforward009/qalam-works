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
  dontPrint?: boolean;
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

/**
 * Exclusion in a continuous content flow. Print and PDF measure the story
 * without stacked sheet margins, so page 2 begins after one content height.
 * Exclusions are vertically clamped to their owning physical page band so
 * margins never bleed phantom holes onto adjacent pages.
 * `leftMarginPx` is 0 when the measured block already includes the left padding.
 */
export function runAroundContentExclusionPx(
  frame: RunAroundBox,
  contentHeightPx: number,
  topMarginPx: number,
  leftMarginPx = 0,
): RunAroundRect | null {
  const mm = runAroundExclusionMm(frame);
  if (!mm || !finite(contentHeightPx) || !(contentHeightPx > 0) || !finite(topMarginPx) || !finite(leftMarginPx)) return null;
  const pageStart = (mm.page - 1) * contentHeightPx;
  const pageEnd = mm.page * contentHeightPx;
  const top = Math.max(pageStart, pageStart + mm.top * PX_PER_MM - topMarginPx);
  const bottom = Math.min(pageEnd, pageStart + mm.bottom * PX_PER_MM - topMarginPx);
  if (!(bottom > top)) return null;
  return {
    left: mm.left * PX_PER_MM - leftMarginPx,
    right: mm.right * PX_PER_MM - leftMarginPx,
    top,
    bottom,
  };
}

interface FlowGlyph { pos: number; width: number; space?: boolean }
interface FlowWidget { pos: number; kind: "gap" | "break" | "skip" | "space"; size: number; side: number }
interface FlowPlan {
  pages?: { stride: number; marginTop: number; contentBottom: number } | null;
  endY?: number;
  /** `justify` / `justify-all` widen spaces only. Other values keep the packed line. */
  align?: string | null;
  /** When present, justified segments become fixed boxes and the hole stays put. */
  segments?: Array<{ from: number; to: number; width: number; wordSpacing: number; edge: "left" | "right" }>;
}

/**
 * One function the PDF page can eval. Nested helpers stay in its source, so a
 * bundler cannot rewrite them into imports that do not exist in the browser.
 */
function runAroundEngineFactory() {
  const RUN_AROUND_MIN_SEGMENT_PX = 8;
  // A two-word side with more leftover than this looks like a hole of its own.
  const RUN_AROUND_MAX_JUSTIFY_EXTRA_PX = 40;

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

  /**
   * End offset of the indivisible unit that starts at `index`.
   * A Urdu word, its combining marks, and any punctuation stuck to it move
   * together. Spaces stay separate so a line can still wrap between words.
   * ZWJ and ZWNJ stay inside the segment the word breaker already formed.
   */
  function wordEnd(text: string, index: number): number {
    if (index >= text.length) return text.length;
    const Segmenter = (Intl as { Segmenter?: new (locales?: string, options?: { granularity: "word" }) => { segment: (input: string) => Iterable<{ segment: string; index: number; isWordLike?: boolean }> } }).Segmenter;
    if (!Segmenter) {
      const first = text.codePointAt(index) ?? 0;
      if (first === 0x20 || first === 0x09) {
        let cursor = index;
        while (cursor < text.length && (text[cursor] === " " || text[cursor] === "\t")) cursor += 1;
        return cursor;
      }
      let cursor = graphemeEnd(text, index);
      while (cursor < text.length && text[cursor] !== " " && text[cursor] !== "\t" && text[cursor] !== "\n") cursor = graphemeEnd(text, cursor);
      return cursor;
    }
    const segmenter = new Segmenter("ur", { granularity: "word" });
    let end = index;
    let started = false;
    let attachPunctuation = false;
    for (const part of segmenter.segment(text)) {
      const partEnd = part.index + part.segment.length;
      if (partEnd <= index) continue;
      if (!started) {
        end = partEnd;
        started = true;
        if (!part.segment.trim()) return Math.max(end, graphemeEnd(text, index));
        attachPunctuation = true;
        continue;
      }
      const punctuation = part.segment.trim() && !part.isWordLike && !/\s/.test(part.segment);
      if (attachPunctuation && punctuation) {
        end = partEnd;
        continue;
      }
      break;
    }
    return Math.max(end, graphemeEnd(text, index));
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

  function interiorSpaceCount(spaceAt: readonly boolean[], from: number, to: number): number {
    let count = 0;
    let spaces = 0;
    let started = false;
    for (let i = from; i < to; i++) {
      if (spaceAt[i]) {
        if (started) spaces += 1;
      } else {
        if (started) count += spaces;
        spaces = 0;
        started = true;
      }
    }
    return count;
  }

  function wordCount(spaceAt: readonly boolean[], from: number, to: number): number {
    let words = 0;
    for (let i = from; i < to; i++) if (!spaceAt[i]) words += 1;
    return words;
  }

  function tooSparse(fit: { minWords: number; maxExtraPerSpace: number; spaceAt: readonly boolean[] } | null | undefined, from: number, to: number, capacity: number, used: number): boolean {
    if (!fit) return false;
    const words = wordCount(fit.spaceAt, from, to);
    if (words < fit.minWords) return true;
    const spaces = interiorSpaceCount(fit.spaceAt, from, to);
    const slack = Math.max(0, capacity - used);
    if (spaces < 1) return slack > 1;
    return words <= 2 && slack / spaces > fit.maxExtraPerSpace;
  }

  function segmentJustify(widths: readonly number[], spaceAt: readonly boolean[], piece: RunAroundPiece): { slack: number; spaces: number; wordSpacing: number; used: number } {
    let from = piece.from;
    let to = piece.to;
    while (from < to && spaceAt[from]) from += 1;
    while (to > from && spaceAt[to - 1]) to -= 1;
    let used = 0;
    for (let i = from; i < to; i++) used += widths[i];
    const spaces = interiorSpaceCount(spaceAt, from, to);
    const slack = Math.max(0, piece.right - piece.left - used);
    // Leave a 2px safety margin so Nastaliq ink cannot spill into the hole or wrap a full lane.
    const raw = spaces > 0 ? Math.max(0, slack - 2) / spaces : 0;
    const wordSpacing = Math.min(RUN_AROUND_MAX_JUSTIFY_EXTRA_PX, raw);
    return { slack, spaces, wordSpacing, used };
  }

  function placeGlyphs(
    widths: readonly number[],
    segments: readonly RunAroundSegment[],
    start: number,
    direction: "rtl" | "ltr",
    fit?: { minWords: number; maxExtraPerSpace: number; spaceAt: readonly boolean[] } | null,
  ): { pieces: RunAroundPiece[]; next: number } {
    const ordered = direction === "ltr"
      ? [...segments].sort((a, b) => a.left - b.left || a.right - b.right)
      : [...segments].sort((a, b) => b.right - a.right || b.left - a.left);
    const pieces: RunAroundPiece[] = [];
    const usedWidth: number[] = [];
    let index = start;
    for (const segment of ordered) {
      if (index >= widths.length) break;
      const capacity = segment.right - segment.left;
      const from = index;
      let used = 0;
      let tryIndex = from;
      while (tryIndex < widths.length && used + widths[tryIndex] <= capacity + 1e-6) {
        used += widths[tryIndex];
        tryIndex += 1;
      }
      if (tryIndex === from) continue;
      if (tooSparse(fit, from, tryIndex, capacity, used)) continue;
      index = tryIndex;
      pieces.push({ from, to: index, left: segment.left, right: segment.right, side: segment.side, gapAfter: 0 });
      usedWidth.push(used);
    }
    // The hole has to start where the ink stops. A gap the width of the box
    // alone slides toward a short run and the next word lands on the object.
    for (let i = 0; i < pieces.length - 1; i++) {
      const inkEnd = direction === "ltr" ? pieces[i].left + usedWidth[i] : pieces[i].right - usedWidth[i];
      pieces[i].gapAfter = direction === "ltr"
        ? Math.max(0, pieces[i + 1].left - inkEnd)
        : Math.max(0, inkEnd - pieces[i + 1].right);
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
    fit?: { minWords: number; maxExtraPerSpace: number; spaceAt: readonly boolean[] } | null,
  ): RtlLineLayout {
    const split = splitLineAroundExclusions(line, exclusions, minWidth);
    if (split.skip) {
      return { skip: true, skipBottom: runAroundSkipBottom(line, exclusions, minWidth), pieces: [], next: start, leadingGap: 0 };
    }
    const placed = placeGlyphs(glyphWidths, split.segments, start, direction, fit);
    if (!placed.pieces.length && start < glyphWidths.length && split.segments.length) {
      const word = glyphWidths[start];
      const full = line.right - line.left;
      // A token wider than the whole column cannot move to a later line either.
      // Keep it in one piece on the widest side instead of splitting it.
      if (word > full + 1e-6) {
        let widest = split.segments[0];
        for (const segment of split.segments) if (segment.right - segment.left > widest.right - widest.left) widest = segment;
        const leadingGap = direction === "ltr" ? Math.max(0, widest.left - line.left) : Math.max(0, line.right - widest.right);
        return {
          skip: false,
          skipBottom: null,
          pieces: [{ from: start, to: start + 1, left: widest.left, right: widest.right, side: widest.side, gapAfter: 0 }],
          next: start + 1,
          leadingGap,
        };
      }
    }
    const first = placed.pieces[0];
    const leadingGap = first
      ? direction === "ltr" ? Math.max(0, first.left - line.left) : Math.max(0, line.right - first.right)
      : 0;
    return { skip: false, skipBottom: null, pieces: placed.pieces, next: placed.next, leadingGap };
  }

  /** Width still free inside a segment after the natural word advances. */
  function segmentSlack(widths: readonly number[], piece: RunAroundPiece): number {
    let used = 0;
    for (let index = piece.from; index < piece.to; index += 1) used += widths[index];
    return Math.max(0, piece.right - piece.left - used);
  }

  /**
   * Screen sheets are stacked with a gutter the float breaker inserts.
   * A line that does not fit the remaining text area continues at the next
   * sheet's text top. Print coordinates are already one continuous column.
   */
  function snapFlowTop(y: number, lineHeight: number, pages: { stride: number; marginTop: number; contentBottom: number } | null | undefined): number {
    if (!pages || !(pages.stride > 0) || !(lineHeight > 0)) return y;
    let page = Math.max(0, Math.floor(Math.max(0, y) / pages.stride));
    let cursor = y;
    for (let guard = 0; guard < 60; guard += 1) {
      const origin = page * pages.stride;
      const top = origin + pages.marginTop;
      const bottom = origin + pages.contentBottom;
      if (bottom - top + 0.5 < lineHeight) {
        page += 1;
        cursor = page * pages.stride + pages.marginTop;
        continue;
      }
      const lineTop = cursor < top ? top : cursor;
      if (lineTop + lineHeight <= bottom + 0.5) return lineTop;
      page += 1;
      cursor = page * pages.stride + pages.marginTop;
    }
    return cursor;
  }

  function flowPastGlyphs(
    glyphs: readonly FlowGlyph[],
    index: number,
    y: number,
    lineHeight: number,
    edges: (firstLine: boolean, lineTop?: number, lineBottom?: number) => { left: number; right: number },
    direction: "rtl" | "ltr",
    pages: { stride: number; marginTop: number; contentBottom: number } | null | undefined,
  ): number {
    const widths = glyphs.map(glyph => glyph.width);
    for (let guard = 0; index < glyphs.length && guard < 400; guard += 1) {
      y = snapFlowTop(y, lineHeight, pages);
      const edge = edges(false, y, y + lineHeight);
      const line = { left: edge.left, right: edge.right, top: y, bottom: y + lineHeight };
      const plain = layoutLineAroundExclusions(line, widths, [], 0, index, direction);
      if (plain.next === index) break;
      index = plain.next;
      y += lineHeight;
    }
    return y;
  }

  function planRunAroundWidgets(
    glyphs: readonly FlowGlyph[],
    overlapTop: number,
    lineHeight: number,
    edges: (firstLine: boolean, lineTop?: number, lineBottom?: number) => { left: number; right: number },
    exclusions: readonly RunAroundRect[],
    direction: "rtl" | "ltr" = "rtl",
    flow?: FlowPlan | null,
  ): FlowWidget[] {
    const widgets: FlowWidget[] = [];
    if (!glyphs.length || !(lineHeight > 0)) {
      if (flow) flow.endY = overlapTop;
      return widgets;
    }
    const lowest = exclusions.reduce((max, exclusion) => Math.max(max, exclusion.bottom), Number.NEGATIVE_INFINITY);
    let index = 0;
    let y = overlapTop;
    let first = true;
    const widths = glyphs.map(glyph => glyph.width);
    for (let guard = 0; index < glyphs.length && guard < 400; guard += 1) {
      const snapped = snapFlowTop(y, lineHeight, flow?.pages);
      if (snapped > y + 0.5) y = snapped;
      const edge = edges(first, y, y + lineHeight);
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
      const align = flow?.align || "";
      const justifyAll = align === "justify-all";
      const justify = justifyAll || align === "justify";
      const spaceAt = glyphs.map(glyph => !!glyph.space);
      const trial = layoutLineAroundExclusions(line, widths, exclusions, RUN_AROUND_MIN_SEGMENT_PX, index, direction);
      const lastLine = trial.next >= glyphs.length;
      const fit = justify && !lastLine
        ? { minWords: 2, maxExtraPerSpace: RUN_AROUND_MAX_JUSTIFY_EXTRA_PX, spaceAt }
        : null;
      let layout = fit
        ? layoutLineAroundExclusions(line, widths, exclusions, RUN_AROUND_MIN_SEGMENT_PX, index, direction, fit)
        : trial;
      // Two narrow columns can each hold one word. Skipping every side would
      // drop the whole band; keep the packed trial so text still wraps.
      const packedFallback = !!(fit && (!layout.pieces.length || layout.next === index) && trial.pieces.length);
      if (packedFallback) layout = trial;
      if (layout.skip) {
        const bottom = layout.skipBottom ?? y + lineHeight;
        const height = Math.max(lineHeight, bottom - y);
        widgets.push({ pos: glyphs[index].pos, kind: "skip", size: height, side: -2 });
        if (!(height > 0.5) || !(y + height < lowest - 0.5)) break;
        y += height;
        continue;
      }
      if (!layout.pieces.length || layout.next === index) {
        const width = widths[index] ?? 0;
        const full = edge.right - edge.left;
        // The whole word fits a clear line, so drop it below this band instead
        // of leaving one letter beside the box.
        if (index < glyphs.length && width <= full + 1e-6 && y + lineHeight < lowest + lineHeight) {
          widgets.push({ pos: glyphs[index].pos, kind: "break", size: 0, side: -2 });
          y += lineHeight;
          continue;
        }
        break;
      }
      // Non-last justified wrap lines fill each side to its box. The last line
      // of the paragraph stays packed. Extra space goes between words only.
      const lock = justifyAll || (align === "justify" && layout.next < glyphs.length);
      const fill = lock && !packedFallback;
      if (fill) {
        const pieceSpacings = layout.pieces.map(piece => segmentJustify(widths, spaceAt, piece));
        for (let i = 0; i < layout.pieces.length - 1; i++) {
          const a = layout.pieces[i];
          const b = layout.pieces[i + 1];
          const spacing = pieceSpacings[i];
          const appliedExtra = spacing.wordSpacing > 0.05 ? spacing.spaces * spacing.wordSpacing : 0;
          let edgeSpaces = 0;
          let firstNonSpace = a.from;
          while (firstNonSpace < a.to && spaceAt[firstNonSpace]) {
            edgeSpaces += widths[firstNonSpace];
            firstNonSpace += 1;
          }
          for (let cursor = a.to - 1; cursor >= firstNonSpace && spaceAt[cursor]; cursor -= 1) {
            edgeSpaces += widths[cursor];
          }
          const capacity = a.right - a.left;
          const rendered = spacing.used + appliedExtra + edgeSpaces;
          // Keep the 2px Nastaliq safety allowance absorbed when justified, while
          // still absorbing any unspent slack (e.g. single-word or capped lanes)
          // and subtracting edge spaces that already render before the gap widget.
          const unspent = spacing.wordSpacing > 0.05
            ? Math.max(0, capacity - (spacing.used + appliedExtra) - 2)
            : Math.max(0, capacity - spacing.used);
          const boxGap = direction === "ltr"
            ? Math.max(0, b.left - a.right)
            : Math.max(0, a.left - b.right);
          const renderedAdjustment = unspent - edgeSpaces;
          const exactGap = direction === "ltr"
            ? Math.max(0, b.left - (a.left + rendered))
            : Math.max(0, (a.right - rendered) - b.right);
          a.gapAfter = edgeSpaces > 0 || unspent > 0.01 ? exactGap : Math.max(0, boxGap + renderedAdjustment);
        }
        if (flow && flow.segments) {
          for (let i = 0; i < layout.pieces.length; i++) {
            const piece = layout.pieces[i];
            const spacing = pieceSpacings[i];
            let from = piece.from;
            let to = piece.to;
            while (from < to && spaceAt[from]) from += 1;
            while (to > from && spaceAt[to - 1]) to -= 1;
            if (!(from < to) || !(spacing.wordSpacing > 0.05)) continue;
            flow.segments.push({
              from,
              to,
              width: piece.right - piece.left,
              wordSpacing: spacing.wordSpacing,
              edge: piece.side === "left" ? "left" : "right",
            });
          }
        }
      }
      if (layout.leadingGap > 0.5) widgets.push({ pos: glyphs[layout.pieces[0].from].pos, kind: "gap", size: layout.leadingGap, side: -1 });
      for (const piece of layout.pieces) {
        if (piece.gapAfter > 0.5 && piece.to < glyphs.length) {
          let size = piece.gapAfter;
          if (!fill) {
            for (let cursor = piece.to - 1; cursor >= piece.from && glyphs[cursor].space; cursor -= 1) size += glyphs[cursor].width;
          }
          widgets.push({ pos: glyphs[piece.to].pos, kind: "gap", size, side: fill ? -4 : -1 });
        }
      }
      const tailPiece = layout.pieces[layout.pieces.length - 1];
      const tail = lock && !fill && tailPiece ? segmentSlack(widths, tailPiece) : 0;
      if (tail > 0.5 && layout.next < glyphs.length) {
        widgets.push({ pos: glyphs[layout.next].pos, kind: "gap", size: tail, side: -3 });
      }
      index = layout.next;
      y += lineHeight;
      if (index >= glyphs.length) break;
      widgets.push({ pos: glyphs[index].pos, kind: "break", size: 0, side: -2 });
    }
    if (flow) flow.endY = flowPastGlyphs(glyphs, index, y, lineHeight, edges, direction, flow.pages);
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
    span.setAttribute(
      "data-print-run-around",
      widget.kind === "gap" && widget.side === -3 ? "tail" : widget.kind,
    );
    if (widget.kind === "skip") {
      span.style.cssText = `display:block;clear:both;width:100%;height:${widget.size}px;margin:0;padding:0;border:0;`;
      return span;
    }
    if (widget.kind === "space") {
      span.setAttribute("data-print-run-around", "space");
      span.style.cssText = `display:inline;padding-inline-start:${widget.size}px;line-height:inherit;vertical-align:baseline;`;
      return span;
    }
    const width = widget.side === -3 || widget.side === -4 ? widget.size : widget.size > 2 ? widget.size - 1 : widget.size;
    span.style.cssText = `display:inline-block;width:${width}px;height:0;font-size:0;line-height:0;vertical-align:baseline;unicode-bidi:isolate;direction:ltr;`;
    return span;
  }

  function applyStoryRunAround(
    root: HTMLElement,
    exclusions: readonly RunAroundRect[],
    direction: "rtl" | "ltr" = "rtl",
    options?: { contentHeightPx?: number } | null,
  ): number {
    root.querySelectorAll("[data-print-run-around]").forEach(node => {
      if (node.getAttribute("data-print-run-around") === "segment") {
        node.replaceWith(...node.childNodes);
      } else {
        node.remove();
      }
    });
    root.normalize();
    if (!exclusions.length) return 0;
    const contentHeightPx = options && typeof options.contentHeightPx === "number" && options.contentHeightPx > 0
      ? options.contentHeightPx
      : 0;
    const rootBox = root.getBoundingClientRect();
    let inserted = 0;
    const breakSelector = '.qalam-page-break, .qalam-section-break-next-page, [data-document-page-break="true"], [data-document-section-break="true"][data-section-break-type="nextPage"]';
    const selector = contentHeightPx > 0
      ? `p, h1, h2, h3, h4, li, table, figure.qalam-document-image, [data-resize-container][data-image-float], ${breakSelector}`
      : "p, h1, h2, h3, h4, li, figure.qalam-document-image, [data-resize-container][data-image-float]";
    let pageShift = 0;
    let seenContent = false;
    let lastBottomVirtual = 0;
    let forcedPage: number | null = null;
    const imageFloats: Array<{ side: "left" | "right"; left: number; right: number; top: number; bottom: number }> = [];
    for (const el of root.querySelectorAll<HTMLElement>(selector)) {
      if (el.closest("[data-pdf-frame-source], [data-print-frame], [data-print-object-page]")) continue;
      if (el.closest("table") && el.tagName !== "TABLE") continue;
      if (el.tagName === "LI" && el.querySelector("p, h1, h2, h3, h4")) continue;
      if (contentHeightPx > 0 && el.matches(breakSelector)) {
        if (seenContent) {
          forcedPage = forcedPage !== null
            ? forcedPage + 1
            : Math.floor(Math.max(0, lastBottomVirtual - 0.5) / contentHeightPx) + 1;
        }
        continue;
      }
      const bounds = el.getBoundingClientRect();
      const domTop = bounds.top - rootBox.top;
      const domBottom = bounds.bottom - rootBox.top;
      if (contentHeightPx > 0 && forcedPage !== null) {
        pageShift = forcedPage * contentHeightPx - domTop;
        forcedPage = null;
      }
      seenContent = true;
      const blockTop = domTop + pageShift;
      const blockBottom = domBottom + pageShift;
      if (el.tagName === "TABLE") {
        lastBottomVirtual = Math.max(lastBottomVirtual, blockBottom);
        continue;
      }
      if (el.matches("figure.qalam-document-image, [data-resize-container][data-image-float]")) {
        const floatStyle = getComputedStyle(el);
        const side = floatStyle.cssFloat === "left" ? "left" : floatStyle.cssFloat === "right" ? "right" : null;
        if (side) {
          imageFloats.push({
            side,
            left: bounds.left - rootBox.left - (parseFloat(floatStyle.marginLeft) || 0),
            right: bounds.right - rootBox.left + (parseFloat(floatStyle.marginRight) || 0),
            top: blockTop - (parseFloat(floatStyle.marginTop) || 0),
            bottom: blockBottom + (parseFloat(floatStyle.marginBottom) || 0),
          });
        }
        lastBottomVirtual = Math.max(lastBottomVirtual, blockBottom);
        continue;
      }
      const block = el;
      const style = getComputedStyle(block);
      const padLeft = parseFloat(style.paddingLeft) || 0;
      const padRight = parseFloat(style.paddingRight) || 0;
      const contentLeft = bounds.left - rootBox.left + padLeft;
      const contentRight = bounds.right - rootBox.left - padRight;
      if (!(contentRight > contentLeft)) {
        lastBottomVirtual = Math.max(lastBottomVirtual, blockBottom);
        continue;
      }
      let lineHeight = parseFloat(style.lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) lineHeight = parseFloat(style.fontSize) || 16;
      let reachBottom = blockBottom;
      if (contentHeightPx > 0 && lineHeight > 0 && lineHeight < contentHeightPx) {
        const startPage = Math.floor(Math.max(0, blockTop) / contentHeightPx);
        const endPage = Math.floor(Math.max(0, blockBottom - 0.5) / contentHeightPx);
        if (endPage > startPage) {
          reachBottom = blockBottom + (endPage - startPage) * lineHeight;
          const nextEndPage = Math.floor(Math.max(0, reachBottom - 0.5) / contentHeightPx);
          if (nextEndPage > endPage) reachBottom += (nextEndPage - endPage) * lineHeight;
        }
      }
      if (!exclusions.some(exclusion => exclusion.top < reachBottom && exclusion.bottom > blockTop && exclusion.left < contentRight && exclusion.right > contentLeft)) {
        lastBottomVirtual = Math.max(lastBottomVirtual, blockBottom);
        continue;
      }
      const glyphs: Array<{ pos: number; width: number; node: Text; offset: number; space?: boolean }> = [];
      let painted = 0;
      const inlineTags = " SPAN STRONG EM B I A U S SUB SUP MARK FONT CITE ABBR CODE SMALL BDI BDO Q ";
      const runs: Text[][] = [];
      let currentRun: Text[] = [];
      const flushRun = () => { if (currentRun.length) { runs.push(currentRun); currentRun = []; } };
      const walkInline = (el: Node) => {
        const children = el.childNodes;
        for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
          const child = children[childIndex];
          if (child.nodeType === 3) {
            if ((child as Text).data.length) currentRun.push(child as Text);
            continue;
          }
          if (child.nodeType !== 1) continue;
          const tag = (child as Element).tagName;
          if (tag === "BR" || tag === "IMG" || tag === "WBR" || tag === "HR") { flushRun(); continue; }
          if (inlineTags.indexOf(` ${tag} `) < 0) { flushRun(); walkInline(child); flushRun(); continue; }
          walkInline(child);
        }
      };
      walkInline(block);
      flushRun();
      const fallbackWidth = (parseFloat(style.fontSize) || 16) * 0.5;
      const pointAt = (nodes: Text[], index: number) => {
        let cursor = 0;
        for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
          const len = nodes[nodeIndex].data.length;
          if (index < cursor + len || nodeIndex === nodes.length - 1) {
            return { node: nodes[nodeIndex], offset: Math.max(0, Math.min(len, index - cursor)) };
          }
          cursor += len;
        }
        return { node: nodes[0], offset: 0 };
      };
      for (const run of runs) {
        if (glyphs.length >= 8000) break;
        const joined = run.map(node => node.data).join("");
        const probe = document.createElement("div");
        probe.setAttribute("aria-hidden", "true");
        // Always measure in an offscreen nowrap probe so text-align:justify on the
        // live paragraph never inflates space widths during Run Around planning.
        probe.style.cssText = `position:fixed;left:-100000px;top:0;white-space:nowrap;opacity:0;pointer-events:none;direction:${style.direction};text-align:start;`;
        const copies: Text[] = [];
        for (const node of run) {
          const font = node.parentElement ? getComputedStyle(node.parentElement) : style;
          const span = document.createElement("span");
          span.style.fontFamily = font.fontFamily;
          span.style.fontSize = font.fontSize;
          span.style.fontWeight = font.fontWeight;
          span.style.fontStyle = font.fontStyle;
          span.style.letterSpacing = font.letterSpacing;
          span.style.wordSpacing = font.wordSpacing;
          if (font.fontFeatureSettings) span.style.fontFeatureSettings = font.fontFeatureSettings;
          if (font.fontVariantLigatures) span.style.fontVariantLigatures = font.fontVariantLigatures;
          span.textContent = node.data;
          probe.appendChild(span);
          copies.push(span.firstChild as Text);
        }
        document.body.appendChild(probe);
        if (!(painted > 0)) {
          const sample = document.createRange();
          sample.setStart(run[0], 0);
          sample.setEnd(run[0], Math.min(1, run[0].data.length));
          for (const rect of sample.getClientRects()) painted = Math.max(painted, rect.height);
        }
        for (let offset = 0; offset < joined.length && glyphs.length < 8000;) {
          const end = wordEnd(joined, offset);
          const start = pointAt(copies, offset);
          const finish = pointAt(copies, end);
          const range = document.createRange();
          range.setStart(start.node, start.offset);
          range.setEnd(finish.node, finish.offset);
          const rects = [...range.getClientRects()];
          let ink = 0;
          const byLine = new Map<number, { min: number; max: number }>();
          for (const rect of rects) {
            if (rect.width <= 0) continue;
            const key = Math.round(rect.top);
            const band = byLine.get(key) ?? { min: rect.left, max: rect.right };
            band.min = Math.min(band.min, rect.left);
            band.max = Math.max(band.max, rect.right);
            byLine.set(key, band);
          }
          for (const band of byLine.values()) ink = Math.max(ink, band.max - band.min);
          const startCaret = range.cloneRange();
          startCaret.collapse(true);
          const endCaret = range.cloneRange();
          endCaret.collapse(false);
          const advance = Math.abs(endCaret.getBoundingClientRect().left - startCaret.getBoundingClientRect().left);
          const shaped = advance > 0 && (ink <= 0 || advance <= ink + 1) ? advance : ink;
          const live = pointAt(run, offset);
          const slice = joined.slice(offset, end);
          const blank = !slice.trim();
          glyphs.push({ pos: glyphs.length, width: shaped || (blank ? 0 : fallbackWidth), node: live.node, offset: live.offset, space: blank });
          offset = end;
        }
        probe.remove();
      }
      if (painted > 0) lineHeight = Math.min(lineHeight, painted);
      if (!glyphs.length) {
        lastBottomVirtual = Math.max(lastBottomVirtual, blockBottom);
        continue;
      }
      const tagged = block.getAttribute("data-text-align");
      const alignName = tagged || (style.textAlign === "justify" && style.textAlignLast === "justify" ? "justify-all" : style.textAlign);
      if (alignName === "justify" || alignName === "justify-all") block.style.setProperty("text-justify", "inter-word");
      const blockDirAttr = block.getAttribute("dir") || block.style.direction || style.direction;
      const blockDirection: "rtl" | "ltr" = blockDirAttr === "ltr" ? "ltr" : blockDirAttr === "rtl" ? "rtl" : direction;
      const indent = parseFloat(style.textIndent) || 0;
      const justifySegments: Array<{ from: number; to: number; width: number; wordSpacing: number; edge: "left" | "right" }> = [];
      const flow: FlowPlan = {
        pages: contentHeightPx > 0 ? { stride: contentHeightPx, marginTop: 0, contentBottom: contentHeightPx } : null,
        align: alignName,
        segments: justifySegments,
      };
      const planned = planRunAroundWidgets(
        glyphs,
        blockTop,
        lineHeight,
        (firstLine, lineTop, lineBottom) => {
          let left = contentLeft;
          let right = contentRight;
          if (typeof lineTop === "number" && typeof lineBottom === "number" && imageFloats.length) {
            for (const fl of imageFloats) {
              if (lineBottom <= fl.top + 0.5 || lineTop >= fl.bottom - 0.5) continue;
              if (fl.side === "left") left = Math.max(left, fl.right);
              else right = Math.min(right, fl.left);
            }
            if (!(left < right)) {
              left = contentLeft;
              right = contentRight;
            }
          }
          if (!firstLine || !indent) return { left, right };
          return blockDirection === "rtl"
            ? { left, right: right - indent }
            : { left: left + indent, right };
        },
        exclusions,
        blockDirection,
        flow,
      );
      const spaceSpacing = new Map<number, number>();
      for (const seg of justifySegments) {
        for (let i = seg.from; i < seg.to; i += 1) {
          if (glyphs[i]?.space) spaceSpacing.set(i, seg.wordSpacing);
        }
      }
      const widgetsByPos = new Map<number, FlowWidget[]>();
      for (const widget of planned) {
        const list = widgetsByPos.get(widget.pos) ?? [];
        list.push(widget);
        widgetsByPos.set(widget.pos, list);
      }
      // Mutate in strictly descending glyph order so splitting or wrapping a
      // later glyph never invalidates the node/offset of an earlier glyph.
      for (let i = glyphs.length - 1; i >= 0; i -= 1) {
        const glyph = glyphs[i];
        const spacing = spaceSpacing.get(i);
        if (spacing !== undefined && glyph?.space && glyph.node?.parentNode) {
          const startOffset = Math.min(glyph.offset, glyph.node.data.length);
          const end = Math.min(glyph.node.data.length, Math.max(startOffset + 1, wordEnd(glyph.node.data, startOffset)));
          if (end > startOffset) {
            try {
              const range = document.createRange();
              range.setStart(glyph.node, startOffset);
              range.setEnd(glyph.node, end);
              const span = document.createElement("span");
              span.setAttribute("data-print-run-around", "segment");
              span.style.cssText = `padding-inline-start:${spacing}px`;
              range.surroundContents(span);
              inserted += 1;
            } catch {
              /* a non-split boundary could not be wrapped cleanly */
            }
          }
        }
        const atPos = widgetsByPos.get(i);
        if (atPos && glyph?.node?.parentNode) {
          atPos.sort((a, b) => a.side - b.side);
          const splitOffset = Math.min(glyph.offset, glyph.node.data.length);
          const host = splitOffset === 0 ? glyph.node : glyph.node.splitText(splitOffset);
          for (const widget of atPos) {
            host.parentNode?.insertBefore(printSpacer(widget), host);
            inserted += 1;
          }
        }
      }
      const postBottom = (block.getBoundingClientRect().bottom - rootBox.top) + pageShift;
      lastBottomVirtual = Math.max(lastBottomVirtual, postBottom, flow.endY ?? 0);
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
    ["wordEnd"]: wordEnd,
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
export const wordEnd: (text: string, index: number) => number = runAroundEngine.wordEnd;
export const splitLineAroundExclusions: (line: RunAroundRect, exclusions: readonly RunAroundRect[], minWidth?: number) => SplitLine = runAroundEngine.splitLineAroundExclusions;
export const runAroundSkipBottom: (line: RunAroundRect, exclusions: readonly RunAroundRect[], minWidth?: number) => number = runAroundEngine.runAroundSkipBottom;
export const layoutLineAroundExclusions: (
  line: RunAroundRect,
  glyphWidths: readonly number[],
  exclusions: readonly RunAroundRect[],
  minWidth?: number,
  start?: number,
  direction?: "rtl" | "ltr",
  fit?: { minWords: number; maxExtraPerSpace: number; spaceAt: readonly boolean[] } | null,
) => RtlLineLayout = runAroundEngine.layoutLineAroundExclusions;
export const planRunAroundWidgets: (
  glyphs: readonly FlowGlyph[],
  overlapTop: number,
  lineHeight: number,
  edges: (firstLine: boolean, lineTop?: number, lineBottom?: number) => { left: number; right: number },
  exclusions: readonly RunAroundRect[],
  direction?: "rtl" | "ltr",
  flow?: FlowPlan | null,
) => FlowWidget[] = runAroundEngine.planRunAroundWidgets;
export const applyStoryRunAround: (
  root: HTMLElement,
  exclusions: readonly RunAroundRect[],
  direction?: "rtl" | "ltr",
  options?: { contentHeightPx?: number } | null,
) => number = runAroundEngine.applyStoryRunAround;

/** Script for Puppeteer. The factory source includes placeGlyphs and the planner. */
export function runAroundBrowserProgram(): string {
  return `const __runAround=(${runAroundEngineFactory.toString()})();\nfunction applyStoryRunAround(root,exclusions,direction,options){return __runAround["applyStoryRunAround"](root,exclusions,direction,options);}\n`;
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
