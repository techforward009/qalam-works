import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { diacritizeArabic } from "../app/tools/arabic-diacritics/engine/diacritizeArabic";
import { CREATION_INPUT, CREATION_OUTPUT, GOLDEN_INPUT, GOLDEN_OUTPUT } from "../app/tools/arabic-diacritics/engine/goldenPassage";
import { joinBrokenSpelling, prepareArabicToken, RECOVERED_SPELLINGS } from "../app/tools/arabic-diacritics/engine/orthography";
import { skeleton } from "../app/tools/arabic-diacritics/engine/skeleton";

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

  test("the creation passage matches the new golden publishing form exactly", () => {
    expect(skeleton(CREATION_INPUT)).not.toBe(skeleton(GOLDEN_INPUT));
    expect(out(CREATION_INPUT)).toBe(CREATION_OUTPUT);
    expect(out(`${CREATION_INPUT}.`)).toBe(`${CREATION_OUTPUT}.`);
    expect(out(` ${CREATION_INPUT}`)).toBe(` ${CREATION_OUTPUT}`);
  });

  test("single known words", () => {
    expect(out("کافر")).toBe("كَافِرٌ");
    expect(out("وجود")).toBe("وُجُوْدُ");
    expect(out("الی")).toBe("اِلٰى");
    expect(out("فی")).toBe("فِيْ");
    expect(out("لکم")).toBe("لَكُمْ");
    expect(out("الارض")).toBe("الْاَرْضِ");
    expect(out("جمیعا")).toBe("جَمِيْعًا");
    expect(out("بہ")).toBe("بِهٖ");
  });

  test("connected Arabic prose keeps the original spaces", () => {
    expect(out("وجود السبیل")).toBe("وُجُوْدُ السَّبِيْلِ");
    expect(out("فعل یفعلہ")).toBe("فِعْلٍ يَّفْعَلُهُ");
    expect(out("ما  فی")).toBe("مَا  فِيْ");
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
    expect(out("بہ")).toContain("\u0656");
  });

  test("already vocalized words are not rewritten", () => {
    expect(out("كَافِرٌ")).toBe("كَافِرٌ");
    expect(out("اَلْقَائِلُ")).toBe("اَلْقَائِلُ");
    expect(out("وَتَتَوَقَّوْا")).toBe("وَتَتَوَقَّوْا");
    expect(out("بِهٖ")).toBe("بِهٖ");
    expect(out("وتتوقوا")).toBe("وَتَتَوَقَّوْا");
  });

  test("Urdu, English, numbers, punctuation, and paragraphs stay", () => {
    const mixed = "Page 2 کافر 123\n\nہے۔";
    expect(out(mixed)).toBe("Page 2 كَافِرٌ 123\n\nہے۔");
    expect(out("کافر.")).toBe("كَافِرٌ.");
    expect(out("")).toBe("");
    expect(out("   ")).toBe("   ");
    expect(out("وتتوقو.\nلکم")).toBe("وَتَتَوَقَّوْا.\nلَكُمْ");
    expect(out("کتاب خوب ہے 42.")).toBe("کتاب خوب ہے 42.");
    for (const urdu of ["ہے", "تھے", "گئے", "کیے", "لیے", "دیے", "رہے", "ہوئے", "آئے", "کے", "بے", "سے", "نے"]) {
      expect(out(urdu)).toBe(urdu);
    }
  });

  test("an unknown Arabic word is left unaltered", () => {
    expect(out("قلم")).toBe("قلم");
    expect(out("جمیع")).toBe("جمیع");
    expect(out("تتقوا")).toBe("تتقوا");
    expect(out("نرانہ")).toBe("نرانہ");
    expect(out("وتتو، قوا")).toBe("وتتو، قوا");
  });

  test("the tool is registered", () => {
    expect(readFileSync("app/lib/toolCatalog.ts", "utf8")).toContain('"/tools/arabic-diacritics"');
    expect(readFileSync("app/sitemap.ts", "utf8")).toContain("/tools/arabic-diacritics");
    expect(readFileSync("app/tools/arabic-diacritics/page.tsx", "utf8")).toContain("Arabic Diacritics");
  });
});

describe("Arabic orthography before diacritization", () => {
  test("normalizes Urdu letters only inside Arabic-target words", () => {
    expect(prepareArabicToken("لکم")).toBe("لكم");
    expect(prepareArabicToken("بہ")).toBe("به");
    expect(prepareArabicToken("بھ")).toBe("به");
    expect(prepareArabicToken("فی")).toBe("في");
    expect(prepareArabicToken("جمیعا")).toBe("جميعا");
    expect(prepareArabicToken("الے")).toBe("الي");
    expect(prepareArabicToken("فے")).toBe("في");
    expect(prepareArabicToken("والارادۃ")).toBe("والارادة");
    expect(prepareArabicToken("ہے")).toBe("ہے");
    expect(prepareArabicToken("کتاب")).toBe("کتاب");
    expect(prepareArabicToken("قلم")).toBe("قلم");
    expect(prepareArabicToken("كَافِرٌ")).toBe("كَافِرٌ");
    expect(out("الے")).toBe("اِلٰى");
    expect(out("فے")).toBe("فِيْ");
    expect(out("والارادۃ")).toBe("وَالْاِرَادَةُ");
    expect(out("لکم")).toContain("\u0643");
    expect(out("بہ")).toContain("\u0647");
    expect(out("بہ")).not.toContain("\u06C1");
  });

  test("restores a listed missing final alif and nothing else", () => {
    expect(prepareArabicToken("وتتوقو")).toBe("وتتوقوا");
    expect(prepareArabicToken("تتوقو")).toBe("تتوقوا");
    expect(prepareArabicToken("وتتوقو")).not.toMatch(/[\u064B-\u0652\u0670]/);
    expect(out("وتتوقو")).toBe("وَتَتَوَقَّوْا");
    expect(out("تتوقو")).toBe("تَتَوَقَّوْا");
    expect(joinBrokenSpelling("وتتو", "قوا")).toBe("وتتوقوا");
    expect(joinBrokenSpelling("وتتو", "قلم")).toBeNull();
    expect(out("وتتو قوا")).toBe("وَتَتَوَقَّوْا");
    expect(out("وتتوقوا")).toBe("وَتَتَوَقَّوْا");

    for (const item of RECOVERED_SPELLINGS) {
      expect(item.letter === "\u0627" || item.letter === "\u0648" || item.letter === "\u064A").toBe(true);
      expect(prepareArabicToken(item.incomplete)).toBe(item.complete);
      expect(out(item.incomplete)).not.toBe(item.incomplete);
    }
  });
});
