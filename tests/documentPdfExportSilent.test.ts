import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("پی ڈی ایف خاموشی سے ڈاؤن لوڈ ہو", () => {
  test("ایکسپورٹ کے بعد سمری باکس ہٹا دیا گیا ہے اور پی ڈی ایف خاموشی سے ڈاؤن لوڈ ہوتی ہے", () => {
    const source = readFileSync("app/tools/document-studio/components/DocumentStudioEditor.tsx", "utf8");

    // سمری باکس اور اس کی حالت کے تمام حوالہ جات ختم ہونے چاہئیں
    expect(source).not.toContain("PDF Export Complete");
    expect(source).not.toContain("PDF برآمد مکمل");
    expect(source).not.toContain("pdfSummary");
    expect(source).not.toContain("setPdfSummary");
    expect(source).not.toContain("X-Pdf-Page-Count");

    // ڈاؤن لوڈ اور سرور ایکسپورٹ بدستور موجود رہنے چاہئیں
    expect(source).toContain('a.download = "qalam-document.pdf"');
    expect(source).toContain('"/api/export-pdf"');
  });
});
