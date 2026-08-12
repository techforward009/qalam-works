import { describe, it, expect } from "vitest";
import {
  formatForWhatsAppRTL,
  countBidiControls,
  BIDI,
} from "../app/utils/whatsappRtlFormatter";

const { LRI, PDI } = BIDI;

describe("formatForWhatsAppRTL", () => {
  // 1. Empty / trivial
  it("returns empty string for empty input", () => {
    expect(formatForWhatsAppRTL("")).toBe("");
  });

  it("returns whitespace-only input unchanged", () => {
    expect(formatForWhatsAppRTL("   \n  \t")).toBe("   \n  \t");
  });

  // 2. Pure Urdu – no controls
  it("leaves pure Urdu text untouched", () => {
    const urdu = "یہ ایک سادہ اردو جملہ ہے۔";
    const result = formatForWhatsAppRTL(urdu);
    expect(result).toBe(urdu);
    expect(countBidiControls(result)).toBe(0);
  });

  // 3. Pure English – MUST stay untouched (no LRI/PDI)
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

  // 4. Urdu + English – isolate only the LTR fragment
  it("isolates English words inside Urdu text", () => {
    const mixed = "یہ PDF فائل ہے";
    const result = formatForWhatsAppRTL(mixed);
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(mixed);
  });

  // 5. Urdu + numbers
  it("isolates numbers inside RTL context", () => {
    const text = "قیمت 1500 روپے ہے";
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(LRI + "1500" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 6. Abbreviations
  it("isolates common abbreviations PDF DOCX TXT PKR", () => {
    const text = "رپورٹ PDF اور DOCX اور TXT میں محفوظ کریں قیمت PKR";
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "DOCX" + PDI);
    expect(result).toContain(LRI + "TXT" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 7. URLs
  it("preserves and isolates a full URL inside RTL", () => {
    const text = "سائٹ https://qalamworks.com دیکھیں";
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(LRI + "https://qalamworks.com" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 8. Emails
  it("preserves and isolates an email address inside RTL", () => {
    const text = "ای میل qalamworks.services@gmail.com پر بھیجیں";
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(LRI + "qalamworks.services@gmail.com" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 9. Bullet lists (•)
  it("keeps bullet markers attached and isolates LTR inside", () => {
    const text = "• پہلا نکتہ PDF\n• دوسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    expect(result.startsWith("•")).toBe(true);
    expect(result).toContain(LRI + "PDF" + PDI);
    // Marker itself must not be wrapped
    expect(result.startsWith(LRI)).toBe(false);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 10. Hyphen lists
  it("preserves hyphen list markers", () => {
    const text = "- پہلا نکتہ\n- دوسرا نکتہ 1500";
    const result = formatForWhatsAppRTL(text);
    expect(result).toMatch(/^- /m);
    expect(result).toContain(LRI + "1500" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 11. Asterisk lists
  it("preserves asterisk list markers", () => {
    const text = "* پہلا نکتہ\n* دوسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    expect(result).toMatch(/^\* /m);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 12. Numbered lists – markers must NOT be isolated
  it("does not isolate numbered list markers (dot style)", () => {
    const text = "1. پہلا نکتہ\n2. دوسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    // Markers stay plain
    expect(result).toMatch(/^1\. /m);
    expect(result).toMatch(/^2\. /m);
    expect(result).not.toContain(LRI + "1." + PDI);
    expect(result).not.toContain(LRI + "2." + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  it("does not isolate numbered list markers (parenthesis style)", () => {
    const text = "1) پہلا نکتہ\n2) دوسرا نکتہ";
    const result = formatForWhatsAppRTL(text);
    expect(result).toMatch(/^1\) /m);
    expect(result).toMatch(/^2\) /m);
    expect(result).not.toContain(LRI + "1)" + PDI);
    expect(result).not.toContain(LRI + "2)" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 13. Punctuation around English fragments
  it("does not reverse or lose punctuation next to English", () => {
    const text = "فائل (PDF) دیکھیں۔";
    const result = formatForWhatsAppRTL(text);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
    expect(result).toContain("PDF");
  });

  // 14. Multiline mixed text
  it("preserves exact line breaks in mixed content", () => {
    const text = "پہلی لائن PDF\nدوسری لائن\n\nتیسری لائن 42";
    const result = formatForWhatsAppRTL(text);
    expect(result.split("\n").length).toBe(4);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 15. Arabic quotations
  it("leaves Arabic quotation marks and surrounding text stable", () => {
    const text = "اس نے کہا: «یہ درست ہے»";
    const result = formatForWhatsAppRTL(text);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 16. No visible content loss
  it("never drops any visible character", () => {
    const text =
      "رپورٹ PDF میں محفوظ کریں\nفائل qalamworks.com پر اپلوڈ کریں\nقیمت 1500 PKR ہے";
    const result = formatForWhatsAppRTL(text);
    const stripped = result.replace(/[\u2066\u2069]/g, "");
    expect(stripped).toBe(text);
  });

  // 17. No character reversal
  it("does not reverse English or Urdu character order", () => {
    const text = "Hello دنیا 123";
    const result = formatForWhatsAppRTL(text);
    const stripped = result.replace(/[\u2066\u2069]/g, "");
    expect(stripped).toBe(text);
    expect(stripped.indexOf("Hello")).toBeLessThan(stripped.indexOf("دنیا"));
    expect(stripped.indexOf("دنیا")).toBeLessThan(stripped.indexOf("123"));
  });

  // 18. URL preservation (exact)
  it("keeps URL characters exactly", () => {
    const url = "https://qalamworks.com/path?x=1&y=2#frag";
    const text = `لنک ${url} ہے`;
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(url);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 19. Email preservation
  it("keeps email characters exactly", () => {
    const email = "user.name+tag@qalamworks.com";
    const text = `ای میل ${email}`;
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(email);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 20. Idempotence
  it("is idempotent – second pass does not change output", () => {
    const text =
      "رپورٹ PDF میں محفوظ کریں\nقیمت 1500 PKR\nhttps://qalamworks.com";
    const once = formatForWhatsAppRTL(text);
    const twice = formatForWhatsAppRTL(once);
    expect(twice).toBe(once);
  });

  // 21. Balanced bidi controls
  it("always produces balanced LRI/PDI pairs", () => {
    const text =
      "اردو PDF اور 1500 PKR اور https://example.com اور test@email.com";
    const result = formatForWhatsAppRTL(text);
    let depth = 0;
    for (const ch of result) {
      if (ch === LRI) depth++;
      if (ch === PDI) depth--;
      expect(depth).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });

  // 22. Realistic mixed paragraph
  it("handles a realistic mixed paragraph", () => {
    const text =
      "رپورٹ PDF میں محفوظ کریں۔ فائل qalamworks.com پر اپلوڈ کریں۔ قیمت 1500 PKR ہے۔ ای میل qalamworks.services@gmail.com پر بھیجیں۔";
    const result = formatForWhatsAppRTL(text);
    const stripped = result.replace(/[\u2066\u2069]/g, "");
    expect(stripped).toBe(text);
    expect(countBidiControls(result)).toBeGreaterThan(0);
  });

  // 23. Numbered list with mixed content – markers free, content isolated
  it("handles numbered list containing English and numbers without isolating markers", () => {
    const text = "1. فائل PDF\n2. قیمت 2500 PKR\n3. لنک https://qalamworks.com";
    const result = formatForWhatsAppRTL(text);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
    // Markers not isolated
    expect(result).not.toContain(LRI + "1." + PDI);
    expect(result).not.toContain(LRI + "2." + PDI);
    expect(result).not.toContain(LRI + "3." + PDI);
    // Content is isolated
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "2500" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
    expect(result).toContain(LRI + "https://qalamworks.com" + PDI);
  });

  // 24. Pure punctuation / no alphanumeric LTR → no isolation
  it("does not isolate pure punctuation runs", () => {
    const text = "اردو ... !!! ???";
    const result = formatForWhatsAppRTL(text);
    expect(countBidiControls(result)).toBe(0);
    expect(result).toBe(text);
  });

  // 25. Multiple consecutive LTR runs inside RTL
  it("isolates consecutive distinct LTR runs separately", () => {
    const text = "فائل PDF اور DOCX دونوں";
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "DOCX" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 26. Preserves user-supplied directional marks
  it("does not remove arbitrary user directional marks", () => {
    const LRM = "\u200E";
    const text = `اردو${LRM}PDF${LRM}متن`;
    const result = formatForWhatsAppRTL(text);
    expect(result.includes(LRM)).toBe(true);
    const strippedOwn = result.replace(/[\u2066\u2069]/g, "");
    expect(strippedOwn).toBe(text);
  });

  // 27. Non-string guard
  it("returns empty string for non-string input", () => {
    // @ts-expect-error testing runtime guard
    expect(formatForWhatsAppRTL(null)).toBe("");
    // @ts-expect-error testing runtime guard
    expect(formatForWhatsAppRTL(undefined)).toBe("");
  });

  // 28. Pure English list stays untouched
  it("does not modify pure English numbered lists", () => {
    const text = "1. First item\n2. Second item";
    const result = formatForWhatsAppRTL(text);
    expect(result).toBe(text);
    expect(countBidiControls(result)).toBe(0);
  });

  // ---------- Regression / additional coverage ----------

  // 29. Numbered RTL list – marker stays plain, embedded LTR isolated
  it("numbered RTL list keeps marker attached and isolates only content", () => {
    const text = "1. دستاویز PDF میں محفوظ کریں\n2. قیمت 3200 PKR";
    const result = formatForWhatsAppRTL(text);
    expect(result.startsWith("1. ")).toBe(true);
    expect(result).not.toContain(LRI + "1." + PDI);
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "3200" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 30. Numeric ranges
  it("isolates numeric ranges as coherent LTR tokens", () => {
    const text = "قیمت کی حد 1500-2500 PKR ہے";
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(LRI + "1500-2500" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 31. Dates
  it("isolates dates as LTR tokens", () => {
    const text = "تاریخ اشاعت 2024-08-12 ہے";
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(LRI + "2024-08-12" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 32. Complex URL with query and fragment
  it("isolates full complex URLs", () => {
    const url = "https://qalamworks.com/docs?id=42&lang=ur#section-2";
    const text = `مزید تفصیل ${url} پر دستیاب ہے`;
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(LRI + url + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 33. Email with plus and subdomain
  it("isolates complex email addresses", () => {
    const email = "support+docs@qalamworks.services";
    const text = `رابطہ ${email} پر کریں`;
    const result = formatForWhatsAppRTL(text);
    expect(result).toContain(LRI + email + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 34. Mixed punctuation around LTR tokens
  it("handles mixed punctuation around LTR fragments without content loss", () => {
    const text = "فائل (PDF/DOCX) دیکھیں؛ قیمت ≈ 1,500.00 PKR۔";
    const result = formatForWhatsAppRTL(text);
    const stripped = result.replace(/[\u2066\u2069]/g, "");
    expect(stripped).toBe(text);
    expect(result).toContain("PDF");
    expect(result).toContain("DOCX");
    expect(result).toContain("PKR");
  });

  // 35. List marker + range + content
  it("keeps list marker + range intact while isolating content", () => {
    const text = "1. رینج 100-200 صفحات";
    const result = formatForWhatsAppRTL(text);
    expect(result.startsWith("1. ")).toBe(true);
    expect(result).not.toContain(LRI + "1." + PDI);
    expect(result).toContain(LRI + "100-200" + PDI);
    expect(result.replace(/[\u2066\u2069]/g, "")).toBe(text);
  });

  // 36. Realistic AI-generated Urdu message (greeting + list + PDF + PKR + email + URL)
  it("formats a realistic AI-generated Urdu message without content loss", () => {
    const text = `السلام علیکم،

آپ کی درخواست پر تفصیلات یہ ہیں:

1. دستاویز PDF میں محفوظ کریں
2. ادائیگی 4500 PKR ہے
3. ای میل support@qalamworks.com پر بھیجیں
4. مزید معلومات https://qalamworks.com/docs پر دستیاب ہیں

شکریہ۔`;
    const result = formatForWhatsAppRTL(text);
    const stripped = result.replace(/[\u2066\u2069]/g, "");
    expect(stripped).toBe(text);
    // List markers stay plain
    expect(result).not.toContain(LRI + "1." + PDI);
    expect(result).not.toContain(LRI + "2." + PDI);
    expect(result).not.toContain(LRI + "3." + PDI);
    expect(result).not.toContain(LRI + "4." + PDI);
    // Embedded LTR tokens are isolated
    expect(result).toContain(LRI + "PDF" + PDI);
    expect(result).toContain(LRI + "4500" + PDI);
    expect(result).toContain(LRI + "PKR" + PDI);
    expect(result).toContain(LRI + "support@qalamworks.com" + PDI);
    expect(result).toContain(LRI + "https://qalamworks.com/docs" + PDI);
  });
});
