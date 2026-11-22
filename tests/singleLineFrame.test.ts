import { describe, expect, it } from "vitest";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { centerSingleLinePadding, singleLineOuterHeightMm, autoExpandOuterHeightPx } from "../app/tools/document-studio/utils/singleLineFrame";

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

describe("fixed-width auto-height expansion", () => {
  it("retains the minimum configured height for short single-line content without rounding drift", () => {
    expect(autoExpandOuterHeightPx({
      minOuterHeightPx: 32.4,
      sizerOffsetHeight: 33,
      sizerClientHeight: 31,
      sizerScrollHeight: 31,
      textareaOffsetHeight: 32,
      textareaClientHeight: 30,
      textareaScrollHeight: 31,
    })).toBe(32.4);
  });

  it("expands to fit wrapped or multiline content measured by the sizer", () => {
    expect(autoExpandOuterHeightPx({
      minOuterHeightPx: 32.4,
      sizerOffsetHeight: 86,
      sizerClientHeight: 84,
      sizerScrollHeight: 84,
      textareaOffsetHeight: 32,
      textareaClientHeight: 30,
      textareaScrollHeight: 84,
    })).toBe(86);
  });

  it("accounts for textarea vertical overflow when the textarea exceeds the sizer", () => {
    expect(autoExpandOuterHeightPx({
      minOuterHeightPx: 32.4,
      sizerOffsetHeight: 58,
      sizerClientHeight: 56,
      sizerScrollHeight: 56,
      textareaOffsetHeight: 58,
      textareaClientHeight: 56,
      textareaScrollHeight: 61,
    })).toBe(63);
  });

  it("shrinks back to shorter content and floors at a custom minimum configured height", () => {
    expect(autoExpandOuterHeightPx({
      minOuterHeightPx: 94.488,
      sizerOffsetHeight: 60,
      sizerClientHeight: 58,
      sizerScrollHeight: 58,
      textareaOffsetHeight: 140,
      textareaClientHeight: 138,
      textareaScrollHeight: 58,
    })).toBe(94.488);
  });
});
