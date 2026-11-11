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
      page: 1, left: 9.29, right: 40.71, top: 19.65, bottom: 60.35,
    });
    expect(runAroundExclusionMm(box({
      runAround: true, kind: "picture-rect", runAroundLeftMm: 1, runAroundRightMm: 2, runAroundTopMm: 3, runAroundBottomMm: 4,
    }))).toMatchObject({ left: 9, right: 42, top: 17, bottom: 64 });
    expect(runAroundExclusionMm(box({ runAround: true, kind: "text" }))).toMatchObject({ left: 9.29, right: 40.71 });
    for (const kind of ["ellipse", "round-rect", "line", "picture-ellipse", "picture-round-rect"]) {
      expect(runAroundExclusionMm(box({ runAround: true, kind }))).toBeNull();
    }
    expect(runAroundExclusionMm(box({ runAround: true, kind: "text", textShape: "ellipse" }))).toBeNull();
    expect(runAroundExclusionMm(box({ runAround: true, angle1Deg: 15 }))).toBeNull();
    expect(runAroundExclusionMm(box({ runAround: true, angle1Deg: 0 }))).not.toBeNull();
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
});
