import { resolvePageLayout, resolvePhysicalMargins, clampMarginMm, MARGIN_MIN_MM, MARGIN_MAX_MM } from "../app/tools/document-studio/utils/pageLayout";

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
