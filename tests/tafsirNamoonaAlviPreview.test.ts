import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_BLOB_FONT_FAMILIES, publicBlobFontUrl } from "../app/tools/document-studio/utils/publicBlobFontCatalog";
import { splitTafsirTypography } from "../app/quran/reader/tafsirTypography";

const source = readFileSync("app/quran/QuranTafsirPage.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

describe("Tafsir Namoona Alvi Nastaleeq font trial", () => {
  it("uses the already-approved Alvi Nastaleeq font without adding another asset", () => {
    expect(PUBLIC_BLOB_FONT_FAMILIES.some((font) => font.id === "alvi-nastaleeq")).toBe(true);
    expect(publicBlobFontUrl("Alvi_Nastaleeq.woff2")).toContain("/Alvi_Nastaleeq.woff2");
    expect(css).toContain('font-family:"Alvi Nastaleeq"');
    expect(css).toContain("Alvi_Nastaleeq.woff2");
    expect(source).toContain('fontFamily: \'"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif\'');
  });

  it("scopes Alvi to Tafsir Urdu and keeps Scheherazade on Arabic quotations", () => {
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
