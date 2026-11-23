import { describe, expect, it } from "vitest";
import { planRunAroundWidgets } from "../app/tools/document-studio/extensions/RunAroundLayout";
import {
  RUN_AROUND_MIN_SEGMENT_PX,
  graphemeEnd,
  wordEnd,
  layoutLineAroundExclusions,
  layoutRtlLineAroundExclusions,
  runAroundContentExclusionPx,
  runAroundExclusionMm,
  runAroundExclusionPx,
  splitLineAroundExclusions,
  type RunAroundBox,
  type RunAroundRect,
} from "../app/tools/document-studio/utils/runAroundFlow";

const box = (patch: Partial<RunAroundBox> = {}): RunAroundBox => ({
  page: 1,
  kind: "rect",
  xMm: 10,
  yMm: 20,
  wMm: 30,
  hMm: 40,
  ...patch,
});

const line = (patch: Partial<RunAroundRect> = {}): RunAroundRect => ({ left: 0, right: 200, top: 0, bottom: 12, ...patch });

describe("run-around line splitting", () => {
  it("expands a checked rectangular box by its clearances and ignores the rest", () => {
    expect(runAroundExclusionMm(box())).toBeNull();
    expect(runAroundExclusionMm(box({ runAround: false }))).toBeNull();
    expect(runAroundExclusionMm(box({ runAround: true }))).toEqual({
      page: 1, left: 7.5, right: 42.5, top: 18.5, bottom: 61.5,
    });
    expect(runAroundExclusionMm(box({
      runAround: true, kind: "picture-rect", runAroundLeftMm: 1, runAroundRightMm: 2, runAroundTopMm: 3, runAroundBottomMm: 4,
    }))).toMatchObject({ left: 9, right: 42, top: 17, bottom: 64 });
    expect(runAroundExclusionMm(box({ runAround: true, kind: "text" }))).toMatchObject({ left: 7.5, right: 42.5 });
    for (const kind of ["ellipse", "picture-ellipse"]) {
      expect(runAroundExclusionMm(box({ runAround: true, kind }))).toMatchObject({ shape: "ellipse" });
    }
    for (const kind of ["round-rect", "picture-round-rect"]) {
      expect(runAroundExclusionMm(box({ runAround: true, kind }))?.shape).toBe("round-rect");
    }
    expect(runAroundExclusionMm(box({ runAround: true, kind: "line" }))).toBeNull();
    expect(runAroundExclusionMm(box({ runAround: true, kind: "text", textShape: "ellipse" }))).toBeNull();
    expect(runAroundExclusionMm(box({ runAround: true, angle1Deg: 15 }))).toBeNull();
    expect(runAroundExclusionMm(box({ runAround: true, angle1Deg: 0 }))).not.toBeNull();
  });

  it("uses curved contours instead of rectangular exclusions", () => {
    const ellipse: RunAroundRect = { left: 50, right: 150, top: 0, bottom: 100, shape: "ellipse" };
    const top = splitLineAroundExclusions(line({ top: 0, bottom: 10 }), [ellipse]);
    expect(top.segments[0].right).toBeCloseTo(70, 0);
    expect(top.segments[1].left).toBeCloseTo(130, 0);
    const bottom = splitLineAroundExclusions(line({ top: 90, bottom: 100 }), [ellipse]);
    expect(bottom.segments[0].right).toBeCloseTo(70, 0);
    expect(bottom.segments[1].left).toBeCloseTo(130, 0);
    const middle = splitLineAroundExclusions(line({ top: 45, bottom: 55 }), [ellipse]);
    expect(middle.segments[0].right).toBeCloseTo(50, 0);
    expect(middle.segments[1].left).toBeCloseTo(150, 0);

    const rounded: RunAroundRect = { left: 50, right: 150, top: 0, bottom: 100, shape: "round-rect", radius: 20 };
    const corner = splitLineAroundExclusions(line({ top: 0, bottom: 5 }), [rounded]);
    expect(corner.segments[0].right).toBeGreaterThan(50);
    expect(corner.segments[1].left).toBeLessThan(150);
    const middleBand = splitLineAroundExclusions(line({ top: 20, bottom: 30 }), [rounded]);
    expect(middleBand.segments[0].right).toBe(50);
    expect(middleBand.segments[1].left).toBe(150);
  });

  it("stacks the exclusion on the frame's page", () => {
    const px = runAroundExclusionPx(box({ runAround: true, page: 2, xMm: 0, yMm: 0, wMm: 25.4, hMm: 25.4, runAroundLeftMm: 0, runAroundRightMm: 0, runAroundTopMm: 0, runAroundBottomMm: 0 }), 1000);
    expect(px).toEqual({ left: 0, right: 96, top: 1000, bottom: 1096 });
  });

  it("maps a page-2 box into the continuous content flow", () => {
    const px = (mm: number) => mm * 96 / 25.4;
    const content = px(297 - 25.4 - 25.4);
    const frame = box({
      runAround: true,
      page: 2,
      kind: "picture-rect",
      xMm: 58,
      yMm: 40,
      wMm: 34,
      hMm: 26,
      runAroundLeftMm: 1,
      runAroundRightMm: 2,
      runAroundTopMm: 0.5,
      runAroundBottomMm: 1,
    });
    const flow = runAroundContentExclusionPx(frame, content, px(25.4), px(12.7));
    const fullSheet = runAroundExclusionPx(frame, px(297));
    expect(flow).toBeTruthy();
    expect(flow!.top).toBeCloseTo(content + px(40 - 0.5) - px(25.4), 4);
    expect(flow!.bottom).toBeCloseTo(content + px(40 + 26 + 1) - px(25.4), 4);
    expect(flow!.left).toBeCloseTo(px(58 - 1 - 12.7), 4);
    expect(flow!.top).toBeLessThan(fullSheet!.top - px(25.4));
    expect(runAroundContentExclusionPx(box({ page: 2 }), content, px(25.4))).toBeNull();
  });

  it("clamps content-flow exclusions to their owning physical page band without mutating frame geometry (H1)", () => {
    const px = (mm: number) => (mm * 96) / 25.4;
    const content = px(297 - 25.4 - 25.4);
    const topMargin = px(25.4);

    // 1. Page-2 frame extending into Page 2's top margin must clamp to content (start of Page 2), never bleed into Page 1.
    const page2Margin = box({
      runAround: true,
      page: 2,
      kind: "picture-rect",
      xMm: 60,
      yMm: 10,
      wMm: 40,
      hMm: 30,
      runAroundLeftMm: 0.5,
      runAroundRightMm: 0.5,
      runAroundTopMm: 0.35,
      runAroundBottomMm: 0.35,
    });
    const page2Snapshot = JSON.stringify(page2Margin);
    const ex2 = runAroundContentExclusionPx(page2Margin, content, topMargin, 0);
    expect(ex2).toBeTruthy();
    expect(ex2!.top).toBeCloseTo(content, 4);
    expect(ex2!.bottom).toBeCloseTo(content + px(10 + 30 + 0.35 - 25.4), 4);
    expect(JSON.stringify(page2Margin)).toBe(page2Snapshot);

    // 2. Page-1 frame extending into Page 1's bottom margin must clamp to content (end of Page 1), never bleed into Page 2.
    const page1Margin = box({
      runAround: true,
      page: 1,
      kind: "rect",
      xMm: 50,
      yMm: 255,
      wMm: 40,
      hMm: 30,
      runAroundTopMm: 0.35,
      runAroundBottomMm: 0.35,
    });
    const ex1 = runAroundContentExclusionPx(page1Margin, content, topMargin, 0);
    expect(ex1).toBeTruthy();
    expect(ex1!.top).toBeCloseTo(px(255 - 0.35 - 25.4), 4);
    expect(ex1!.bottom).toBeCloseTo(content, 4);

    // 3. Frame close to Page-1 bottom edge (within 1mm) stays strictly <= content.
    const nearBottom = box({
      runAround: true,
      page: 1,
      xMm: 50,
      yMm: 250,
      wMm: 30,
      hMm: 22,
      runAroundBottomMm: 1,
    });
    const exNear = runAroundContentExclusionPx(nearBottom, content, topMargin, 0);
    expect(exNear).toBeTruthy();
    expect(exNear!.bottom).toBeCloseTo(content, 4);

    // 4. Frames lying wholly inside the top margin or bottom margin clip to empty and return null.
    const whollyTopMargin = box({ runAround: true, page: 2, yMm: 4, hMm: 15, runAroundBottomMm: 0.5 });
    expect(runAroundContentExclusionPx(whollyTopMargin, content, topMargin, 0)).toBeNull();
    const whollyBottomMargin = box({ runAround: true, page: 1, yMm: 274, hMm: 18, runAroundTopMm: 0.5 });
    expect(runAroundContentExclusionPx(whollyBottomMargin, content, topMargin, 0)).toBeNull();
  });

  it("leaves a line alone when the box misses it", () => {
    const split = splitLineAroundExclusions(line(), [{ left: 40, right: 80, top: 20, bottom: 40 }]);
    expect(split).toEqual({ skip: false, segments: [{ left: 0, right: 200, side: "full" }] });
    const touching = splitLineAroundExclusions(line({ bottom: 20 }), [{ left: 40, right: 80, top: 20, bottom: 40 }]);
    expect(touching.segments[0].side).toBe("full");
  });

  it("splits a line onto both sides of a box and skips a band that is too narrow", () => {
    const exclusion = { left: 80, right: 120, top: -2, bottom: 20 };
    expect(splitLineAroundExclusions(line(), [exclusion])).toEqual({
      skip: false,
      segments: [
        { left: 0, right: 80, side: "left" },
        { left: 120, right: 200, side: "right" },
      ],
    });
    expect(splitLineAroundExclusions(line(), [{ left: 0, right: 50, top: 0, bottom: 8 }])).toEqual({
      skip: false,
      segments: [{ left: 50, right: 200, side: "right" }],
    });
    expect(splitLineAroundExclusions(line(), [{ left: 150, right: 220, top: 0, bottom: 8 }])).toEqual({
      skip: false,
      segments: [{ left: 0, right: 150, side: "left" }],
    });
    expect(splitLineAroundExclusions(line({ right: 100 }), [{ left: 4, right: 96, top: 0, bottom: 8 }], RUN_AROUND_MIN_SEGMENT_PX)).toEqual({
      skip: true, segments: [],
    });
    expect(splitLineAroundExclusions(line(), [{ left: 0, right: 200, top: 0, bottom: 30 }]).skip).toBe(true);
  });

  it("merges overlapping boxes and keeps the gap between separate boxes", () => {
    expect(splitLineAroundExclusions(line(), [
      { left: 40, right: 70, top: 0, bottom: 10 },
      { left: 60, right: 90, top: 0, bottom: 10 },
    ]).segments).toEqual([
      { left: 0, right: 40, side: "left" },
      { left: 90, right: 200, side: "right" },
    ]);
    expect(splitLineAroundExclusions(line(), [
      { left: 20, right: 40, top: 0, bottom: 10 },
      { left: 70, right: 90, top: 0, bottom: 10 },
    ]).segments).toEqual([
      { left: 0, right: 20, side: "left" },
      { left: 40, right: 70, side: "right" },
      { left: 90, right: 200, side: "right" },
    ]);
  });

  it("fills the right side first, then the left side of the same line", () => {
    const widths = Array.from({ length: 20 }, () => 10);
    const exclusion = { left: 80, right: 120, top: -2, bottom: 30 };
    const layout = layoutRtlLineAroundExclusions(line(), widths, [exclusion]);
    expect(layout.skip).toBe(false);
    expect(layout.leadingGap).toBe(0);
    expect(layout.pieces.map(piece => [piece.from, piece.to, piece.side, piece.gapAfter])).toEqual([
      [0, 8, "right", 40],
      [8, 16, "left", 0],
    ]);
    expect(layout.next).toBe(16);
    const shortRight = layoutRtlLineAroundExclusions(
      line({ right: 100 }),
      [20, 20, 20],
      [{ left: 40, right: 70, top: 0, bottom: 20 }],
    );
    expect(shortRight.pieces.map(piece => [piece.from, piece.to, piece.side, piece.gapAfter])).toEqual([
      [0, 1, "right", 40],
      [1, 3, "left", 0],
    ]);
  });

  it("gives the hole the width of a space that collapses against it", () => {
    const widgets = planRunAroundWidgets(
      [
        { pos: 1, width: 20 },
        { pos: 2, width: 16, space: true },
        { pos: 3, width: 20 },
      ],
      0,
      12,
      () => ({ left: 0, right: 120 }),
      [{ left: 50, right: 80, top: -2, bottom: 14 }],
    );
    expect(widgets.find(widget => widget.kind === "gap")).toMatchObject({ pos: 3, size: 50 });
  });

  it("pads a left-only line and does not pad a right-only line", () => {
    const widths = Array.from({ length: 20 }, () => 10);
    const leftOnly = layoutRtlLineAroundExclusions(line(), widths, [{ left: 150, right: 240, top: 0, bottom: 20 }]);
    expect(leftOnly.leadingGap).toBe(50);
    expect(leftOnly.pieces[0]).toMatchObject({ from: 0, to: 15, side: "left", gapAfter: 0 });
    const rightOnly = layoutRtlLineAroundExclusions(line(), widths, [{ left: -10, right: 50, top: 0, bottom: 20 }]);
    expect(rightOnly.leadingGap).toBe(0);
    expect(rightOnly.pieces[0]).toMatchObject({ from: 0, to: 15, side: "right", right: 200 });
  });

  it("moves a glyph that does not fit the right side onto the left side", () => {
    const layout = layoutRtlLineAroundExclusions(
      line({ right: 100 }),
      [25, 10, 10],
      [{ left: 50, right: 80, top: 0, bottom: 20 }],
    );
    expect(layout.leadingGap).toBe(50);
    expect(layout.pieces).toEqual([
      { from: 0, to: 3, left: 0, right: 50, side: "left", gapAfter: 0 },
    ]);
    expect(layout.next).toBe(3);
  });

  it("skips the whole covered band and resumes at the bottom of the box", () => {
    const layout = layoutRtlLineAroundExclusions(
      line({ right: 100, bottom: 10 }),
      [10, 10, 10],
      [{ left: 0, right: 100, top: 0, bottom: 48 }],
      RUN_AROUND_MIN_SEGMENT_PX,
    );
    expect(layout.skip).toBe(true);
    expect(layout.pieces).toEqual([]);
    expect(layout.next).toBe(0);
    expect(layout.skipBottom).toBe(48);
  });

  it("plans a hole between the two sides and a break before the leftover", () => {
    const glyphs = Array.from({ length: 20 }, (_, index) => ({ pos: 5 + index, width: 10 }));
    const widgets = planRunAroundWidgets(
      glyphs,
      0,
      12,
      () => ({ left: 0, right: 200 }),
      [{ left: 80, right: 120, top: -2, bottom: 30 }],
    );
    expect(widgets).toEqual([
      { pos: 13, kind: "gap", size: 40, side: -1 },
      { pos: 21, kind: "break", size: 0, side: -2 },
    ]);
  });

  it("keeps an Urdu cluster together and fills the left side before the right side for LTR", () => {
    const word = "بِسم";
    expect(graphemeEnd(word, 0)).toBeGreaterThan(1);
    expect(word.slice(0, graphemeEnd(word, 0))).toBe("بِ");
    const joined = `سلام${"\u200d"}علی`;
    const base = joined.indexOf("\u200d") - 1;
    expect(joined.slice(base, graphemeEnd(joined, base)).includes("\u200d")).toBe(true);
    const widths = Array.from({ length: 20 }, () => 10);
    const layout = layoutLineAroundExclusions(line(), widths, [{ left: 80, right: 120, top: -2, bottom: 30 }], 0, 0, "ltr");
    expect(layout.pieces.map(piece => [piece.from, piece.to, piece.side])).toEqual([
      [0, 8, "left"],
      [8, 16, "right"],
    ]);
    expect(layout.pieces[0].gapAfter).toBe(40);
  });

  it("wraps a second object after the story returns to the full line width", () => {
    const glyphs = Array.from({ length: 80 }, (_, index) => ({ pos: index, width: 10 }));
    const widgets = planRunAroundWidgets(
      glyphs,
      0,
      12,
      () => ({ left: 0, right: 200 }),
      [
        { left: 80, right: 120, top: -2, bottom: 20 },
        { left: 30, right: 70, top: 36, bottom: 60 },
      ],
    );
    const gaps = widgets.filter(widget => widget.kind === "gap").map(widget => widget.pos);
    expect(gaps).toContain(8);
    expect(gaps.some(pos => pos >= 40)).toBe(true);
    expect(widgets.some(widget => widget.kind === "break")).toBe(true);
  });

  it("keeps a Urdu word and its punctuation on one side of the box", () => {
    const text = "عبادت، انسان، معرفت، محبت، سلام، زندگی، بندگی";
    expect(text.slice(0, wordEnd(text, 0))).toBe("عبادت،");
    expect(text.slice(wordEnd(text, 0), wordEnd(text, wordEnd(text, 0)))).toBe(" ");
    expect(text.slice(7, wordEnd(text, 7))).toBe("انسان،");
    expect(wordEnd("سلام\u200cعلی", 0)).toBe("سلام\u200cعلی".length);
    expect(wordEnd("بِسم", 0)).toBe("بِسم".length);
    expect("Hello 2026 عبادت،".slice(0, wordEnd("Hello 2026 عبادت،", 0))).toBe("Hello");
    const narrow = { left: 40, right: 80, top: -2, bottom: 14 };
    const widgets = planRunAroundWidgets(
      [{ pos: 4, width: 50 }, { pos: 9, width: 20 }],
      0,
      12,
      () => ({ left: 0, right: 120 }),
      [narrow],
    );
    expect(widgets.some(widget => widget.kind === "gap")).toBe(false);
    expect(widgets.filter(widget => widget.kind === "break" && widget.pos === 4).length).toBeGreaterThan(0);
    const overflow = layoutRtlLineAroundExclusions(line({ right: 100 }), [140], [{ left: 40, right: 70, top: 0, bottom: 12 }]);
    expect(overflow.next).toBe(1);
    expect(overflow.pieces).toHaveLength(1);
    expect(overflow.pieces[0]).toMatchObject({ from: 0, to: 1 });
  });

  it("keeps wrapping a lower pair of boxes after the first pair", () => {
    const px = (mm: number) => mm * 96 / 25.4;
    const glyphs = Array.from({ length: 400 }, (_, index) => ({ pos: index, width: 13 }));
    const widgets = planRunAroundWidgets(glyphs, px(36), 26.4, () => ({ left: px(25.4), right: px(184.6) }), [
      { left: px(57), right: px(96), top: px(41.5), bottom: px(69) },
      { left: px(125), right: px(161), top: px(40), bottom: px(68.4) },
      { left: px(56), right: px(94), top: px(89), bottom: px(113) },
      { left: px(125.5), right: px(165), top: px(89.6), bottom: px(114) },
    ]);
    const gapCount = widgets.filter(widget => widget.kind === "gap").length;
    const breakCount = widgets.filter(widget => widget.kind === "break").length;
    expect(gapCount).toBeGreaterThan(4);
    expect(breakCount).toBeGreaterThan(4);
  });

  it("keeps a word whole when a mark would have split it", () => {
    const slices = (text: string) => {
      const parts: string[] = [];
      for (let offset = 0; offset < text.length;) {
        const end = wordEnd(text, offset);
        parts.push(text.slice(offset, end));
        offset = end;
      }
      return parts;
    };
    expect(slices("عب" + "ادت")).toEqual(["عبادت"]);
    expect(slices("انس" + "ان")).toEqual(["انسان"]);
    expect(slices("معر" + "فت")).toEqual(["معرفت"]);
    expect(slices("مح" + "بت")).toEqual(["محبت"]);
    expect(slices("سل" + "ام")).toEqual(["سلام"]);
    expect(slices("زند" + "گی")).toEqual(["زندگی"]);
    expect(slices("بند" + "گی")).toEqual(["بندگی"]);
    expect(slices("عب" + "ادت" + "،")).toEqual(["عبادت،"]);
    expect(slices("سلام" + "\u200c" + "علی")).toEqual(["سلام\u200cعلی"]);
    expect(slices("زن" + "\u200d" + "دگی")).toEqual(["زن\u200dدگی"]);
    const vowel = "مح" + "ب\u064e" + "ت";
    expect(slices(vowel)).toEqual([vowel]);
    expect(slices("بندگی" + "،")).toEqual(["بندگی،"]);
  });

  it("justifies each wrap segment to its box and keeps the hole at the object", () => {
    const glyphs = [
      { pos: 1, width: 20 },
      { pos: 2, width: 10, space: true },
      { pos: 3, width: 20 },
      { pos: 4, width: 30 },
      { pos: 5, width: 10, space: true },
      { pos: 6, width: 20 },
      { pos: 7, width: 40 },
    ];
    const flow = { align: "justify" as const, segments: [] as Array<{ from: number; to: number; width: number; wordSpacing: number; edge: "left" | "right" }> };
    const widgets = planRunAroundWidgets(
      glyphs,
      0,
      12,
      () => ({ left: 0, right: 200 }),
      [{ left: 90, right: 130, top: -2, bottom: 14 }],
      "rtl",
      flow,
    );
    expect(widgets.filter(widget => widget.kind === "space")).toEqual([]);
    expect(widgets.find(widget => widget.side === -3)).toBeUndefined();
    expect(widgets.find(widget => widget.kind === "gap" && widget.side === -4)).toMatchObject({ pos: 4, size: 40 });
    expect(flow.segments[0]).toMatchObject({ from: 0, to: 3, width: 70, edge: "right" });
    expect(flow.segments[0].wordSpacing).toBeCloseTo(18);
    expect(flow.segments[1]).toMatchObject({ from: 3, to: 6, width: 90, edge: "left" });
    expect(flow.segments[1].wordSpacing).toBeCloseTo(28);
    const packed = planRunAroundWidgets(
      glyphs,
      0,
      12,
      () => ({ left: 0, right: 200 }),
      [{ left: 90, right: 130, top: -2, bottom: 14 }],
    );
    expect(packed.some(widget => widget.kind === "space")).toBe(false);
    expect(packed.find(widget => widget.kind === "gap" && widget.side === -1)?.size).toBeGreaterThan(40);
  });

  it("balances word distribution when greedy packing would strand one long word on the second side", () => {
    const glyphs = [
      { pos: 1, width: 10 },
      { pos: 2, width: 5, space: true },
      { pos: 3, width: 10 },
      { pos: 4, width: 5, space: true },
      { pos: 5, width: 10 },
      { pos: 6, width: 5, space: true },
      { pos: 7, width: 10 },
      { pos: 8, width: 5, space: true },
      { pos: 9, width: 40 },
      { pos: 10, width: 5, space: true },
      { pos: 11, width: 40 },
      { pos: 12, width: 5, space: true },
      { pos: 13, width: 20 },
      { pos: 14, width: 5, space: true },
      { pos: 15, width: 20 },
    ];
    const flow = { align: "justify" as const, segments: [] as Array<{ from: number; to: number; width: number; wordSpacing: number; edge: "left" | "right" }> };
    const widgets = planRunAroundWidgets(
      glyphs,
      0,
      12,
      () => ({ left: 0, right: 200 }),
      [{ left: 80, right: 120, top: -2, bottom: 14 }],
      "rtl",
      flow,
    );

    // Greedy packing takes four short words on the right, leaving only one
    // long word for the left. Moving one short word across lets both lanes
    // carry a justified two-word-or-more run before the next line.
    expect(flow.segments).toHaveLength(2);
    expect(flow.segments.map(segment => segment.edge)).toEqual(["right", "left"]);
    expect(flow.segments[0]).toMatchObject({ from: 0, to: 5, width: 80 });
    expect(flow.segments[1]).toMatchObject({ from: 6, to: 9, width: 80 });
    expect(widgets.find(widget => widget.kind === "gap" && widget.side === -4)?.pos).toBe(7);
    expect(flow.segments.every(segment => segment.wordSpacing <= 40)).toBe(true);
    expect(widgets.some(widget => widget.kind === "break" && widget.pos === 11)).toBe(true);
  });

  it("accounts for trailing spaces and capped word spacing when sizing justified Run Around gaps", () => {
    // RTL line [0, 220], exclusion [80, 140] -> right lane [140, 220] (80px), left lane [0, 80] (80px).
    // Right lane has two 25px words separated by a 5px space (used = 55px) plus a 5px trailing space before the gap.
    const trailingGlyphs = [
      { pos: 1, width: 25 },
      { pos: 2, width: 5, space: true },
      { pos: 3, width: 25 },
      { pos: 4, width: 5, space: true },
      { pos: 5, width: 25 },
      { pos: 6, width: 5, space: true },
      { pos: 7, width: 25 },
      { pos: 8, width: 5, space: true },
      { pos: 9, width: 40 },
    ];
    const trailingFlow = { align: "justify" as const, segments: [] as Array<{ from: number; to: number; width: number; wordSpacing: number; edge: "left" | "right" }> };
    const trailingWidgets = planRunAroundWidgets(
      trailingGlyphs,
      0,
      12,
      () => ({ left: 0, right: 220 }),
      [{ left: 80, right: 140, top: -2, bottom: 14 }],
      "rtl",
      trailingFlow,
    );
    // Piece 0 trimmed used = 55, slack = 25, wordSpacing = 23 -> rendered = 55 + 23 + 5 (trailing space) = 83.
    // Exact gap from (220 - 83 = 137) to b.right (80) = 57, placing Piece 1 cleanly at x = 80.
    expect(trailingFlow.segments[0]).toMatchObject({ from: 0, to: 3, edge: "right" });
    expect(trailingFlow.segments[0].wordSpacing).toBeCloseTo(23);
    expect(trailingWidgets.find(w => w.kind === "gap" && w.side === -4)).toMatchObject({ pos: 5, size: 57 });

    // Capped spacing: right lane [240, 440] (200px) holds 3 words (20+5+20+5+20 = 70px; raw (130-2)/2 = 64px, capped at 40px)
    // because the next word (135px) won't fit alongside them, while left lane [0, 180] holds 2 words (135+5+25 = 165px).
    const cappedGlyphs = [
      { pos: 1, width: 20 },
      { pos: 2, width: 5, space: true },
      { pos: 3, width: 20 },
      { pos: 4, width: 5, space: true },
      { pos: 5, width: 20 },
      { pos: 6, width: 5, space: true },
      { pos: 7, width: 135 },
      { pos: 8, width: 5, space: true },
      { pos: 9, width: 25 },
      { pos: 10, width: 5, space: true },
      { pos: 11, width: 40 },
    ];
    const cappedFlow = { align: "justify" as const, segments: [] as Array<{ from: number; to: number; width: number; wordSpacing: number; edge: "left" | "right" }> };
    const cappedWidgets = planRunAroundWidgets(
      cappedGlyphs,
      0,
      12,
      () => ({ left: 0, right: 440 }),
      [{ left: 180, right: 240, top: -2, bottom: 14 }],
      "rtl",
      cappedFlow,
    );
    expect(cappedFlow.segments[0].wordSpacing).toBe(40);
    // Piece 0 rendered = 70 + 2*40 + 5 = 155; starts at 440 -> ends at 285 -> exactGap to b.right (180) = 105!
    expect(cappedWidgets.find(w => w.kind === "gap" && w.side === -4)?.size).toBeCloseTo(105);
  });

  it("does not stretch the last line of a justified paragraph", () => {
    const flow = { align: "justify" as const, segments: [] as Array<{ from: number; to: number; width: number; wordSpacing: number; edge: "left" | "right" }> };
    planRunAroundWidgets(
      [
        { pos: 1, width: 20 },
        { pos: 2, width: 8, space: true },
        { pos: 3, width: 20 },
      ],
      0,
      12,
      () => ({ left: 0, right: 200 }),
      [{ left: 90, right: 130, top: -2, bottom: 14 }],
      "rtl",
      flow,
    );
    expect(flow.segments).toEqual([]);
  });

  it("leaves a one-word justified sliver empty", () => {
    const flow = { align: "justify" as const, segments: [] as Array<{ from: number; to: number; width: number; wordSpacing: number; edge: "left" | "right" }> };
    const glyphs = Array.from({ length: 40 }, (_, index) => (
      index % 2 === 1 ? { pos: index, width: 8, space: true } : { pos: index, width: 18 }
    ));
    planRunAroundWidgets(
      glyphs,
      0,
      12,
      () => ({ left: 0, right: 200 }),
      [{ left: 20, right: 40, top: -2, bottom: 14 }],
      "rtl",
      flow,
    );
    expect(flow.segments.some(segment => segment.edge === "right")).toBe(true);
    expect(flow.segments.some(segment => segment.edge === "left")).toBe(false);
    expect(flow.segments.every(segment => segment.to - segment.from >= 3)).toBe(true);
  });

  it("still wraps two objects when each gap holds one word", () => {
    const glyphs = Array.from({ length: 30 }, (_, index) => (
      index % 2 === 1 ? { pos: index, width: 6, space: true } : { pos: index, width: 22 }
    ));
    const widgets = planRunAroundWidgets(
      glyphs,
      0,
      12,
      () => ({ left: 0, right: 200 }),
      [
        { left: 30, right: 90, top: -2, bottom: 20 },
        { left: 110, right: 170, top: -2, bottom: 20 },
      ],
      "rtl",
      { align: "justify", segments: [] },
    );
    expect(widgets.some(widget => widget.kind === "gap")).toBe(true);
    expect(widgets.some(widget => widget.kind === "break")).toBe(true);
  });

  it("sends the glyphs that remain after page 1 to the page-2 exclusion", () => {
    const glyphs = Array.from({ length: 30 }, (_, index) => ({ pos: index, width: 40 }));
    const pages = { stride: 100, marginTop: 10, contentBottom: 40 };
    const widgets = planRunAroundWidgets(
      glyphs,
      10,
      10,
      () => ({ left: 0, right: 200 }),
      [{ left: 80, right: 120, top: 110, bottom: 140 }],
      "rtl",
      { pages },
    );
    const gaps = widgets.filter(widget => widget.kind === "gap").map(widget => widget.pos);
    expect(gaps[0]).toBe(17);
    expect(gaps.every(pos => pos >= 15)).toBe(true);
    const without = planRunAroundWidgets(
      glyphs,
      10,
      10,
      () => ({ left: 0, right: 200 }),
      [{ left: 80, right: 120, top: 110, bottom: 140 }],
    );
    expect(without.some(widget => widget.kind === "gap")).toBe(false);
  });

  it("narrows edges around a right DocumentImage float so StudioFrame Run Around avoids both exclusions without double offset", () => {
    const glyphs = Array.from({ length: 12 }, (_, index) => ({ pos: index, width: 35 }));
    const widgets = planRunAroundWidgets(
      glyphs,
      0,
      12,
      (_first, lineTop, lineBottom) => {
        const overlapsFloat = typeof lineTop === "number" && typeof lineBottom === "number" && lineBottom > 0.5 && lineTop < 24 - 0.5;
        return overlapsFloat ? { left: 0, right: 240 } : { left: 0, right: 300 };
      },
      [{ left: 100, right: 150, top: 0, bottom: 24 }],
      "rtl",
    );
    const gaps = widgets.filter(widget => widget.kind === "gap");
    expect(gaps.length).toBe(2);
    // On line 1 (2 words * 35 = 70 fit in [150, 240] width 90), the gap spans from ink end (240 - 70 = 170) to 150 + hole (50) => >= 50px, never from 300!
    expect(gaps[0].size).toBeGreaterThanOrEqual(50);
    expect(gaps[0].size).toBeLessThan(100);
    // When StudioFrame overlaps the left edge of the right float ([195, 250]), leadingGap is relative to 240 (45px), not 300 (105px).
    const edgeShiftWidgets = planRunAroundWidgets(
      glyphs,
      0,
      12,
      (_first, lineTop, lineBottom) => {
        const overlapsFloat = typeof lineTop === "number" && typeof lineBottom === "number" && lineBottom > 0.5 && lineTop < 12 - 0.5;
        return overlapsFloat ? { left: 0, right: 240 } : { left: 0, right: 300 };
      },
      [{ left: 195, right: 250, top: 0, bottom: 12 }],
      "rtl",
    );
    expect(edgeShiftWidgets[0]).toMatchObject({ kind: "gap", size: 45 });
  });

  it("handles a left DocumentImage float alongside a StudioFrame in LTR and RTL", () => {
    const glyphs = Array.from({ length: 10 }, (_, index) => ({ pos: index, width: 30 }));
    const ltrWidgets = planRunAroundWidgets(
      glyphs,
      0,
      12,
      (_first, lineTop, lineBottom) => {
        const overlapsFloat = typeof lineTop === "number" && typeof lineBottom === "number" && lineBottom > 0.5 && lineTop < 14 - 0.5;
        return overlapsFloat ? { left: 60, right: 300 } : { left: 0, right: 300 };
      },
      [{ left: 140, right: 190, top: 0, bottom: 14 }],
      "ltr",
    );
    // Left float takes [0, 60]; LTR starts at left=60, fits 2*30=60 in [60, 140] (leftover 20 + 50 hole = 70), then fits [190, 300] (3*30=90), breaking at glyph index 5 onto clear line y=12..24.
    const gap = ltrWidgets.find(widget => widget.kind === "gap");
    const brk = ltrWidgets.find(widget => widget.kind === "break");
    expect(gap).toMatchObject({ pos: 2, size: 70 });
    expect(brk?.pos).toBe(5);
  });
});
