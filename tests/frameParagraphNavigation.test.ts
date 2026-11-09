import { describe, expect, it } from "vitest";
import { frameParagraphNavigationOffset, frameParagraphNavigationSelection, frameParagraphStarts } from "../app/tools/document-studio/utils/frameParagraphNavigation";

// P0 "ایک دو" (0-5), "\n" at 6, P1 empty at 7, "\n" at 7, P2 "abc" (8-10), "\n" 11, P3 "تین" 12-14
const text = "ایک دو\n\nabc\nتین";

describe("text box paragraph navigation (main-story rules)", () => {
  it("finds logical paragraph starts including empty paragraphs", () => {
    expect(frameParagraphStarts(text)).toEqual([0, 7, 8, 12]);
    expect(frameParagraphStarts("")).toEqual([0]);
  });

  it("Ctrl+Up goes to the current paragraph start, then the previous one, then text start", () => {
    expect(frameParagraphNavigationOffset(text, 10, "ArrowUp")).toBe(8);
    expect(frameParagraphNavigationOffset(text, 8, "ArrowUp")).toBe(7);
    expect(frameParagraphNavigationOffset(text, 7, "ArrowUp")).toBe(0);
    expect(frameParagraphNavigationOffset(text, 3, "ArrowUp")).toBe(0);
    expect(frameParagraphNavigationOffset(text, 0, "ArrowUp")).toBe(0);
    expect(frameParagraphNavigationOffset(text, text.length, "ArrowUp")).toBe(12);
  });

  it("Ctrl+Down goes to the next paragraph start, then text end", () => {
    expect(frameParagraphNavigationOffset(text, 0, "ArrowDown")).toBe(7);
    expect(frameParagraphNavigationOffset(text, 3, "ArrowDown")).toBe(7);
    expect(frameParagraphNavigationOffset(text, 7, "ArrowDown")).toBe(8);
    expect(frameParagraphNavigationOffset(text, 9, "ArrowDown")).toBe(12);
    expect(frameParagraphNavigationOffset(text, 13, "ArrowDown")).toBe(text.length);
    expect(frameParagraphNavigationOffset("", 0, "ArrowDown")).toBe(0);
  });

  it("collapses without Shift and moves from the selection head", () => {
    expect(frameParagraphNavigationSelection(text, 2, 9, "forward", "ArrowDown", false)).toEqual({ start: 12, end: 12, direction: "none" });
    expect(frameParagraphNavigationSelection(text, 2, 9, "backward", "ArrowDown", false)).toEqual({ start: 7, end: 7, direction: "none" });
  });

  it("Shift keeps the anchor and extends like TextSelection.between", () => {
    expect(frameParagraphNavigationSelection(text, 3, 3, "none", "ArrowDown", true)).toEqual({ start: 3, end: 7, direction: "forward" });
    expect(frameParagraphNavigationSelection(text, 3, 7, "forward", "ArrowDown", true)).toEqual({ start: 3, end: 8, direction: "forward" });
    expect(frameParagraphNavigationSelection(text, 9, 9, "none", "ArrowUp", true)).toEqual({ start: 8, end: 9, direction: "backward" });
    expect(frameParagraphNavigationSelection(text, 8, 9, "backward", "ArrowUp", true)).toEqual({ start: 7, end: 9, direction: "backward" });
    // head crosses back over the anchor
    expect(frameParagraphNavigationSelection(text, 8, 12, "forward", "ArrowUp", true)).toEqual({ start: 8, end: 8, direction: "none" });
  });
});
