import { describe, it, expect } from "vitest";
import {
  formatForWhatsAppRTL,
  countBidiControls,
  BIDI,
} from "../app/utils/whatsappRtlFormatter";

const { LRI, RLI, PDI } = BIDI;

/** Strip only our isolation controls for content-equality checks. */
function strip(text: string): string {
  return text.replace(/[\u2066\u2067\u2069]/g, "");
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
    expect(result.endsWith(PDI)).toBe(true);
    expect(result).not.toContain(LRI);
  });

  it("does not wrap pure English paragraphs", () => {
    const eng = "Hello world. This is a pure English paragraph.";
    const result = formatForWhatsAppRTL(eng);
    expect(result).toBe(eng);
    expect(countBidiControls(result)).toBe(0);
  });

  it("does not wrap pure English multiline text", () => {
    const eng = "First line.\nSecond line with numbers 123.\nThird.";
    const result = formatForWhatsAppRTL(eng);
    expect(result).toBe(eng);
    expect(countBidiControls(result)).toBe(0);
  });

  it("wraps mixed line in RLI and isolates English with LRI", () => {
    const mixed = "یہ PDF فائل ہے";
    const result = formatForWhatsAppRTL(mixed);
    expect(strip(result)).toBe(mixed);
    expect(result.startsWith(RLI)).toBe(true);
    expect(result.endsWith(PDI)).toBe(true);
    expect(result).toContain(LRI + "PDF" + PDI);
  });

  it("isolates numbers inside RTL context", () => {
    const text = "قیمت 1500 روپے ہے";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "1500" + PDI);
    expect(result.startsWith(RLI)).toBe(true);
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

  it("keeps bullet markers inside RLI paragraph", () => {
    const text = "• پہلا نکتہ PDF\n• دوسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    const lines = result.split("\n");
    expect(lines[0].startsWith(RLI)).toBe(true);
    expect(lines[0]).toContain("•");
    expect(lines[0]).toContain(LRI + "PDF" + PDI);
    expect(lines[1].startsWith(RLI)).toBe(true);
  });

  it("preserves hyphen list markers inside RLI", () => {
    const text = "- پہلا نکتہ\n- دوسرا نکتہ 1500";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.split("\n")[0].startsWith(RLI)).toBe(true);
    expect(result).toContain(LRI + "1500" + PDI);
  });

  it("preserves asterisk list markers inside RLI", () => {
    const text = "* پہلا نکتہ\n* دوسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.split("\n")[0].startsWith(RLI)).toBe(true);
    expect(result.split("\n")[0]).toContain("*");
  });

  it("wraps numbered list lines in RLI so markers stay RTL-anchored", () => {
    const text = "1. پہلا نکتہ\n2. دوسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    const lines = result.split("\n");
    for (const line of lines) {
      expect(line.startsWith(RLI)).toBe(true);
      expect(line.endsWith(PDI)).toBe(true);
    }
  });

  it("wraps parenthesis-style numbered lists in RLI", () => {
    const text = "1) پہلا نکتہ\n2) دوسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.split("\n")[0].startsWith(RLI)).toBe(true);
  });

  it("does not reverse or lose punctuation next to English", () => {
    const text = "فائل (PDF) دیکھیں۔";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain("PDF");
  });

  it("preserves exact line breaks in mixed content", () => {
    const text = "پہلی لائن PDF\nدوسری لائن\n\nتیسری لائن 42";
    const result = formatForWhatsAppRTL(text);
    expect(result.split("\n").length).toBe(4);
    expect(strip(result)).toBe(text);
  });

  it("leaves Arabic quotation marks and surrounding text stable", () => {
    const text = "اس نے کہا: «یہ درست ہے»";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.startsWith(RLI)).toBe(true);
  });

  it("never drops any visible character", () => {
    const text =
      "رپورٹ PDF میں محفوظ کریں\nفائل qalamworks.com پر اپلوڈ کریں\nقیمت 1500 PKR ہے";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
  });

  it("does not reverse English or Urdu character order", () => {
    const text = "Hello دنیا 123";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    const s = strip(result);
    expect(s.indexOf("Hello")).toBeLessThan(s.indexOf("دنیا"));
    expect(s.indexOf("دنیا")).toBeLessThan(s.indexOf("123"));
  });

  it("keeps URL characters exactly", () => {
    const url = "https://qalamworks.com/path?x=1&y=2#frag";
    const text = `لنک ${url} ہے`;
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(url);
  });

  it("keeps email characters exactly", () => {
    const email = "user.name+tag@qalamworks.com";
    const text = `ای میل ${email}`;
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(email);
  });

  it("is idempotent – second pass does not change output", () => {
    const text =
      "رپورٹ PDF میں محفوظ کریں\nقیمت 1500 PKR\nhttps://qalamworks.com";
    const once = formatForWhatsAppRTL(text);
    const twice = formatForWhatsAppRTL(once);
    expect(twice).toBe(once);
  });

  it("always produces balanced LRI/RLI/PDI pairs", () => {
    const text =
      "اردو PDF اور 1500 PKR اور https://example.com اور test@email.com";
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
      "رپورٹ PDF میں محفوظ کریں۔ فائل qalamworks.com پر اپلوڈ کریں۔ قیمت 1500 PKR ہے۔ ای میل qalamworks.services@gmail.com پر بھیجیں۔";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.startsWith(RLI)).toBe(true);
    expect(countBidiControls(result)).toBeGreaterThan(0);
  });

  it("numbered list: RLI wraps each line; LTR tokens isolated", () => {
    const text = "1. فائل PDF\n2. قیمت 2500 PKR\n3. لنک https://qalamworks.com";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    for (const line of result.split("\n")) {
      expect(line.startsWith(RLI)).toBe(true);
      expect(line.endsWith(PDI)).toBe(true);
    }
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "2500" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
    expect(result).toContain(LRI + "https://qalamworks.com" + PDI);
  });

  it("does not isolate pure punctuation runs but still RLI-wraps RTL lines", () => {
    const text = "اردو ... !!! ???";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.startsWith(RLI)).toBe(true);
    expect(result).not.toContain(LRI);
  });

  it("isolates consecutive distinct LTR runs separately", () => {
    const text = "فائل PDF اور DOCX دونوں";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "DOCX" + PDI);
  });

  it("does not remove arbitrary user directional marks", () => {
    const LRM = "\u200E";
    const text = `اردو${LRM}PDF${LRM}متن`;
    const result = formatForWhatsAppRTL(text);
    expect(result.includes(LRM)).toBe(true);
    expect(strip(result)).toBe(text);
  });

  it("returns empty string for non-string input", () => {
    // @ts-expect-error testing runtime guard
    expect(formatForWhatsAppRTL(null)).toBe("");
    // @ts-expect-error testing runtime guard
    expect(formatForWhatsAppRTL(undefined)).toBe("");
  });

  it("does not modify pure English numbered lists", () => {
    const text = "1. First item\n2. Second item";
    const result = formatForWhatsAppRTL(text);
    expect(result).toBe(text);
    expect(countBidiControls(result)).toBe(0);
  });

  it("isolates numeric ranges as coherent LTR tokens", () => {
    const text = "قیمت کی حد 1500-2500 PKR ہے";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "1500-2500" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
  });

  it("isolates dates as LTR tokens", () => {
    const text = "تاریخ اشاعت 2024-08-12 ہے";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "2024-08-12" + PDI);
  });

  it("isolates full complex URLs", () => {
    const url = "https://qalamworks.com/docs?id=42&lang=ur#section-2";
    const text = `مزید تفصیل ${url} پر دستیاب ہے`;
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + url + PDI);
  });

  it("isolates complex email addresses", () => {
    const email = "support+docs@qalamworks.services";
    const text = `رابطہ ${email} پر کریں`;
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + email + PDI);
  });

  // Real WhatsApp failure regression
  it("real WhatsApp regression: list markers anchored RTL, amounts LTR", () => {
    const text = `1. بینک شو روم
2. اسلامی بینک
3. اس کے بعد 720,000 سے 950,000
* وضاحت: مزید تفصیل بعد میں`;
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);

    const lines = result.split("\n");
    expect(lines).toHaveLength(4);

    for (const line of lines) {
      expect(line.startsWith(RLI)).toBe(true);
      expect(line.endsWith(PDI)).toBe(true);
    }

    // Markers live inside the outer RLI (may themselves be LRI-wrapped as LTR tokens)
    expect(lines[0].includes("1.")).toBe(true);
    expect(lines[1].includes("2.")).toBe(true);
    expect(lines[2].includes("3.")).toBe(true);
    expect(lines[3].includes("*")).toBe(true);

    expect(result).toContain(LRI + "720,000" + PDI);
    expect(result).toContain(LRI + "950,000" + PDI);
  });

  it("asterisk and bullet list lines are full RLI paragraphs", () => {
    const text = `* وضاحت: اہم نوٹ
• پہلا نقطہ
- دوسرا نقطہ`;
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    for (const line of result.split("\n")) {
      expect(line.startsWith(RLI)).toBe(true);
      expect(line.endsWith(PDI)).toBe(true);
    }
  });

  it("ordinary Urdu paragraph is a single RLI…PDI unit", () => {
    const text = "قرض کی ادائیگی کے بعد بینک آپ کو مکمل دستاویزات فراہم کرے گا۔";
    const result = formatForWhatsAppRTL(text);
    expect(result).toBe(RLI + text + PDI);
  });

  it("isolates PKR amounts inside RLI paragraphs", () => {
    const text = "کل رقم 4500 PKR ادا کریں";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.startsWith(RLI)).toBe(true);
    expect(result).toContain(LRI + "4500" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
  });
});
