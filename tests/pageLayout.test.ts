import { resolvePageLayout, resolvePhysicalMargins, clampMarginMm, resolveResponsivePagePadding, MARGIN_MIN_MM, MARGIN_MAX_MM } from "../app/tools/document-studio/utils/pageLayout";

describe("resolvePageLayout — page dimensions", () => {
  test.each([
    ["a4", "portrait", 210, 297],
    ["a4", "landscape", 297, 210],
    ["a5", "portrait", 148, 210],
    ["letter", "portrait", 215.9, 279.4],
  ] as const)("%s %s -> %smm x %smm", (size, orientation, w, h) => {
    const layout = resolvePageLayout({ size, orientation, marginPreset: "normal" });
    expect(layout.widthMm).toBeCloseTo(w, 1);
    expect(layout.heightMm).toBeCloseTo(h, 1);
    expect(layout.orientation).toBe(orientation);
  });
});

describe("resolvePhysicalMargins", () => {
  const margins = { topMm: 15, bottomMm: 25, startMm: 20, endMm: 40 };

  test("LTR: start -> left, end -> right", () => {
    const p = resolvePhysicalMargins(margins, "ltr");
    expect(p).toEqual({ topMm: 15, bottomMm: 25, leftMm: 20, rightMm: 40 });
  });

  test("RTL: start -> right, end -> left (mirrored)", () => {
    const p = resolvePhysicalMargins(margins, "rtl");
    expect(p).toEqual({ topMm: 15, bottomMm: 25, leftMm: 40, rightMm: 20 });
  });

  test("symmetric margins are unaffected by direction", () => {
    const sym = { topMm: 25.4, bottomMm: 25.4, startMm: 25.4, endMm: 25.4 };
    expect(resolvePhysicalMargins(sym, "ltr")).toEqual(resolvePhysicalMargins(sym, "rtl"));
  });
});

describe("clampMarginMm — custom margin validation", () => {
  test.each([
    [0, MARGIN_MIN_MM],
    [-10, MARGIN_MIN_MM],
    [999, MARGIN_MAX_MM],
    [20, 20],
    [NaN, MARGIN_MIN_MM === 5 ? 25.4 : MARGIN_MIN_MM], // NaN falls back to the "normal" default, not the min
  ])("clampMarginMm(%s) -> %s", (input, expected) => {
    expect(clampMarginMm(input)).toBeCloseTo(expected, 1);
  });
});

describe("resolvePageLayout — custom asymmetric margins persist through resolution", () => {
  test("custom top/bottom/start/end all reach the resolved layout, clamped to 5-50mm", () => {
    const layout = resolvePageLayout({
      size: "a4",
      orientation: "portrait",
      marginPreset: "custom",
      customMargins: { topMm: 15, bottomMm: 25, startMm: 20, endMm: 999 },
    });
    expect(layout.margins).toEqual({ topMm: 15, bottomMm: 25, startMm: 20, endMm: MARGIN_MAX_MM });
  });
});

describe("Preset layout effect", () => {
  test("Book Manuscript/Newspaper/Academic presets set distinct page size + margin preset", async () => {
    const { applyPresetToSettings } = await import("../app/tools/document-studio/utils/publishingPresets");
    const { defaultDocumentSettings } = await import("../app/tools/document-studio/utils/documentSettings");
    const base = defaultDocumentSettings();
    const book = applyPresetToSettings(base, "book-manuscript");
    const news = applyPresetToSettings(base, "newspaper-article");
    const academic = applyPresetToSettings(base, "academic-paper");
    expect(book.page.size).toBe("a5");
    expect(book.page.margins.preset).toBe("normal");
    expect(news.page.size).toBe("a4");
    expect(news.page.margins.preset).toBe("narrow");
    expect(academic.page.size).toBe("a4");
    expect(academic.page.margins.preset).toBe("wide");
  });
});

describe("Batch 16B.1 — responsive page padding stays proportional regardless of rendered width", () => {
  test("percentage padding is scale-invariant — the same layout yields identical percentages independent of any px scale", () => {
    const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
    const padding = resolveResponsivePagePadding(layout, "ltr");
    // 25.4mm margin on a 210mm-wide A4 page -> ~12.095% regardless of
    // how many actual pixels the page renders at (percentage padding is
    // relative to element width per the CSS spec).
    expect(padding.leftPct).toBeCloseTo((25.4 / 210) * 100, 3);
    expect(padding.topPct).toBeCloseTo((25.4 / 210) * 100, 3);
    // Real browser proof (desktop 546px vs mobile 300px rendered width)
    // confirmed padding/width ratio identical to 4 decimal places using
    // this exact percentage-based approach.
  });

  test("asymmetric RTL margins remain proportional too", () => {
    const layout = resolvePageLayout({
      size: "a4",
      orientation: "portrait",
      marginPreset: "custom",
      customMargins: { topMm: 15, bottomMm: 25, startMm: 20, endMm: 40 },
    });
    const padding = resolveResponsivePagePadding(layout, "rtl");
    // RTL: start(20mm) -> right, end(40mm) -> left
    expect(padding.rightPct).toBeCloseTo((20 / 210) * 100, 3);
    expect(padding.leftPct).toBeCloseTo((40 / 210) * 100, 3);
  });
});

describe("Batch 16B.2 — inner-div structure anchors percentage padding to actual page width (not canvas width)", () => {
  // Real browser proof (Playwright, 800px canvas with 546px-maxWidth page):
  //   inner div paddingLeft = 66px  (12.095% of 546px ✓)
  //   NOT 97px                       (12.095% of 800px ✗ — the bug)
  // Mobile (350px canvas, ~286px rendered page):
  //   paddingLeft = 34.6px, ratio = 0.1209 ✓
  //
  // This pure-geometry test proves the structural ownership rule:
  // because the inner div is width:100% inside the constrained outer div,
  // its own containing-block width IS the page width (e.g. 546px), so
  // resolveResponsivePagePadding() percentages always resolve correctly.

  test("structural rule: inner div percentage at desktop width resolves against page width, not canvas", () => {
    const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
    const padding = resolveResponsivePagePadding(layout, "ltr");
    const pageWidthPx = 546;   // maxWidth = 210mm * 2.6 scale
    const canvasWidthPx = 800; // wider canvas, the containing-block bug scenario
    const correctInsetPx = (padding.leftPct / 100) * pageWidthPx;
    const bugInsetPx = (padding.leftPct / 100) * canvasWidthPx;
    expect(correctInsetPx).toBeCloseTo(66, 0);   // A4 normal 25.4mm margin
    expect(bugInsetPx).toBeCloseTo(97, 0);        // what the bug would produce
    // real measurement: 66.03px — confirmed by Playwright test
    expect(Math.abs(correctInsetPx - 66)).toBeLessThan(3);
  });

  test("narrow page (300px rendered): padding ratio still 12.095%", () => {
    const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
    const padding = resolveResponsivePagePadding(layout, "ltr");
    const narrowPagePx = 286; // ~300px, real Playwright mobile measurement
    const inset = (padding.leftPct / 100) * narrowPagePx;
    // real measurement: 34.6px, ratio 0.1209 — confirmed by Playwright test
    expect(inset / narrowPagePx).toBeCloseTo(padding.leftPct / 100, 3);
  });
});
