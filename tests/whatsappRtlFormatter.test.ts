import { describe, it, expect } from "vitest";
import {
  formatForWhatsAppRTL,
  countBidiControls,
  BIDI,
} from "../app/utils/whatsappRtlFormatter";

const { LRI, RLI, PDI, LRM, RLM } = BIDI;

function strip(text: string): string {
  return text
    .replace(/[\u2066\u2067\u2069]/g, "")
    .replace(/(\d+)\u200E\./g, "$1.")
    .replace(/(?:\r?\n)\u200F\s*$/g, "");
}

describe("formatForWhatsAppRTL", () => {
  it("returns empty string for empty input", () => {
    expect(formatForWhatsAppRTL("")).toBe("");
  });

  it("returns whitespace-only input unchanged", () => {
    expect(formatForWhatsAppRTL("   \n  \t")).toBe("   \n  \t");
  });

  it("wraps pure Urdu lines in RLI…PDI", () => {
    const urdu = "یہ ایک سادہ اردو جملہ ہے۔";
    const result = formatForWhatsAppRTL(urdu);
    expect(strip(result)).toBe(urdu);
    expect(result.startsWith(RLI)).toBe(true);
  });

  it("does not wrap pure English paragraphs", () => {
    expect(formatForWhatsAppRTL("Hello world.")).toBe("Hello world.");
  });

  it("does not wrap pure English multiline text", () => {
    const eng = "First line.\nSecond line with numbers 123.\nThird.";
    expect(formatForWhatsAppRTL(eng)).toBe(eng);
  });

  it("wraps mixed line in RLI and isolates English with LRI", () => {
    const mixed = "یہ PDF فائل ہے";
    const result = formatForWhatsAppRTL(mixed);
    expect(strip(result)).toBe(mixed);
    expect(result.startsWith(RLI)).toBe(true);
    expect(result).toContain(LRI + "PDF" + PDI);
  });

  it("isolates numbers inside RTL context", () => {
    const text = "قیمت 1500 روپے ہے";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "1500" + PDI);
  });

  it("isolates common abbreviations PDF DOCX TXT PKR", () => {
    const text = "رپورٹ PDF اور DOCX اور TXT میں محفوظ کریں قیمت PKR";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "DOCX" + PDI);
    expect(result).toContain(LRI + "TXT" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
  });

  it("preserves and isolates a full URL inside RTL", () => {
    const text = "سائٹ https://qalamworks.com دیکھیں";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "https://qalamworks.com" + PDI);
  });

  it("preserves and isolates an email address inside RTL", () => {
    const text = "ای میل qalamworks.services@gmail.com پر بھیجیں";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "qalamworks.services@gmail.com" + PDI);
  });

  it("does not reverse or lose punctuation next to English", () => {
    const text = "فائل (PDF) دیکھیں۔";
    expect(strip(formatForWhatsAppRTL(text))).toBe(text);
  });

  it("preserves exact line breaks in mixed content", () => {
    const text = "پہلی لائن PDF\nدوسری لائن\n\nتیسری لائن 42";
    expect(strip(formatForWhatsAppRTL(text))).toBe(text);
  });

  it("never drops any visible character", () => {
    const text =
      "رپورٹ PDF میں محفوظ کریں\nفائل qalamworks.com پر اپلوڈ کریں\nقیمت 1500 PKR ہے";
    expect(strip(formatForWhatsAppRTL(text))).toBe(text);
  });

  it("does not reverse English or Urdu character order", () => {
    const text = "Hello دنیا 123";
    const s = strip(formatForWhatsAppRTL(text));
    expect(s).toBe(text);
    expect(s.indexOf("Hello")).toBeLessThan(s.indexOf("دنیا"));
  });

  it("is idempotent", () => {
    const text = "رپورٹ PDF\n1. فائل\n1) وضاحت\n• بلٹ\nقیمت 1500 PKR";
    const once = formatForWhatsAppRTL(text);
    expect(formatForWhatsAppRTL(once)).toBe(once);
  });

  it("always produces balanced LRI/RLI/PDI pairs", () => {
    const text = "اردو PDF اور 1500\n1. نقطہ\n1) وضاحت\n• بلٹ";
    const result = formatForWhatsAppRTL(text);
    let depth = 0;
    for (const ch of result) {
      if (ch === LRI || ch === RLI) depth++;
      if (ch === PDI) depth--;
      expect(depth).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });

  it("handles a realistic mixed paragraph", () => {
    const text =
      "رپورٹ PDF میں محفوظ کریں۔ فائل qalamworks.com پر اپلوڈ کریں۔ قیمت 1500 PKR ہے۔";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.startsWith(RLI)).toBe(true);
  });

  it("returns empty string for non-string input", () => {
    // @ts-expect-error runtime guard
    expect(formatForWhatsAppRTL(null)).toBe("");
    // @ts-expect-error runtime guard
    expect(formatForWhatsAppRTL(undefined)).toBe("");
  });

  it("does not modify pure English numbered lists", () => {
    const text = "1. First item\n2. Second item";
    expect(formatForWhatsAppRTL(text)).toBe(text);
  });

  it("isolates numeric ranges", () => {
    const text = "قیمت کی حد 1500-2500 PKR ہے";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "1500-2500" + PDI);
  });

  it("isolates dates", () => {
    const text = "تاریخ اشاعت 2024-08-12 ہے";
    expect(strip(formatForWhatsAppRTL(text))).toBe(text);
  });

  it("isolates complex URLs and emails", () => {
    const url = "https://qalamworks.com/docs?id=42";
    const email = "support+docs@qalamworks.services";
    const text = `لنک ${url} اور ${email}`;
    expect(strip(formatForWhatsAppRTL(text))).toBe(text);
  });

  it("isolates PKR amounts", () => {
    const text = "کل رقم 4500 PKR ادا کریں";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "4500" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
  });

  // ========== Marker matrix (independent) ==========

  // A. Dot-style 1. — peeled raw (NO LRI, NO LRM), outer RLI only
  it("A: dot-style marker is raw inside RLI; no LRI/LRM on marker", () => {
    const text = "1. پہلا نکتہ\n2. دوسرا نکتہ\n3. تیسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    for (const n of ["1", "2", "3"]) {
      // Marker must remain literal digits+period with no LRI around it
      expect(result).not.toContain(LRI + n + ".");
      expect(result).not.toContain(n + LRM + ".");
      expect(result).toContain(n + ".");
    }
    const first = result.split("\n")[0];
    expect(first.startsWith(RLI)).toBe(true);
    // Marker appears immediately after RLI (raw)
    expect(first.startsWith(RLI + "1.")).toBe(true);
    const rtlLines = result.split("\n").filter((l) => l.includes(RLI));
    expect(rtlLines.length).toBe(3);
  });

  it("A: dot-style body still isolates embedded LTR tokens", () => {
    const text = "1. رپورٹ PDF میں محفوظ کریں";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.startsWith(RLI + "1.")).toBe(true);
    expect(result).not.toContain(LRI + "1.");
    expect(result).toContain(LRI + "PDF" + PDI);
  });

  // B. Paren-style 1) — NO special marker controls
  it("B: paren-style 1) 2) 3) are NOT specially transformed", () => {
    const text = "1) پہلی وضاحت\n2) دوسری وضاحت\n3) تیسری وضاحت";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    // No LRM after paren markers
    expect(result).not.toContain("1)" + LRM);
    expect(result).not.toContain("2)" + LRM);
    expect(result).not.toContain("3)" + LRM);
    // Marker not LRI-wrapped
    expect(result).not.toContain(LRI + "1)");
    // Line still RLI-wrapped
    expect(result.split("\n")[0].startsWith(RLI)).toBe(true);
  });

  // C. Bullet •
  it("C: bullet • not specially transformed", () => {
    const text = "• پہلا بلٹ\n• دوسرا بلٹ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).not.toContain("•" + LRM);
    expect(result).not.toContain(LRI + "•");
    expect(result.split("\n")[0].startsWith(RLI)).toBe(true);
  });

  // D. Bullet *
  it("D: bullet * not specially transformed", () => {
    const text = "* پہلا بلٹ\n* دوسرا بلٹ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).not.toContain("*" + LRM);
    expect(result.split("\n")[0].startsWith(RLI)).toBe(true);
  });

  // E. Bullet -
  it("E: bullet - not specially transformed", () => {
    const text = "- پہلا بلٹ\n- دوسرا بلٹ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).not.toContain("-" + LRM);
    expect(result.split("\n")[0].startsWith(RLI)).toBe(true);
  });

  // F. Final line RLM
  it("F: final RTL line gets trailing newline+RLM anchor", () => {
    const text = "آخری اردو سطر";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.endsWith("\n" + RLM)).toBe(true);
    expect(result.startsWith(RLI)).toBe(true);
  });

  it("F: final RLM survives complete formatting (idempotent + present)", () => {
    const text = "1. پہلا\nآخری اردو سطر";
    const once = formatForWhatsAppRTL(text);
    const twice = formatForWhatsAppRTL(once);
    expect(twice).toBe(once);
    expect(once.endsWith("\n" + RLM)).toBe(true);
    expect(strip(once)).toBe(text);
  });

  // G. Mixed content
  it("G: mixed Urdu with PDF, amounts, URL, email", () => {
    const text =
      "رپورٹ PDF اور DOCX میں 720,000 PKR۔ لنک https://qalamworks.com اور email@test.com";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "720,000" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
    expect(result).toContain(LRI + "https://qalamworks.com" + PDI);
  });

  // Cross-type isolation: one type must not alter another
  it("cross-type: 1. peeled raw; 1) and bullets stay peeled", () => {
    const text = `1. پہلا
1) وضاحت
• بلٹ
* ستارہ
- ڈیش`;
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    // Dot-style: raw marker, no LRI/LRM
    expect(result).not.toContain(LRI + "1.");
    expect(result).not.toContain("1" + LRM + ".");
    expect(result).toContain(RLI + "1.");
    // Paren and bullets remain without LRM / without LRI on marker
    expect(result).not.toContain("1)" + LRM);
    expect(result).not.toContain(LRI + "1)");
    expect(result).not.toContain("•" + LRM);
    expect(result).not.toContain(LRI + "•");
    expect(result).not.toContain("*" + LRM);
    expect(result).not.toContain("-" + LRM);
  });

  it("no final RLM for pure English", () => {
    expect(formatForWhatsAppRTL("Hello world")).toBe("Hello world");
  });

  it("embedded mid-line numbers stay LRI-wrapped without marker LRM", () => {
    const text = "قیمت 1500 روپے";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "1500" + PDI);
    expect(result).not.toContain("1500" + LRM);
  });
});
