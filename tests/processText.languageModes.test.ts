import { describe, it, expect } from "vitest";
import { processText } from "../app/utils/processing/processText";
import { checkTextQuality } from "../app/utils/quality/checkTextQuality";
import { detectProcessingLanguage, resolveProcessingLanguage } from "../app/utils/processing/detectLanguage";
import { standardizeUrduText } from "../app/utils/unicode/standardizeUrduText";

describe("processText — English mode", () => {
  it("does not convert English punctuation to Arabic forms", () => {
    const r = processText("Hello, world!\nHow are you?\nThis; is English.", "en");
    expect(r.output).toContain(",");
    expect(r.output).toContain("?");
    expect(r.output).toContain(";");
    expect(r.output).not.toContain("،");
    expect(r.output).not.toContain("؟");
    expect(r.output).not.toContain("؛");
    expect(r.resolvedLanguage).toBe("en");
    expect(r.direction).toBe("ltr");
  });

  it("fixes space before comma and missing space after", () => {
    const r = processText("This is a test ,with bad spacing.", "en");
    expect(r.output).toBe("This is a test, with bad spacing.");
  });

  it("collapses repeated spaces", () => {
    const r = processText("This  is   a    test.", "en");
    expect(r.output).toBe("This is a test.");
  });
});

describe("processText — Arabic mode", () => {
  it("preserves genuine Arabic orthography", () => {
    const input = "علي عليه السلام، كربلاء";
    const r = processText(input, "ar");
    expect(r.output).toContain("ي");
    expect(r.output).toContain("ك");
    expect(r.output).not.toMatch(/ی/); // must not force Urdu yeh
    expect(r.output).not.toMatch(/ک/);
    expect(r.resolvedLanguage).toBe("ar");
    expect(r.direction).toBe("rtl");
  });

  it("does not strip hamza-on-alif", () => {
    const r = processText("أحمد وإبراهيم", "ar");
    expect(r.output).toContain("أ");
    expect(r.output).toContain("إ");
  });
});

describe("processText — Urdu mode regression", () => {
  it("still normalizes Arabic forms to Urdu", () => {
    const r = processText("علي", "ur");
    expect(r.output).toBe("علی");
    const r2 = processText("كتاب", "ur");
    expect(r2.output).toBe("کتاب");
  });

  it("standardizeUrduText remains Urdu-equivalent", () => {
    const a = standardizeUrduText("علي كتاب");
    const b = processText("علي كتاب", "ur");
    expect(a.output).toBe(b.output);
  });
});

describe("processText — mixed content", () => {
  it("Urdu mode keeps Latin words intact", () => {
    const input = "یہ Qalam Works کا professional tool ہے۔";
    const r = processText(input, "ur");
    expect(r.output).toContain("Qalam Works");
    expect(r.output).toContain("professional");
  });

  it("does not destroy URLs", () => {
    const input = "Website: https://qalamworks.com";
    const r = processText(input, "en");
    expect(r.output).toContain("https://qalamworks.com");
  });
});

describe("detectProcessingLanguage", () => {
  it("detects pure English", () => {
    expect(detectProcessingLanguage("Hello world, this is English only.")).toBe("en");
  });

  it("does not auto-pick ar for Arabic-script", () => {
    // Conservative: Arabic-script → ur product default; user must opt into ar
    expect(detectProcessingLanguage("علي عليه السلام")).toBe("ur");
  });

  it("explicit mode overrides auto", () => {
    expect(resolveProcessingLanguage("ar", "علي")).toBe("ar");
    expect(resolveProcessingLanguage("en", "علي")).toBe("en");
  });
});

describe("checkTextQuality — language-aware", () => {
  it("pure English does not report mixedScript", () => {
    const q = checkTextQuality("This is a plain English sentence with words.", "en");
    expect(q.textQuality.mixedScript).toBe(0);
    expect(q.textQuality.mixedUrduArabicForms).toBe(0);
  });

  it("pure English with default ur mode also avoids mixedScript without Arabic script", () => {
    const q = checkTextQuality("This is a plain English sentence with words.", "ur");
    expect(q.textQuality.mixedScript).toBe(0);
  });

  it("Arabic mode does not flag ي/ك as mixed Urdu/Arabic forms", () => {
    const q = checkTextQuality("علي عليه السلام، كربلاء", "ar");
    expect(q.textQuality.mixedUrduArabicForms).toBe(0);
  });

  it("Urdu mode still flags Arabic forms", () => {
    const q = checkTextQuality("علي كتاب", "ur");
    expect(q.textQuality.mixedUrduArabicForms).toBeGreaterThan(0);
  });

  it("intentional mixed Urdu+English still countable in ur mode but not pure English", () => {
    const q = checkTextQuality("یہ Qalam Works کا tool ہے۔", "ur");
    expect(q.textQuality.mixedScript).toBeGreaterThan(0);
  });
});
