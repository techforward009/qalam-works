import { describe, expect, it } from "vitest";
import { isUndraggedShape } from "../app/tools/document-studio/components/StudioObjectLayer";

describe("shape click-versus-drag threshold", () => {
  it.each(["rect", "ellipse", "round-rect", "line"])("%s ignores clicks and tiny two-axis movements", (_tool) => {
    expect(isUndraggedShape(0, 0)).toBe(true);
    expect(isUndraggedShape(3.99, -3.99)).toBe(true);
    expect(isUndraggedShape(-3.99, 3.99)).toBe(true);
    expect(isUndraggedShape(4, 0)).toBe(false);
    expect(isUndraggedShape(0, -4)).toBe(false);
    expect(isUndraggedShape(-4, 4)).toBe(false);
  });
});
