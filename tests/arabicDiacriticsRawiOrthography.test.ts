import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/tools/arabic-diacritics/engine/rawiBrowser.ts", "utf8");

describe("Rawi Indo-Pakistani model bridge", () => {
  it("folds Indo-Pakistani letters only for model input", () => {
    expect(source).toContain('"ک": "ك"');
    expect(source).toContain('"ی": "ي"');
    expect(source).toContain('"ھ": "ه"');
    expect(source).toContain('"ہ": "ه"');
    expect(source).toContain('"ۃ": "ة"');
    expect(source).toContain("const inputBase = modelBase(text)");
    expect(source).toContain("const outputBase = sourceBase(text)");
    expect(source).toContain("encode(inputBase, vocab.char_to_idx)");
    expect(source).toContain("attachClasses(outputBase,");
  });

  it("projects tashkeel onto the source spelling and keeps character alignment", () => {
    expect(source).toContain("RAWI_VOWEL_MARK");
    expect(source).toContain("Rawi source/model character alignment failed");
    expect(source).toContain("outputChars.length !== modelChars.length");
  });
});
