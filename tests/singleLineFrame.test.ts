import { describe, expect, it } from "vitest";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { centerSingleLinePadding, singleLineOuterHeightMm, singleLineOuterWidthPx } from "../app/tools/document-studio/utils/singleLineFrame";

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
});

describe("single-line frame outer width", () => {
  it("accounts for input horizontal padding and borders without double-counting", () => {
    expect(singleLineOuterWidthPx(
      { offsetWidth: 189, clientWidth: 183, scrollWidth: 340 },
      { offsetWidth: 189, clientWidth: 187, scrollWidth: 342 },
    )).toBe(346);
  });

  it("is an exact fixed point once the input and visible text already fit", () => {
    expect(singleLineOuterWidthPx(
      { offsetWidth: 346, clientWidth: 340, scrollWidth: 340 },
      { offsetWidth: 346, clientWidth: 344, scrollWidth: 344 },
    )).toBe(346);
  });

  it("adds only the measured border when clientWidth already includes padding", () => {
    expect(singleLineOuterWidthPx(
      { offsetWidth: 200, clientWidth: 198, scrollWidth: 250 },
      { offsetWidth: 200, clientWidth: 198, scrollWidth: 248 },
    )).toBe(252);
  });
});
