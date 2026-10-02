import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const source = readFileSync("app/tools/arabic-diacritics/engine/rawiBrowser.ts", "utf8");

describe("Qalam Rawi cumulative v5 publishing contract", () => {
  test("canonical Arabic rules are present", () => {
    for (const rule of [
      '"علی": "على"',
      '"تری": "ترى"',
      '"ادم": "آدم"',
      '"لادم": "لآدم"',
      '"ملائكة": "ملآئكة"',
      '"الملائكة": "الملآئكة"',
      '"أ": "ا"',
      '"إ": "ا"',
    ]) expect(source).toContain(rule);
  });

  test("publishing rules are present", () => {
    expect(source).toContain("function markFinalPluralWaw");
    expect(source).toContain('"وْ"');
    expect(source).toContain('"اَنَّهُ": `اَنَّه${INVERTED_DAMMA}`');
    expect(source).toContain('"لَهُ": `لَه${INVERTED_DAMMA}`');
    expect(source).toContain("function orderShaddaFirst");
  });

  test("reviewed regression fixes are present", () => {
    expect(source).toContain('"بُقْعَةٍ عُبِدَ اللّٰهُ"');
    expect(source).toContain('"عَلَيْهَا ظَهْرُ"');
    expect(source).toContain('.replace(/لَمَا(?=\\s+اَمَرَ(?:\\s|[\\p{P}\\p{S}]|$))/gu, "لَمَّا")');
    expect(source).toContain('.replace(/لِادَمَ/gu, "لِآدَمَ")');
    expect(source).toContain('.replace(/شَيْيًا/gu, "شَيْئًا")');
  });
});
