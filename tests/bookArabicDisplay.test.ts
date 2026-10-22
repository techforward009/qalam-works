import { describe, expect, it } from "vitest";
import { displayArabicBookText } from "../app/lib/knowledge/bookArabicDisplay";
import { graphemeBoundaries, paginateMeasuredFlow, reconstructUnit, type ReaderFlowUnit } from "../app/lib/knowledge/bookReaderPagination";

describe("Arabic book glyph display, with immutable source", () => {
  it("displays the Urdu variants with matching Arabic Unicode code points", () => {
    const source = "یَذْكُرُ فِیْهَا عَلَیْهِ وَکِتَابُ اللّٰہِ";
    expect(displayArabicBookText(source)).toBe("يَذْكُرُ فِيْهَا عَلَيْهِ وَكِتَابُ اللّٰهِ");
    expect(displayArabicBookText(source).length).toBe(source.length);
    expect(graphemeBoundaries(displayArabicBookText(source))).toEqual(graphemeBoundaries(source));
    expect(source).toContain("یَ");
    expect(source).toContain("وَکِتَابُ");
  });
  it("preserves Arabic letters already correct, marks, and symbols", () => {
    const source = "عَلَيْهِ الْكِتَابُ هُوَ ۞ (١) ۱ ؑ ﷺ";
    expect(displayArabicBookText(source)).toBe(source);
  });
  it("keeps source fragments and UTF-16 positions reconstructible", async () => {
    const source = ("یَقُولُ عَلَیْهِ وَکِتَابُ اللّٰہِ. ").repeat(36);
    const units: ReaderFlowUnit[] = [{ key: "original:a", kind: "original", paragraphId: "source:p1", language: "ar", text: source }];
    const pages = await paginateMeasuredFlow(units,
      fragments => fragments.reduce((sum, f) => sum + displayArabicBookText(f.text).length, 0) < 140);
    expect(pages.length).toBeGreaterThan(1);
    expect(reconstructUnit(pages.flat(), "original:a")).toBe(source);
    expect(pages.flat().every(f => displayArabicBookText(f.text).length === f.text.length)).toBe(true);
  });
});
