import { describe, it, expect } from "vitest";
import { cleanTextPipeline, displayDirForPaste } from "../app/utils/processing/cleanTextPipeline";
import { standardizeUrduText } from "../app/utils/unicode/standardizeUrduText";

describe("cleanTextPipeline — paste/shared path", () => {
  it("English cleaning", () => {
    const r = cleanTextPipeline("This is a test ,with bad spacing.", "en");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.cleanedText).toBe("This is a test, with bad spacing.");
    expect(r.resolvedLanguage).toBe("en");
    expect(r.direction).toBe("ltr");
  });

  it("Urdu normalization", () => {
    const r = cleanTextPipeline("علي كتاب", "ur");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.cleanedText).toBe("علی کتاب");
    expect(r.direction).toBe("rtl");
  });

  it("Arabic preservation", () => {
    const r = cleanTextPipeline("علي عليه السلام، كربلاء", "ar");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.cleanedText).toContain("ي");
    expect(r.cleanedText).toContain("ك");
    expect(r.direction).toBe("rtl");
  });

  it("Auto rtl-neutral preservation", () => {
    const r = cleanTextPipeline("علي كربلاء", "auto");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.cleanedText).toBe("علي كربلاء");
    expect(r.resolvedLanguage).toBe("rtl-neutral");
    expect(r.direction).toBe("rtl");
  });

  it("mixed text Auto is non-destructive", () => {
    const input = "یہ Qalam Works کا professional tool ہے۔";
    const r = cleanTextPipeline(input, "auto");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.cleanedText).toContain("Qalam Works");
    expect(r.resolvedLanguage).toBe("rtl-neutral");
  });

  it("empty input fails safely", () => {
    const r = cleanTextPipeline("   \n  ", "auto");
    expect(r.success).toBe(false);
  });

  it("whitespace-only input fails", () => {
    expect(cleanTextPipeline("", "en").success).toBe(false);
  });

  it("zero-correction English reports no changes needed path", () => {
    const r = cleanTextPipeline("Hello world.", "en");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.correctionsApplied.totalCorrections).toBe(0);
  });

  it("pure English quality has no mixedScript issues", () => {
    const r = cleanTextPipeline("This is plain English only.", "en");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.remainingIssues.textQuality.mixedScript).toBe(0);
  });

  it("Arabic valid forms not flagged as Urdu defects", () => {
    const r = cleanTextPipeline("علي كربلاء", "ar");
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.remainingIssues.textQuality.mixedUrduArabicForms).toBe(0);
  });
});

describe("displayDirForPaste", () => {
  it("English mode LTR", () => {
    expect(displayDirForPaste("en", "hello")).toBe("ltr");
  });
  it("Urdu/Arabic RTL", () => {
    expect(displayDirForPaste("ur", "hello")).toBe("rtl");
    expect(displayDirForPaste("ar", "x")).toBe("rtl");
  });
  it("Auto uses script for display only", () => {
    expect(displayDirForPaste("auto", "علي")).toBe("rtl");
    expect(displayDirForPaste("auto", "Hello")).toBe("ltr");
  });
});

describe("regression", () => {
  it("standardizeUrduText still Urdu", () => {
    expect(standardizeUrduText("علي كتاب").output).toBe("علی کتاب");
  });
});
