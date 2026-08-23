/**
 * Acronym transliteration regression tests — TV policy fix + full coverage
 */

import { describe, test, expect } from "vitest";
import { transformAcronymsAndBrands } from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import {
  fixFormalOutput, transformPKRAmount, transformPercentage,
  cleanParentheticals,
} from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

function pipe(s: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(s).output);
  return normalizeUrduProsePunctuation(cleanParentheticals(transformAcronymsAndBrands(transformPercentage(transformPKRAmount(p1)))));
}

describe("TV acronym transliteration", () => {
  test("TV → ٹی وی (presentation layer)", () => {
    const out = transformAcronymsAndBrands("naya TV lein ge");
    expect(out).toContain("ٹی وی");
    expect(out).not.toContain(" TV ");
  });

  test("real sentence: naya TV lein ge", () => {
    const out = pipe("hum is saal aik naya TV lein ge");
    expect(out).toContain("ٹی وی");
    expect(out).not.toMatch(/\bTV\b/);
  });

  test("full production screenshot sentence", () => {
    const out = pipe("mein ne aik baat sochi hai, wo ye ke hum is saal aik naya TV lein ge. agar Allah ne madad kari to inshaAllah is saal qurbani bhi karen ge. baqi jo malik ko manzoor hoga wohi hoga");
    expect(out).toContain("ٹی وی");
    expect(out).not.toContain("TV");
  });
});

describe("Existing acronyms still transliterate", () => {
  const ACRONYMS: [string, string][] = [
    ["AI update ho gaya", "اے آئی"],
    ["HR department ne kaha", "ایچ آر"],
    ["SMS aaya hai", "ایس ایم ایس"],
    ["OTP dalo", "او ٹی پی"],
    ["PDF bhejo", "پی ڈی ایف"],
    ["API configure karo", "اے پی آئی"],
    ["naya TV lein ge", "ٹی وی"],
  ];
  for (const [input, expected] of ACRONYMS) {
    test(`${input.split(" ")[1] || input.split(" ")[0]} → ${expected}`, () => {
      const out = transformAcronymsAndBrands(input);
      expect(out).toContain(expected);
    });
  }
});

describe("Protected tokens remain exact", () => {
  test("report.pdf preserved", () => {
    const out = pipe("report.pdf bhejo");
    expect(out).toContain("report.pdf");
  });
  test("v2.1 preserved", () => {
    const out = pipe("v2.1 install karo");
    expect(out).toContain("v2.1");
  });
  test("URL preserved", () => {
    const out = pipe("https://qalamworks.com dekho");
    expect(out).toContain("https://qalamworks.com");
  });
  test("email preserved", () => {
    const out = pipe("info@qalam.works par bhejo");
    expect(out).toContain("info@qalam.works");
  });
});
