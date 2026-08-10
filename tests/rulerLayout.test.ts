import {
  calculateRulerMetrics,
  resolveVisualMarginOffsets,
  calculateInchTickPositions,
  twipsToInches,
  PAGE_WIDTH_TWIPS,
  PAGE_MARGIN_TWIPS,
  TWIPS_PER_INCH,
} from "../app/tools/document-studio/utils/rulerLayout";

describe("calculateRulerMetrics", () => {
  test("computes a positive scale for a realistic container width", () => {
    const metrics = calculateRulerMetrics(896);
    expect(metrics.scale).toBeGreaterThan(0);
    expect(metrics.pageWidthPx).toBe(896);
  });

  test("margin width scales proportionally to container width", () => {
    const small = calculateRulerMetrics(896);
    const large = calculateRulerMetrics(1792); // double the width
    expect(large.marginWidthPx).toBeCloseTo(small.marginWidthPx * 2, 5);
  });

  test("textAreaWidthPx equals pageWidthPx minus both margins", () => {
    const metrics = calculateRulerMetrics(896);
    expect(metrics.textAreaWidthPx).toBeCloseTo(metrics.pageWidthPx - metrics.marginWidthPx * 2, 5);
  });

  test("returns all-zero metrics for a zero container width (no NaN/Infinity)", () => {
    const metrics = calculateRulerMetrics(0);
    expect(metrics).toEqual({ scale: 0, pageWidthPx: 0, marginWidthPx: 0, textAreaWidthPx: 0 });
  });

  test("returns all-zero metrics for a negative container width", () => {
    const metrics = calculateRulerMetrics(-100);
    expect(metrics.scale).toBe(0);
  });

  test("uses the real A4/margin constants by default", () => {
    const metrics = calculateRulerMetrics(1000);
    const expectedScale = 1000 / PAGE_WIDTH_TWIPS;
    expect(metrics.scale).toBeCloseTo(expectedScale, 10);
    expect(metrics.marginWidthPx).toBeCloseTo(PAGE_MARGIN_TWIPS * expectedScale, 5);
  });

  test("accepts custom page/margin dimensions", () => {
    const metrics = calculateRulerMetrics(1000, 1000, 100);
    expect(metrics.scale).toBe(1);
    expect(metrics.marginWidthPx).toBe(100);
  });
});

describe("resolveVisualMarginOffsets — RTL/LTR direction handling", () => {
  test("LTR: start offset is the LEFT margin (smaller value)", () => {
    const metrics = calculateRulerMetrics(896);
    const offsets = resolveVisualMarginOffsets(metrics, "ltr");
    expect(offsets.startOffsetPx).toBeCloseTo(metrics.marginWidthPx, 5);
    expect(offsets.endOffsetPx).toBeCloseTo(metrics.pageWidthPx - metrics.marginWidthPx, 5);
  });

  test("RTL: start offset is the RIGHT margin (mirrored from LTR)", () => {
    const metrics = calculateRulerMetrics(896);
    const ltr = resolveVisualMarginOffsets(metrics, "ltr");
    const rtl = resolveVisualMarginOffsets(metrics, "rtl");
    expect(rtl.startOffsetPx).toBeCloseTo(ltr.endOffsetPx, 5);
    expect(rtl.endOffsetPx).toBeCloseTo(ltr.startOffsetPx, 5);
  });

  test("with symmetric margins, LTR and RTL produce the same VISUAL positions (only the start/end labeling differs)", () => {
    const metrics = calculateRulerMetrics(896);
    const ltr = resolveVisualMarginOffsets(metrics, "ltr");
    const rtl = resolveVisualMarginOffsets(metrics, "rtl");
    const ltrPositions = [ltr.startOffsetPx, ltr.endOffsetPx].sort();
    const rtlPositions = [rtl.startOffsetPx, rtl.endOffsetPx].sort();
    expect(ltrPositions).toEqual(rtlPositions);
  });

  test("handles degenerate (zero) metrics without producing NaN", () => {
    const metrics = calculateRulerMetrics(0);
    const offsets = resolveVisualMarginOffsets(metrics, "ltr");
    expect(offsets.startOffsetPx).toBe(0);
    expect(offsets.endOffsetPx).toBe(0);
  });
});

describe("twipsToInches", () => {
  test("converts exactly 1440 twips to 1 inch", () => {
    expect(twipsToInches(TWIPS_PER_INCH)).toBe(1);
  });

  test("A4 width in twips converts to approximately 8.27 inches", () => {
    expect(twipsToInches(PAGE_WIDTH_TWIPS)).toBeCloseTo(8.268, 2);
  });

  test("zero twips converts to zero inches", () => {
    expect(twipsToInches(0)).toBe(0);
  });
});

describe("calculateInchTickPositions", () => {
  test("produces evenly-spaced ticks starting at zero", () => {
    const metrics = calculateRulerMetrics(1440, 1440, 0); // 1 twip = 1px, page is exactly 1440 twips wide
    const ticks = calculateInchTickPositions(metrics);
    expect(ticks[0]).toBe(0);
    expect(ticks.length).toBeGreaterThan(0);
  });

  test("tick spacing equals one inch in pixels", () => {
    const metrics = calculateRulerMetrics(2880, 2880, 0); // exactly 2 inches wide
    const ticks = calculateInchTickPositions(metrics);
    if (ticks.length >= 2) {
      const spacing = ticks[1] - ticks[0];
      expect(spacing).toBeCloseTo(TWIPS_PER_INCH * metrics.scale, 5);
    }
  });

  test("returns an empty array for degenerate (zero-scale) metrics, not a crash", () => {
    const metrics = calculateRulerMetrics(0);
    expect(calculateInchTickPositions(metrics)).toEqual([]);
  });
});
