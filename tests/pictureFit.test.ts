import { describe, expect, it } from "vitest";
import { fitPictureInBox } from "../app/tools/document-studio/utils/pictureFit";

describe("pictureFit helper", () => {
  it("fits 300x200 into wider box → fits height, centred horizontally", () => {
    // 300x200 has aspect ratio 1.5. Box is 450x200 (aspect ratio 2.25 > 1.5).
    const result = fitPictureInBox(450, 200, 300, 200);
    expect(result.h).toBe(200);
    expect(result.w).toBe(300);
    expect(result.x).toBe(75);
    expect(result.y).toBe(0);
  });

  it("fits 300x200 into taller box → fits width, centred vertically", () => {
    // Box is 300x300 (aspect ratio 1 < 1.5).
    const result = fitPictureInBox(300, 300, 300, 200);
    expect(result.w).toBe(300);
    expect(result.h).toBe(200);
    expect(result.x).toBe(0);
    expect(result.y).toBe(50);
  });

  it("fits 300x200 into same aspect box → exactly fills box with 0 offset", () => {
    const result = fitPictureInBox(600, 400, 300, 200);
    expect(result.w).toBe(600);
    expect(result.h).toBe(400);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("handles physical millimetre coordinates accurately", () => {
    // Box: 60mm x 20mm. Image: 300px x 200px (1.5 aspect).
    // Box aspect is 3.0 > 1.5 => fits height (20mm), w = 20 * 1.5 = 30mm.
    // x = (60 - 30) / 2 = 15mm, y = 0.
    const result = fitPictureInBox(60, 20, 300, 200);
    expect(result.w).toBeCloseTo(30);
    expect(result.h).toBeCloseTo(20);
    expect(result.x).toBeCloseTo(15);
    expect(result.y).toBeCloseTo(0);
  });

  it("handles non-positive dimensions gracefully without NaN", () => {
    const result = fitPictureInBox(0, 0, 300, 200);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.w).toBe(0);
    expect(result.h).toBe(0);
    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
  });
});
