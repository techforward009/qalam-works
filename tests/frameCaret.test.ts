import { describe, expect, it } from "vitest";
import { emptyFrameCaretLeft } from "../app/tools/document-studio/utils/frameCaret";

const edges = { left: 5, right: 90, center: 48 };

describe("empty multi-line caret anchor", () => {
  it("leaves a filled line on the glyph measurement", () => {
    expect(emptyFrameCaretLeft("عنوان", 5, "start", "rtl", edges)).toBeNull();
    expect(emptyFrameCaretLeft("عنوان\nدوسری", 6, "justify", "rtl", edges)).toBeNull();
  });

  it("places an empty line from the rendered alignment and the paragraph direction", () => {
    expect(emptyFrameCaretLeft("عنوان\n", 6, "right", "rtl", edges)).toBe(90);
    expect(emptyFrameCaretLeft("عنوان\n", 6, "start", "rtl", edges)).toBe(90);
    expect(emptyFrameCaretLeft("عنوان\n", 6, "center", "rtl", edges)).toBe(48);
    expect(emptyFrameCaretLeft("عنوان\n", 6, "left", "rtl", edges)).toBe(5);
    expect(emptyFrameCaretLeft("عنوان\n", 6, "justify", "rtl", edges)).toBe(90);
    expect(emptyFrameCaretLeft("Hello\n", 6, "justify", "rtl", edges)).toBe(5);
    expect(emptyFrameCaretLeft("Hello\n", 6, "right", "rtl", edges)).toBe(90);
    expect(emptyFrameCaretLeft("Hello\n", 6, "left", "ltr", edges)).toBe(5);
    expect(emptyFrameCaretLeft("", 0, "start", "rtl", edges)).toBe(90);
    expect(emptyFrameCaretLeft("عنوان\n\n", 7, "justify", "rtl", edges)).toBe(90);
  });
});
