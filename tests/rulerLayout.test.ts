import { calculateRulerMetrics, resolveVisualMarginOffsets, calculateInchTickPositions, twipsToInches, TWIPS_PER_INCH } from "../app/tools/document-studio/utils/rulerLayout";
import { resolvePageLayout, mmToTwips } from "../app/tools/document-studio/utils/pageLayout";

const a4Normal = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
const a5Narrow = resolvePageLayout({ size: "a5", orientation: "portrait", marginPreset: "narrow" });
const a4Landscape = resolvePageLayout({ size: "a4", orientation: "landscape", marginPreset: "normal" });
const customAsymmetric = resolvePageLayout({
  size: "a4",
  orientation: "portrait",
  marginPreset: "custom",
  customMargins: { topMm: 15, bottomMm: 25, startMm: 20, endMm: 40 },
});

describe("calculateRulerMetrics", () => {
  test("degenerate container width returns all-zero metrics", () => {
    const m = calculateRulerMetrics(0, a4Normal, "ltr");
    expect(m).toEqual({ scale: 0, pageWidthPx: 0, leftMarginPx: 0, rightMarginPx: 0, textAreaWidthPx: 0 });
  });

  test("A4 normal LTR: symmetric margins, positive text area", () => {
    const m = calculateRulerMetrics(1000, a4Normal, "ltr");
    expect(m.leftMarginPx).toBeCloseTo(m.rightMarginPx, 1);
    expect(m.textAreaWidthPx).toBeGreaterThan(0);
    expect(m.textAreaWidthPx).toBeCloseTo(1000 - m.leftMarginPx - m.rightMarginPx, 1);
  });

  test("A5 narrow uses a smaller page width than A4", () => {
    const mA4 = calculateRulerMetrics(1000, a4Normal, "ltr");
    const mA5 = calculateRulerMetrics(1000, a5Narrow, "ltr");
    // Same container width but A5's real page is narrower, so scale differs.
    expect(mA5.scale).not.toBeCloseTo(mA4.scale, 5);
  });

  test("A4 landscape has a wider page (in mm) than portrait, reflected in a smaller scale for the same container", () => {
    const mPortrait = calculateRulerMetrics(1000, a4Normal, "ltr");
    const mLandscape = calculateRulerMetrics(1000, a4Landscape, "ltr");
    expect(mLandscape.scale).toBeLessThan(mPortrait.scale);
  });
});

describe("asymmetric margins — LTR vs RTL physical mapping", () => {
  test("LTR: start(20mm) -> left, end(40mm) -> right", () => {
    const m = calculateRulerMetrics(1000, customAsymmetric, "ltr");
    const expectedLeftPx = mmToTwips(20) * m.scale;
    const expectedRightPx = mmToTwips(40) * m.scale;
    expect(m.leftMarginPx).toBeCloseTo(expectedLeftPx, 1);
    expect(m.rightMarginPx).toBeCloseTo(expectedRightPx, 1);
  });

  test("RTL: start(20mm) -> right, end(40mm) -> left (physically mirrored from LTR)", () => {
    const m = calculateRulerMetrics(1000, customAsymmetric, "rtl");
    const expectedLeftPx = mmToTwips(40) * m.scale;
    const expectedRightPx = mmToTwips(20) * m.scale;
    expect(m.leftMarginPx).toBeCloseTo(expectedLeftPx, 1);
    expect(m.rightMarginPx).toBeCloseTo(expectedRightPx, 1);
  });
});

describe("resolveVisualMarginOffsets", () => {
  test("LTR: start offset is the left margin", () => {
    const m = calculateRulerMetrics(1000, customAsymmetric, "ltr");
    const offsets = resolveVisualMarginOffsets(m, "ltr");
    expect(offsets.startOffsetPx).toBeCloseTo(m.leftMarginPx, 1);
    expect(offsets.endOffsetPx).toBeCloseTo(m.pageWidthPx - m.rightMarginPx, 1);
  });

  test("RTL: start offset is on the right side of the ruler", () => {
    const m = calculateRulerMetrics(1000, customAsymmetric, "rtl");
    const offsets = resolveVisualMarginOffsets(m, "rtl");
    expect(offsets.startOffsetPx).toBeCloseTo(m.pageWidthPx - m.rightMarginPx, 1);
    expect(offsets.endOffsetPx).toBeCloseTo(m.leftMarginPx, 1);
  });
});

describe("twipsToInches / calculateInchTickPositions", () => {
  test("converts twips to inches", () => {
    expect(twipsToInches(TWIPS_PER_INCH)).toBe(1);
    expect(twipsToInches(TWIPS_PER_INCH * 2)).toBe(2);
  });

  test("zero-scale metrics produce no ticks", () => {
    const m = calculateRulerMetrics(0, a4Normal, "ltr");
    expect(calculateInchTickPositions(m)).toEqual([]);
  });

  test("ticks are evenly spaced and start at 0", () => {
    const m = calculateRulerMetrics(1000, a4Normal, "ltr");
    const ticks = calculateInchTickPositions(m);
    expect(ticks[0]).toBe(0);
    if (ticks.length > 1) {
      const spacing = ticks[1] - ticks[0];
      for (let i = 2; i < ticks.length; i++) {
        expect(ticks[i] - ticks[i - 1]).toBeCloseTo(spacing, 5);
      }
    }
  });
});
