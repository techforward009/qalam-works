import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { diacritizeArabic } from "../app/tools/arabic-diacritics/engine/diacritizeArabic";
import { GOLDEN_INPUT, GOLDEN_OUTPUT } from "../app/tools/arabic-diacritics/engine/goldenPassage";

function out(input: string): string {
  const result = diacritizeArabic(input);
  expect(result.input).toBe(input);
  return result.output;
}

describe("Indo-Pakistani Arabic diacritics", () => {
  test("the reviewed passage matches the golden publishing form exactly", () => {
    expect(out(GOLDEN_INPUT)).toBe(GOLDEN_OUTPUT);
    expect(out(GOLDEN_INPUT)).toBe(diacritizeArabic(GOLDEN_INPUT).output);
  });

  test("single known words", () => {
    expect(out("کافر")).toBe("كَافِرٌ");
    expect(out("وجود")).toBe("وُجُوْدُ");
    expect(out("الی")).toBe("اِلٰى");
    expect(out("فی")).toBe("فِيْ");
  });

  test("connected Arabic prose keeps the original spaces", () => {
    expect(out("وجود السبیل")).toBe("وُجُوْدُ السَّبِيْلِ");
    expect(out("فعل یفعلہ")).toBe("فِعْلٍ يَّفْعَلُهُ");
  });

  test("religious terminology and Allah forms", () => {
    expect(out("اللہ")).toBe("اللّٰهُ");
    expect(out("للہ")).toBe("لِلّٰهِ");
    expect(out("تعالٰی")).toBe("تَعَالٰى");
    expect(out("من اللہ")).toBe("مِنَ اللّٰهُ");
  });

  test("alif khanjariyah and the pronoun mark", () => {
    expect(out("الی")).toContain("ٰ");
    expect(out("الاٰخرۃ")).toBe("الْاٰخِرَةِ");
    expect(out("یستحقونہ")).toBe("يَسْتَحِقُّوْنَهٗ");
    expect(out("یستحقونہ")).toContain("\u0657");
  });

  test("already vocalized words are not rewritten", () => {
    expect(out("كَافِرٌ")).toBe("كَافِرٌ");
    expect(out("اَلْقَائِلُ")).toBe("اَلْقَائِلُ");
  });

  test("Urdu, English, numbers, punctuation, and paragraphs stay", () => {
    const mixed = "Page 2 کافر 123\n\nہے۔";
    expect(out(mixed)).toBe("Page 2 كَافِرٌ 123\n\nہے۔");
    expect(out("کافر.")).toBe("كَافِرٌ.");
    expect(out("")).toBe("");
    expect(out("   ")).toBe("   ");
  });

  test("an unknown Arabic word is left unaltered", () => {
    expect(out("قلم")).toBe("قلم");
  });

  test("the tool is registered", () => {
    expect(readFileSync("app/lib/toolCatalog.ts", "utf8")).toContain('"/tools/arabic-diacritics"');
    expect(readFileSync("app/sitemap.ts", "utf8")).toContain("/tools/arabic-diacritics");
    expect(readFileSync("app/tools/arabic-diacritics/page.tsx", "utf8")).toContain("Arabic Diacritics");
  });
});
