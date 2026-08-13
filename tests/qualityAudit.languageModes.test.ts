import { describe, it, expect } from "vitest";
import { checkTextQuality } from "../app/utils/quality/checkTextQuality";
import { resolveProcessingLanguage } from "../app/utils/processing/detectLanguage";

describe("Quality Audit language modes", () => {
  it("English: no mixed-script defect on pure Latin", () => {
    const q = checkTextQuality("This is normal English text.", "en");
    expect(q.textQuality.mixedScript).toBe(0);
    expect(q.textQuality.mixedUrduArabicForms).toBe(0);
  });

  it("Urdu: flags Arabic forms on علي كتاب", () => {
    const q = checkTextQuality("علي كتاب", "ur");
    expect(q.textQuality.mixedUrduArabicForms).toBeGreaterThan(0);
  });

  it("Arabic: valid forms not defects", () => {
    const q = checkTextQuality("علي كربلاء", "ar");
    expect(q.textQuality.mixedUrduArabicForms).toBe(0);
  });

  it("Auto: rtl-neutral for Arabic-script", () => {
    expect(resolveProcessingLanguage("auto", "علي كربلاء")).toBe("rtl-neutral");
    const q = checkTextQuality("علي كربلاء", "auto");
    expect(q.textQuality.mixedUrduArabicForms).toBe(0);
  });

  it("Mixed Urdu+English: mixedScript in ur mode; not in auto rtl-neutral", () => {
    const ur = checkTextQuality("یہ Qalam Works کا tool ہے۔", "ur");
    expect(ur.textQuality.mixedScript).toBeGreaterThan(0);
    const auto = checkTextQuality("یہ Qalam Works کا tool ہے۔", "auto");
    expect(auto.textQuality.mixedScript).toBe(0);
  });

  it("Persian-like Auto non-destructive audit", () => {
    const q = checkTextQuality("علي در تهران زندگي مي‌كند", "auto");
    expect(q.textQuality.mixedUrduArabicForms).toBe(0);
  });
});
