import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shrinkMushafScale } from "../app/quran/madinah/fitMushafScale";

describe("Madinah mobile line fit", () => {
  it("uses a smaller mobile divisor, caps scale, and tightens side padding", () => {
    const css = readFileSync("app/quran/madinah/reader.module.css", "utf8");
    expect(css).toContain("font-size:calc((100cqi / 21) * var(--mushaf-scale,1))");
    expect(css).toContain("calc((100cqi / 16) * min(var(--mushaf-scale, 1), 1))");
    expect(css).toContain("padding:24px 12px");
    expect(css).not.toContain("100cqi / 12.5");
    expect(css).not.toContain("padding:24px 20px");
    const reader = readFileSync("app/quran/madinah/MadinahReader.tsx", "utf8");
    expect(reader).toContain("new ResizeObserver");
    expect(reader).toContain("shrinkMushafScale");
    expect(reader).toContain('matchMedia("(max-width: 600px)")');
    expect(reader).toContain('data-mushaf-line="true"');
    expect(reader).toContain("Math.min(scale, 1)");
    expect(reader).toContain("scrollWidth > line.clientWidth");
  });

  it("shrinks only lines that overflow their box", () => {
    expect(shrinkMushafScale(1, [{ scrollWidth: 622, clientWidth: 622 }])).toBe(1);
    expect(shrinkMushafScale(1.12, [{ scrollWidth: 622, clientWidth: 622 }])).toBe(1.12);
    expect(shrinkMushafScale(1, [{ scrollWidth: 101, clientWidth: 100 }])).toBe(1);
    expect(shrinkMushafScale(1, [
      { scrollWidth: 200, clientWidth: 344 },
      { scrollWidth: 360, clientWidth: 344 },
    ])).toBeCloseTo(344 / 360);
    expect(shrinkMushafScale(1.12, [{ scrollWidth: 486, clientWidth: 344 }])).toBeCloseTo(1.12 * 344 / 486);
    expect(shrinkMushafScale(1, [{ scrollWidth: 2000, clientWidth: 100 }])).toBe(0.4);
  });
});
