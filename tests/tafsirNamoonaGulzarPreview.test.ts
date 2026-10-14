import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_BLOB_FONT_FAMILIES, publicBlobFontUrl } from "../app/tools/document-studio/utils/publicBlobFontCatalog";
import { splitTafsirTypography } from "../app/quran/reader/tafsirTypography";

const source = readFileSync("app/quran/QuranTafsirPage.tsx", "utf8");
const stylesheet = readFileSync("app/globals.css", "utf8");

describe("Tafsir Namoona Gulzar font trial", () => {
  it("reuses the existing approved Gulzar font asset", () => {
    expect(PUBLIC_BLOB_FONT_FAMILIES.some((font) => font.id === "gulzar")).toBe(true);
    expect(publicBlobFontUrl("Gulzar-Regular.woff2")).toContain("/Gulzar-Regular.woff2");
    expect(stylesheet).toContain('font-family: "Gulzar"');
    expect(stylesheet).toContain('Gulzar-Regular.woff2');
    expect(source).toContain('fontFamily: \'"Gulzar", "Noto Nastaliq Urdu", serif\'');
  });

  it("retains Arabic Amiri independently from the Urdu text", () => {
    expect(source).toContain('data-tafsir-urdu-text="true"');
    expect(source).toContain('data-tafsir-arabic="true"');
    expect(source).toContain('fontFamily: \'var(--font-amiri), "Amiri"');
  });

  it("never edits or normalizes the original tafsir text when styling runs", () => {
    const original = "اصل اردو تفسیر بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ — پھر اردو\nدوسرا پیراگراف";
    expect(splitTafsirTypography(original).map((run) => run.text).join("")).toBe(original);
  });
});
