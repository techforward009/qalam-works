import { describe, expect, it } from "vitest";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { centerSingleLinePadding, measureSingleLineOuterHeightMm, singleLineOuterHeightMm, singleLineOuterHeightPx, singleLineOuterHeightPxFromMeasured, singleLineWrappedOuterHeightMm } from "../app/tools/document-studio/utils/singleLineFrame";

const typography = (bodyFontSizePt: number, defaultRtlFontId: "mehr-nastaliq-web" | "jameel-noori-nastaleeq" | "amiri") => ({
  ...defaultDocumentSettings().typography,
  bodyFontSizePt,
  defaultRtlFontId,
});

describe("single-line frame height", () => {
  it("uses 1.65 Nastaleeq leading plus the existing 1px border and 2px padding", () => {
    expect(singleLineOuterHeightMm(typography(12, "mehr-nastaliq-web"))).toBeCloseTo(8.5725, 4);
    expect(singleLineOuterHeightMm(typography(24, "mehr-nastaliq-web"))).toBeCloseTo(15.5575, 4);
    expect(singleLineOuterHeightMm(typography(12, "jameel-noori-nastaleeq"))).toBeCloseTo(8.5725, 4);
    expect(singleLineOuterHeightMm(typography(24, "jameel-noori-nastaleeq"))).toBeCloseTo(15.5575, 4);
  });

  it("follows a different font ratio instead of the Nastaleeq constants", () => {
    expect(singleLineOuterHeightMm(typography(12, "amiri"))).toBeCloseTo(6.8791667, 4);
    expect(singleLineOuterHeightMm(typography(24, "amiri"))).not.toBeCloseTo(15.5575, 2);
  });

  it("keeps vertical padding paired while centering measured ink", () => {
    expect(centerSingleLinePadding({ top: 2, bottom: 2 }, 1, 5)).toEqual({ top: 4, bottom: 0 });
    expect(centerSingleLinePadding({ top: 2, bottom: 2 }, 3, 3)).toEqual({ top: 2, bottom: 2 });
  });

  it("grows by one leading for each extra wrapped line", () => {
    const type = typography(12, "mehr-nastaliq-web");
    expect(singleLineWrappedOuterHeightMm(type, 1)).toBeCloseTo(8.5725, 4);
    expect(singleLineWrappedOuterHeightMm(type, 2)).toBeCloseTo(15.5575, 4);
    expect(singleLineWrappedOuterHeightMm(typography(24, "mehr-nastaliq-web"), 1)).toBeCloseTo(15.5575, 4);
  });

  it("snaps a measured border box onto the line grid", () => {
    const leading = 12 * 1.65;
    const one = singleLineOuterHeightPx(leading);
    const linePx = leading * (96 / 72);
    const two = one + linePx;
    expect(singleLineOuterHeightPxFromMeasured(leading, 0)).toBeCloseTo(one, 4);
    expect(singleLineOuterHeightPxFromMeasured(leading, 1)).toBeCloseTo(one, 4);
    expect(singleLineOuterHeightPxFromMeasured(leading, two)).toBeCloseTo(two, 4);
    expect(singleLineOuterHeightPxFromMeasured(leading, two + 2)).toBeCloseTo(two, 4);
    expect(singleLineOuterHeightPxFromMeasured(leading, two + linePx)).toBeCloseTo(two + linePx, 4);
  });

  it("falls back to one line when layout is unavailable", () => {
    const type = typography(12, "mehr-nastaliq-web");
    expect(measureSingleLineOuterHeightMm({ text: "", typography: type, outerWidthPx: 200 })).toBeCloseTo(8.5725, 4);
    expect(measureSingleLineOuterHeightMm({ text: "عنوان", typography: type, outerWidthPx: [120, 120.01] })).toBeCloseTo(8.5725, 4);
  });
});
