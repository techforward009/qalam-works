import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("Tafsir Namoona Mehr Nastaliq preview", () => {
  const style = readFileSync("app/globals.css", "utf8");
  const component = readFileSync("app/quran/QuranTafsirPage.tsx", "utf8");
  const font = readFileSync("public/fonts/MehrNastaliqWeb.woff");

  test("ships a real web-open-font binary, not an empty or misleading fallback", () => {
    expect(font.toString("ascii", 0, 4)).toBe("wOFF");
    expect(font.byteLength).toBeGreaterThan(30_000);
    expect(font.byteLength).toBeLessThan(250_000);
    expect(style).toContain('font-family: "Qalam Tafsir Mehr"');
    expect(style).toContain('url("/fonts/MehrNastaliqWeb.woff")');
    expect(style).toContain("font-display: swap");
  });

  test("only the Namoona UI opts into the font; Arabic stays Amiri", () => {
    expect(component).toContain('fontFamily: \'"Qalam Tafsir Mehr"');
    expect(component).toContain('data-tafsir-urdu-text="true"');
    expect(component).toContain('data-tafsir-arabic="true"');
    expect(component).toContain('fontFamily: \'var(--font-amiri), "Amiri"');
    expect(component).not.toContain('fontFamily: \'"Jameel Noori Nastaleeq"');
  });

  test("retains Mehr creator attribution and avoids changing the tafsir corpus", () => {
    expect(style).toContain("Muhammad Zeeshan Nasar");
    expect(style).toContain("Creative Commons Attribution-ShareAlike");
    expect(component).toContain("mehrtype.com/product/mehr-nastaliq-web/");
    expect(component).toContain("splitTafsirTypography");
    expect(component).toContain("{run.text}");
  });
});
