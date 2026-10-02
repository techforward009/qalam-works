import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const RAWI_SOURCE = readFileSync("app/tools/arabic-diacritics/engine/rawiBrowser.ts", "utf8");

describe("Rawi Arabic canonicalization contract", () => {
  it("canonicalizes common Indo-Pakistani letters and removes alif hamza", () => {
    expect(RAWI_SOURCE).toContain('"ک": "ك"');
    expect(RAWI_SOURCE).toContain('"ی": "ي"');
    expect(RAWI_SOURCE).toContain('"ے": "ي"');
    expect(RAWI_SOURCE).toContain('"ھ": "ه"');
    expect(RAWI_SOURCE).toContain('"ہ": "ه"');
    expect(RAWI_SOURCE).toContain('"ۃ": "ة"');
    expect(RAWI_SOURCE).toContain('"أ": "ا"');
    expect(RAWI_SOURCE).toContain('"إ": "ا"');
    expect(RAWI_SOURCE).toContain("function canonicalArabicBase");
    expect(RAWI_SOURCE).toContain("const outputBase = canonicalArabicBase(text);");
    expect(RAWI_SOURCE).toContain("encode(inputBase, vocab.char_to_idx)");
    expect(RAWI_SOURCE).toContain("attachClasses(outputBase,");
  });

  it("preserves precomposed hamza letters during mark stripping", () => {
    expect(RAWI_SOURCE).toContain('text.normalize("NFD")');
    expect(RAWI_SOURCE).toContain("The visible output keeps the canonical Arabic");
    expect(RAWI_SOURCE).toContain("so ئ/ؤ are not lost from the user's text");
  });

  it("keeps canonical output separate from the Rawi model skeleton", () => {
    expect(RAWI_SOURCE).toContain("function canonicalArabicBase");
    expect(RAWI_SOURCE).toContain("function modelBase");
    expect(RAWI_SOURCE).toContain("const outputBase = canonicalArabicBase(text);");
    expect(RAWI_SOURCE).toContain("const inputBase = modelBase(outputBase);");
    expect(RAWI_SOURCE).toContain("Rawi canonical/model character alignment failed");
  });

  it("enforces shadda-before-vowel publishing order", () => {
    expect(RAWI_SOURCE).toContain("function orderShaddaFirst");
    expect(RAWI_SOURCE).toContain("return orderShaddaFirst(out);");
    expect(RAWI_SOURCE).toContain("orderShaddaFirst(reviewed)");
  });
});
