import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_BLOB_FONT_FAMILIES, publicBlobFontUrl } from "../app/tools/document-studio/utils/publicBlobFontCatalog";
import { splitTafsirTypography } from "../app/quran/reader/tafsirTypography";

const source = readFileSync("app/quran/QuranTafsirPage.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

describe("Tafsir Urdu body uses Mehr and does not load Alvi", () => {
  it("renders Tafsir Urdu in Mehr Nastaliq Web without an Alvi face", () => {
    expect(PUBLIC_BLOB_FONT_FAMILIES.some((font) => font.id === "alvi-nastaleeq")).toBe(false);
    expect(PUBLIC_BLOB_FONT_FAMILIES.some((font) => font.id === "mehr-nastaliq-web")).toBe(true);
    expect(() => publicBlobFontUrl("Alvi_Nastaleeq.woff2")).toThrow(/Unapproved/);
    expect(publicBlobFontUrl("MehrNastaliqWeb.woff2")).toBe("/fonts/MehrNastaliqWeb.woff2");
    expect(css).not.toContain('font-family:"Alvi Nastaleeq"');
    expect(css).not.toContain("Alvi_Nastaleeq.woff2");
    expect(css).toContain("MehrNastaliqWeb.woff2");
    expect(source).toContain('fontFamily: \'"Mehr Nastaliq Web", "Noto Nastaliq Urdu", serif\'');
    expect(source).not.toContain("Alvi Nastaleeq");
  });

  it("keeps Scheherazade on Arabic quotations", () => {
    // Urdu is conditional, so the attribute is an expression rather than a hardcoded "true".
    expect(source).toContain("data-tafsir-urdu-text={language === \"ur\" ? \"true\" : undefined}");
    expect(source).toContain('data-tafsir-arabic="true"');
    expect(source).toContain('fontFamily: \'"Qalam Tafsir Scheherazade", serif\'');
    expect(source).not.toContain('fontFamily: \'var(--font-amiri), "Amiri"');
  });

  it("preserves every source character through Urdu/Arabic display segmentation", () => {
    const original = "اصل اردو عبارت — بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ\nپھر فارسی و اردو تفسیر";
    expect(splitTafsirTypography(original).map((run) => run.text).join("")).toBe(original);
  });
});
