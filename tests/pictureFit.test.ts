import { describe, expect, it } from "vitest";
import {
  PICTURE_JPEG_QUALITY,
  PICTURE_MAX_LONG_EDGE,
  PICTURE_PNG_KEEP_BYTES,
  PICTURE_SOURCE_HARD_CAP_BYTES,
  fitPictureInBox,
  pictureEncoding,
  pictureOutputSize,
} from "../app/tools/document-studio/utils/pictureFit";

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

describe("picture downscale size math", () => {
  it("exports the long-edge, JPEG quality, PNG keep limit, and source hard cap", () => {
    expect(PICTURE_MAX_LONG_EDGE).toBe(2000);
    expect(PICTURE_JPEG_QUALITY).toBeCloseTo(0.85);
    expect(PICTURE_PNG_KEEP_BYTES).toBe(2 * 1024 * 1024);
    expect(PICTURE_SOURCE_HARD_CAP_BYTES).toBe(25 * 1024 * 1024);
  });

  it("shrinks the long side to 2000px and keeps the aspect ratio", () => {
    expect(pictureOutputSize(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(pictureOutputSize(1000, 4000)).toEqual({ width: 500, height: 2000 });
    expect(pictureOutputSize(3000, 1000)).toEqual({ width: 2000, height: 667 });
  });

  it("does not upscale images that already fit", () => {
    expect(pictureOutputSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(pictureOutputSize(2000, 2000)).toEqual({ width: 2000, height: 2000 });
    expect(pictureOutputSize(2000, 100)).toEqual({ width: 2000, height: 100 });
  });

  it("returns zeros for non-positive or non-finite dimensions", () => {
    expect(pictureOutputSize(0, 400)).toEqual({ width: 0, height: 0 });
    expect(pictureOutputSize(400, -10)).toEqual({ width: 0, height: 0 });
    expect(pictureOutputSize(Number.NaN, 100)).toEqual({ width: 0, height: 0 });
    expect(pictureOutputSize(100, Number.POSITIVE_INFINITY)).toEqual({ width: 0, height: 0 });
  });

  it("keeps PNG only when the image has transparency and the PNG is small enough", () => {
    expect(pictureEncoding({ hasTransparency: true, pngBytes: 1024 })).toBe("png");
    expect(pictureEncoding({ hasTransparency: true, pngBytes: PICTURE_PNG_KEEP_BYTES })).toBe("png");
    expect(pictureEncoding({ hasTransparency: true, pngBytes: PICTURE_PNG_KEEP_BYTES + 1 })).toBe("jpeg");
    expect(pictureEncoding({ hasTransparency: false, pngBytes: 1024 })).toBe("jpeg");
    expect(pictureEncoding({ hasTransparency: true, pngBytes: 0 })).toBe("jpeg");
  });
});
