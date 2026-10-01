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
    expect(RAWI_SOURCE).toContain("const base = canonicalArabicBase(text)");
    expect(RAWI_SOURCE).toContain("encode(base, vocab.char_to_idx)");
    expect(RAWI_SOURCE).toContain("attachClasses(base,");
  });

  it("enforces shadda-before-vowel publishing order", () => {
    expect(RAWI_SOURCE).toContain("function orderShaddaFirst");
    expect(RAWI_SOURCE).toContain("return orderShaddaFirst(out);");
    expect(RAWI_SOURCE).toContain("return orderShaddaFirst(");
  });
});
