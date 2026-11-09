import { describe, expect, it } from "vitest";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { centerSingleLinePadding, singleLineOuterHeightMm } from "../app/tools/document-studio/utils/singleLineFrame";

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
