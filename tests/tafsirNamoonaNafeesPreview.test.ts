import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_BLOB_FONT_FAMILIES, publicBlobFontUrl } from "../app/tools/document-studio/utils/publicBlobFontCatalog";
import { splitTafsirTypography } from "../app/quran/reader/tafsirTypography";

const source = readFileSync("app/quran/QuranTafsirPage.tsx", "utf8");
const style = readFileSync("app/globals.css", "utf8");

describe("Tafsir Namoona: Nafees Nastaleeq preview", () => {
  it("uses the existing approved Nafees WOFF2 asset, without creating a new font", () => {
    expect(PUBLIC_BLOB_FONT_FAMILIES.some((f) => f.id === "nafees-nastaleeq")).toBe(true);
    expect(style).toContain('font-family: "Qalam Tafsir Nafees"');
    expect(style).toContain(publicBlobFontUrl("NafeesNastaleeq.woff2"));
    expect(style).toContain("font-display: swap");
  });

  it("scopes Nafees to Urdu Tafsir, retains Amiri Arabic, and leaves Quran text unchanged", () => {
    expect(source).toContain('fontFamily: \'"Qalam Tafsir Nafees"');
    expect(source).toContain('data-tafsir-urdu-text="true"');
    expect(source).toContain('data-tafsir-arabic="true"');
    expect(source).toContain('fontFamily: \'var(--font-amiri), "Amiri"');
    expect(source).not.toContain('fontFamily: \'"Jameel Noori Nastaleeq"');
  });

  it("keeps mixed Arabic/Urdu text byte-for-byte in presentation-only segmentation", () => {
    const sample = "تفسیر بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ اور باقی اردو\nاصل متن اپنی جگہ";
    expect(splitTafsirTypography(sample).map((run) => run.text).join("")).toBe(sample);
  });
});
