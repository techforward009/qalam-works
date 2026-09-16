import { describe, expect, it } from "vitest";
import {
  assertPdfMeasurementLimits,
  baselineBesideFloat,
  fitHorizontalInk,
  floatExclusionBox,
  inkLinePaintTop,
  mmToCssPx,
  placeInkLines,
  visualLineFrame,
  wrapFrameBesideFloat,
  type InkLine,
} from "../app/tools/document-studio/utils/pdfInkPagination";

const CONTENT_WIDTH = 590.40057053104;
const NORMAL_MARGIN_PX = mmToCssPx(25.4);

const line = (baseline: number, block = 0, top = -15, bottom = 5): InkLine => ({ block, baseline, heading: false, inkTop: top, inkBottom: bottom, inkLeft: 1, inkRight: 99, offset: 0, frameTop: 0, frameBottom: 0, frameLeft: 0, frameRight: 100, metricTop: top, metricBottom: bottom });
describe("measured PDF ink pagination", () => {
  it("preserves exact baseline distances when lines fit", () => {
    expect(placeInkLines([line(20), line(52), line(84)], 100)).toEqual([{ page: 0, baseline: 20 }, { page: 0, baseline: 52 }, { page: 0, baseline: 84 }]);
  });
  it("moves a complete overhanging glyph, retaining the next baseline interval", () => {
    const lines = [line(20), line(88, 0, -20, 18), line(120)];
    const placed = placeInkLines(lines, 100);
    expect(placed).toEqual([{ page: 0, baseline: 20 }, { page: 1, baseline: 21 }, { page: 1, baseline: 53 }]);
    placed.forEach((item, i) => {
      expect(item.baseline + lines[i].inkTop).toBeGreaterThanOrEqual(0);
      expect(item.baseline + lines[i].inkBottom).toBeLessThanOrEqual(100);
    });
  });
  it("keeps a short paragraph and a heading with its next line together", () => {
    expect(placeInkLines([line(20), line(90, 1), line(100, 1)], 100).map(item => item.page)).toEqual([0, 1, 1]);
    expect(placeInkLines([line(20), { ...line(90, 1), heading: true }, line(100, 2)], 100).map(item => item.page)).toEqual([0, 1, 1]);
  });
  it("starts a new page at an authored page or next-page section break", () => {
    expect(placeInkLines([
      line(20),
      { ...line(52), forceBreak: true },
      { ...line(84), forceBreak: true },
    ], 100).map(item => item.page)).toEqual([0, 1, 2]);
  });
  it("does not create pages for an empty document and rejects ink that cannot fit", () => {
    expect(placeInkLines([], 100)).toEqual([]);
    expect(() => placeInkLines([line(100, 0, -100, 20)], 100)).toThrow("export blocked");
  });
  it("enforces production measurement boundaries with line-limit precedence", () => {
    expect(() => assertPdfMeasurementLimits(299, 39_999)).not.toThrow();
    expect(() => assertPdfMeasurementLimits(300, 40_000)).not.toThrow();
    expect(() => assertPdfMeasurementLimits(301, 1)).toThrow("300 visual-line limit");
    expect(() => assertPdfMeasurementLimits(1, 40_001)).toThrow("40000px staging limit");
    expect(() => assertPdfMeasurementLimits(301, 40_001)).toThrow("300 visual-line limit");
  });
  it("A: frame fits content and Nastaliq ink hangs into the physical margin", () => {
    expect(fitHorizontalInk(1, 593, CONTENT_WIDTH, 2, "اردو", 0, CONTENT_WIDTH, NORMAL_MARGIN_PX, NORMAL_MARGIN_PX)).toBe(0);
  });
  it("B: blocks a layout frame that exceeds content width", () => {
    expect(() => fitHorizontalInk(1, 593, CONTENT_WIDTH, 2, "wide", 0, 600, NORMAL_MARGIN_PX, NORMAL_MARGIN_PX)).toThrow("cannot fit the printable horizontal boundary");
  });
  it("C: blocks glyph ink that exceeds the physical page edge", () => {
    expect(() => fitHorizontalInk(
      1,
      CONTENT_WIDTH + NORMAL_MARGIN_PX + 2,
      CONTENT_WIDTH,
      2,
      "off page",
      0,
      CONTENT_WIDTH,
      NORMAL_MARGIN_PX,
      NORMAL_MARGIN_PX,
    )).toThrow("cannot fit the printable horizontal boundary");
  });
  it("D: allows the previous 1..590 near-boundary case", () => {
    expect(fitHorizontalInk(1, 590, CONTENT_WIDTH, 1)).toBe(0);
  });
  it("E: Download PDF image reconstruction preserves source image top", () => {
    const sourceTop = 120;
    const preceding = line(40);
    const image: InkLine = {
      block: 1, heading: false, baseline: sourceTop, offset: 0,
      frameTop: 0, frameBottom: 80, frameLeft: 12, frameRight: 172,
      inkTop: 0, inkBottom: 80, inkLeft: 12, inkRight: 172,
      metricTop: 0, metricBottom: 80, boxTop: 0, boxBottom: 80, image: true,
    };
    const placed = placeInkLines([preceding, image], 800);
    expect(image.offset).toBe(0);
    expect(inkLinePaintTop(image, placed[1])).toBe(sourceTop);
    expect(placed[1].baseline).toBe(sourceTop);
    expect(placed[0].baseline).toBe(40);
  });
  it("F: wrapped image does not overlap preceding text", () => {
    const text = line(40, 0, -15, 5);
    const image: InkLine = {
      block: 1, heading: false, baseline: 50, offset: 0,
      frameTop: 0, frameBottom: 80, frameLeft: 12, frameRight: 172,
      inkTop: 0, inkBottom: 80, inkLeft: 12, inkRight: 172,
      metricTop: 0, metricBottom: 80, boxTop: 0, boxBottom: 80, image: true,
    };
    const placed = placeInkLines([text, image], 800);
    const textBottom = placed[0].baseline + text.inkBottom;
    const imageTop = inkLinePaintTop(image, placed[1]);
    expect(imageTop).toBeGreaterThanOrEqual(textBottom);
    expect(imageTop).toBe(50);
  });
  it("G: wrapped visual lines use the line box, not the parent block", () => {
    const block = visualLineFrame(0, 0, CONTENT_WIDTH, 0, CONTENT_WIDTH);
    expect(block.left).toBe(0);
    expect(block.width).toBe(CONTENT_WIDTH);
    const rtlBeside = visualLineFrame(0, 0, CONTENT_WIDTH, 8, 360);
    expect(rtlBeside.left).toBe(8);
    expect(rtlBeside.width).toBe(360);
    expect(rtlBeside.left + rtlBeside.width).toBeLessThan(CONTENT_WIDTH - 160);
    const ltrBeside = visualLineFrame(0, 0, CONTENT_WIDTH, 180, 400);
    expect(ltrBeside.left).toBe(180);
    expect(ltrBeside.left).toBeGreaterThanOrEqual(160);
    expect(visualLineFrame(0, 0, CONTENT_WIDTH, 10, 0)).toEqual({ left: 0, width: CONTENT_WIDTH });
  });
  it("H: wrap column uses float exclusion, not a full-width hanging glyph box", () => {
    const exclusion = floatExclusionBox(
      { top: 100, right: CONTENT_WIDTH, bottom: 260, left: 400 },
      { top: 4, right: 0, bottom: 12, left: 16 },
    );
    expect(exclusion.left).toBe(384);
    expect(exclusion.bottom).toBe(272);
    expect(baselineBesideFloat(250, exclusion.top, exclusion.bottom)).toBe(true);
    expect(baselineBesideFloat(280, exclusion.top, exclusion.bottom)).toBe(false);
    const frame = wrapFrameBesideFloat(0, 0, CONTENT_WIDTH, exclusion.left, exclusion.right, "right");
    expect(frame).toEqual({ left: 0, width: 384 });
    const hanging = visualLineFrame(0, 0, CONTENT_WIDTH, 0, 580);
    expect(hanging.width).toBe(580);
    expect(frame!.width).toBeLessThan(hanging.width);
    const leftFrame = wrapFrameBesideFloat(0, 0, CONTENT_WIDTH, 0, 180, "left");
    expect(leftFrame).toEqual({ left: 180, width: CONTENT_WIDTH - 180 });
  });
});
