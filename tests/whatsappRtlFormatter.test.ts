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
    .replace(/(\d+[.)])\u200E/g, "$1")
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

  it("keeps bullet markers inside RLI without LRM", () => {
    const text = "• پہلا نکتہ PDF\n• دوسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.split("\n")[0]).toContain("•");
    expect(result.split("\n")[0]).not.toContain(LRM);
  });

  it("preserves hyphen list markers inside RLI", () => {
    const text = "- پہلا نکتہ\n- دوسرا نکتہ 1500";
    expect(strip(formatForWhatsAppRTL(text))).toBe(text);
  });

  it("preserves asterisk list markers inside RLI", () => {
    const text = "* پہلا نکتہ\n* دوسرا نکتہ";
    expect(strip(formatForWhatsAppRTL(text))).toBe(text);
  });

  it("does not reverse or lose punctuation next to English", () => {
    const text = "فائل (PDF) دیکھیں۔";
    expect(strip(formatForWhatsAppRTL(text))).toBe(text);
  });

  it("preserves exact line breaks in mixed content", () => {
    const text = "پہلی لائن PDF\nدوسری لائن\n\nتیسری لائن 42";
    expect(strip(formatForWhatsAppRTL(text))).toBe(text);
  });

  it("leaves Arabic quotation marks stable", () => {
    const text = "اس نے کہا: «یہ درست ہے»";
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

  it("keeps URL characters exactly", () => {
    const url = "https://qalamworks.com/path?x=1&y=2#frag";
    expect(strip(formatForWhatsAppRTL(`لنک ${url} ہے`))).toBe(`لنک ${url} ہے`);
  });

  it("keeps email characters exactly", () => {
    const email = "user.name+tag@qalamworks.com";
    expect(strip(formatForWhatsAppRTL(`ای میل ${email}`))).toBe(`ای میل ${email}`);
  });

  it("is idempotent", () => {
    const text = "رپورٹ PDF\n1. فائل\nقیمت 1500 PKR";
    const once = formatForWhatsAppRTL(text);
    expect(formatForWhatsAppRTL(once)).toBe(once);
  });

  it("always produces balanced LRI/RLI/PDI pairs", () => {
    const text = "اردو PDF اور 1500\n1. نقطہ";
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

  it("numbered list: RLI wraps line; embedded LTR isolated", () => {
    const text = "1. فائل PDF\n2. قیمت 2500 PKR";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "2500" + PDI);
  });

  it("RLI-wraps RTL lines with pure punctuation", () => {
    const text = "اردو ... !!! ???";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.startsWith(RLI)).toBe(true);
  });

  it("isolates consecutive LTR runs separately", () => {
    const text = "فائل PDF اور DOCX دونوں";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "DOCX" + PDI);
  });

  it("preserves user LRM mid-text", () => {
    const userLrm = "\u200E";
    const text = `اردو${userLrm}PDF${userLrm}متن`;
    const result = formatForWhatsAppRTL(text);
    expect(result.includes(userLrm)).toBe(true);
    expect(strip(result)).toBe(text);
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
    expect(formatForWhatsAppRTL(text)).toContain(LRI + "2024-08-12" + PDI);
  });

  it("isolates complex URLs", () => {
    const url = "https://qalamworks.com/docs?id=42&lang=ur#section-2";
    expect(strip(formatForWhatsAppRTL(`مزید ${url} یہاں`))).toBe(`مزید ${url} یہاں`);
  });

  it("isolates complex emails", () => {
    const email = "support+docs@qalamworks.services";
    expect(strip(formatForWhatsAppRTL(`رابطہ ${email}`))).toBe(`رابطہ ${email}`);
  });

  it("real list regression: markers + amounts + asterisk", () => {
    const text = `1. بینک شو روم
2. اسلامی بینک
3. اس کے بعد 720,000 سے 950,000
* وضاحت: مزید تفصیل بعد میں`;
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain("1." + LRM);
    expect(result).toContain("2." + LRM);
    expect(result).toContain("3." + LRM);
    expect(result).toContain(LRI + "720,000" + PDI);
  });

  it("asterisk and bullet lines stay RLI without marker LRM", () => {
    const text = `* وضاحت
• پہلا
- دوسرا`;
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
  });

  it("ordinary Urdu paragraph is RLI-wrapped", () => {
    const text = "قرض کی ادائیگی کے بعد بینک آپ کو مکمل دستاویزات فراہم کرے گا۔";
    const result = formatForWhatsAppRTL(text);
    expect(result.startsWith(RLI)).toBe(true);
    expect(strip(result)).toBe(text);
  });

  it("isolates PKR amounts", () => {
    const text = "کل رقم 4500 PKR ادا کریں";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "4500" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
  });

  // --- Numbered-marker candidate structure ---

  it("candidate: numbered marker is digits+punct+LRM (no nested LRI on marker)", () => {
    const text = "1. اردو متن\n2. اردو متن\n3. اردو متن";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);

    // Exact structure: RLI + "N." + LRM + rest + PDI
    const lines = result.split("\n").filter((l) => l.includes(RLI));
    expect(lines).toHaveLength(3);
    for (const n of ["1.", "2.", "3."]) {
      expect(result).toContain(n + LRM);
      // Marker itself must NOT be wrapped in LRI
      expect(result).not.toContain(LRI + n);
      expect(result).not.toContain(LRI + n[0] + LRM);
    }
    for (const line of lines) {
      expect(line.startsWith(RLI)).toBe(true);
    }
  });

  it("candidate: parenthesis markers use digits+)+LRM", () => {
    const text = "1) اردو متن\n2) اردو متن";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain("1)" + LRM);
    expect(result).toContain("2)" + LRM);
    expect(result).not.toContain(LRI + "1)");
  });

  it("embedded mid-line numbers stay LRI-wrapped without marker LRM", () => {
    const text = "قیمت 1500 روپے";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).toContain(LRI + "1500" + PDI);
    expect(result).not.toContain("1500" + LRM);
  });

  it("final RLM anchor still applied after RTL content", () => {
    const text = "یہ آخری سطر ہے۔";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.endsWith("\n" + RLM) || result.endsWith(RLM)).toBe(true);
  });

  it("final RLM + numbered markers remain idempotent", () => {
    const text = "1. پہلا\n2. دوسرا";
    const once = formatForWhatsAppRTL(text);
    expect(formatForWhatsAppRTL(once)).toBe(once);
    expect(strip(once)).toBe(text);
  });

  it("no final RLM for pure English", () => {
    expect(formatForWhatsAppRTL("Hello world")).toBe("Hello world");
  });
});
