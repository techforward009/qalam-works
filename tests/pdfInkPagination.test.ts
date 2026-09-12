import { describe, expect, it } from "vitest";
import { assertPdfMeasurementLimits, placeInkLines, type InkLine } from "../app/tools/document-studio/utils/pdfInkPagination";

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
});
