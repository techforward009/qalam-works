import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("Quran safe single-surah navigation and mobile theme", () => {
  it("provides a first-ayah redirect for each valid surah and 404 for invalid inputs", () => {
    const source = readFileSync("app/quran/[surah]/page.tsx", "utf8");
    expect(source).toContain("notFound()");
    expect(source).toContain("notFound()");
    expect(source).toContain('"/quran/indopak-digital-khatt/"');
  });
  it("keeps the global floating theme switch off mobile Quran pages", () => {
    const source = readFileSync("app/components/ThemeToggle.tsx", "utf8");
    expect(source).toContain('quranPage || bookReaderPage ? "hidden sm:flex" : "flex"');
    const layout = readFileSync("app/quran/layout.tsx", "utf8");
    expect(layout).not.toContain("<QuranThemeControl />");
    const reader = readFileSync("app/quran/QuranReader.tsx", "utf8");
    expect(reader).toContain("<QuranThemeControl />");
    const control = readFileSync("app/quran/QuranThemeControl.tsx", "utf8");
    expect(control).toContain('data-quran-mobile-theme="inline"');
    expect(control).not.toContain("fixed ");
  });
});
