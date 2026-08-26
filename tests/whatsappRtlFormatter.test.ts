import { describe, it, expect } from "vitest";
import {
  formatForWhatsAppRTL,
  countBidiControls,
  BIDI,
} from "../app/utils/whatsappRtlFormatter";
import { convertMarkdownForWhatsApp } from "../app/tools/whatsapp-rtl-formatter/utils/whatsappMarkdownCompat";

const { LRI, RLI, PDI, LRM, RLM } = BIDI;

function strip(text: string): string {
  return text
    .replace(/(?:\r?\n)\u200F\s*$/g, "")
    .replace(/[\u2066\u2067\u2069\u200F]/g, "")
    .replace(/(\d+)\u200E\./g, "$1.");
}

describe("formatForWhatsAppRTL", () => {
  it("returns empty string for empty input", () => {
    expect(formatForWhatsAppRTL("")).toBe("");
  });

  it("returns whitespace-only input unchanged", () => {
    expect(formatForWhatsAppRTL("   \n  \t")).toBe("   \n  \t");
  });

  it("wraps pure Urdu lines in RLM…RLM", () => {
    const urdu = "یہ ایک سادہ اردو جملہ ہے۔";
    const result = formatForWhatsAppRTL(urdu);
    expect(strip(result)).toBe(urdu);
    expect(result.startsWith(RLM)).toBe(true);
  });

  it("does not wrap pure English paragraphs", () => {
    expect(formatForWhatsAppRTL("Hello world.")).toBe("Hello world.");
  });

  it("does not wrap pure English multiline text", () => {
    const eng = "First line.\nSecond line with numbers 123.\nThird.";
    expect(formatForWhatsAppRTL(eng)).toBe(eng);
  });

  it("wraps mixed line in RLM and isolates English with LRI", () => {
    const mixed = "یہ PDF فائل ہے";
    const result = formatForWhatsAppRTL(mixed);
    expect(strip(result)).toBe(mixed);
    expect(result.startsWith(RLM)).toBe(true);
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
    expect(result.startsWith(RLM)).toBe(true);
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

  // A. Dot-style 1. — peeled raw (NO LRI, NO LRM on marker), outer RLM only
  it("A: dot-style marker is raw inside RLM; no LRI/LRM on marker", () => {
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
    expect(first.startsWith(RLM)).toBe(true);
    // Marker appears immediately after RLM (raw)
    expect(first.startsWith(RLM + "1.")).toBe(true);
    const rtlLines = result
      .split("\n")
      .filter((l) => l.includes(RLM) && l.replace(/\u200F/g, "").trim() !== "");
    expect(rtlLines.length).toBe(3);
  });

  it("A: dot-style body still isolates embedded LTR tokens", () => {
    const text = "1. رپورٹ PDF میں محفوظ کریں";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.startsWith(RLM + "1.")).toBe(true);
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
    // Line still RLM-wrapped
    expect(result.split("\n")[0].startsWith(RLM)).toBe(true);
  });

  // C. Bullet •
  it("C: bullet • not specially transformed", () => {
    const text = "• پہلا بلٹ\n• دوسرا بلٹ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).not.toContain("•" + LRM);
    expect(result).not.toContain(LRI + "•");
    expect(result.split("\n")[0].startsWith(RLM)).toBe(true);
  });

  // D. Bullet *
  it("D: bullet * not specially transformed", () => {
    const text = "* پہلا بلٹ\n* دوسرا بلٹ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).not.toContain("*" + LRM);
    expect(result.split("\n")[0].startsWith(RLM)).toBe(true);
  });

  // E. Bullet -
  it("E: bullet - not specially transformed", () => {
    const text = "- پہلا بلٹ\n- دوسرا بلٹ";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result).not.toContain("-" + LRM);
    expect(result.split("\n")[0].startsWith(RLM)).toBe(true);
  });

  // F. Final line RLM
  it("F: final RTL line gets trailing newline+RLM anchor", () => {
    const text = "آخری اردو سطر";
    const result = formatForWhatsAppRTL(text);
    expect(strip(result)).toBe(text);
    expect(result.endsWith("\n" + RLM)).toBe(true);
    expect(result.startsWith(RLM)).toBe(true);
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
    expect(result).toContain(RLM + "1.");
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

  // ── Real-world regression: fiqhi sample with bold markers, bullets, fractions ──

  const FIQHI_SAMPLE = [
    "**مختصر جواب:**",
    "",
    "اسلامی شریعت میں عورت کو وراثت کا حق حاصل ہے، جو مرد کی نسبت نصف (1/4) ہے۔",
    "",
    "**تفصیلی احکام:**",
    "",
    "- **حقِ وراثت کا قیام:** قرآن کریم نے واضح طور پر عورت کے حق وراثت کو ثابت کیا ہے۔",
    "- **بچوں کا حق:** اگر صرف بچے ہوں تو بیٹی کو بیٹے کے مقابلے میں نصف ملتا ہے۔",
    "- **شوہر یا بیوی:** زوجین میں سے ہر ایک کو مخصوص حصہ ملتا ہے۔",
    "- **عصبہ:** جب کوئی مقرر وارث نہ ہو تو عصبہ کو باقی مال ملتا ہے۔",
    "",
    "**خلاصہ:**",
  ].join("\n");

  it("fiqhi: strip(formatted) equals input byte-for-byte", () => {
    const result = formatForWhatsAppRTL(FIQHI_SAMPLE);
    expect(strip(result)).toBe(FIQHI_SAMPLE);
  });

  it("fiqhi: blank lines preserved in output", () => {
    const result = formatForWhatsAppRTL(FIQHI_SAMPLE);
    const lines = strip(result).split("\n");
    // Lines 1, 3, 5, 10 must be blank (0-indexed)
    expect(lines[1]).toBe("");
    expect(lines[3]).toBe("");
    expect(lines[5]).toBe("");
    expect(lines[10]).toBe("");
  });

  it("fiqhi: **bold** heading markers not wrapped in LRI", () => {
    const result = formatForWhatsAppRTL(FIQHI_SAMPLE);
    // LRI must never immediately follow **
    expect(result).not.toContain("**" + LRI);
    // LRI must never immediately precede **
    expect(result).not.toContain(LRI + "**");
  });

  it("fiqhi: bold headings are inside RLM…RLM with ** intact", () => {
    const result = formatForWhatsAppRTL(FIQHI_SAMPLE);
    expect(result).toContain(RLM + "**مختصر جواب:**" + RLM);
    expect(result).toContain(RLM + "**تفصیلی احکام:**" + RLM);
    expect(result).toContain(RLM + "**خلاصہ:**" + RLM);
  });

  it("fiqhi: bullet lines start with RLM + '- **' (marker and bold intact)", () => {
    const result = formatForWhatsAppRTL(FIQHI_SAMPLE);
    const lines = result.split("\n");
    // Lines 6-9 are the four bullet lines (0-indexed)
    for (const bulletLine of lines.filter(l => l.startsWith(RLM + "- **"))) {
      expect(bulletLine.startsWith(RLM + "- **")).toBe(true);
    }
    // Exactly 4 bullet lines
    const bulletCount = lines.filter(l => l.startsWith(RLM + "- **")).length;
    expect(bulletCount).toBe(4);
  });

  it("fiqhi: '-' bullets not converted to '*' bullets", () => {
    const result = formatForWhatsAppRTL(FIQHI_SAMPLE);
    const stripped = strip(result);
    // Match only actual bullet lines (marker followed by space), not bold headers starting with **
    const bulletLines = stripped.split("\n").filter(l => /^[-*•] /.test(l));
    expect(bulletLines).toHaveLength(4);
    for (const line of bulletLines) {
      expect(line.startsWith("- ")).toBe(true);
    }
  });

  it("fiqhi: fraction 1/4 is LRI-isolated, parens remain outside", () => {
    const result = formatForWhatsAppRTL(FIQHI_SAMPLE);
    expect(result).toContain(LRI + "1/4" + PDI);
    // Parens must be OUTSIDE the LRI/PDI
    expect(result).toContain("(" + LRI + "1/4" + PDI + ")");
  });

  it("fiqhi: is idempotent (no bidi control accumulation)", () => {
    const once = formatForWhatsAppRTL(FIQHI_SAMPLE);
    const twice = formatForWhatsAppRTL(once);
    expect(twice).toBe(once);
  });

  it("fiqhi: all four named bullet headings preserved exactly", () => {
    const result = strip(formatForWhatsAppRTL(FIQHI_SAMPLE));
    const lines = result.split("\n");
    expect(lines).toContain("- **حقِ وراثت کا قیام:** قرآن کریم نے واضح طور پر عورت کے حق وراثت کو ثابت کیا ہے۔");
    expect(lines).toContain("- **بچوں کا حق:** اگر صرف بچے ہوں تو بیٹی کو بیٹے کے مقابلے میں نصف ملتا ہے۔");
    expect(lines).toContain("- **شوہر یا بیوی:** زوجین میں سے ہر ایک کو مخصوص حصہ ملتا ہے۔");
    expect(lines).toContain("- **عصبہ:** جب کوئی مقرر وارث نہ ہو تو عصبہ کو باقی مال ملتا ہے۔");
  });
});

// ── convertMarkdownForWhatsApp — focused compatibility tests ─────────────────

describe("convertMarkdownForWhatsApp", () => {
  it("**heading:** → *heading:*", () => {
    expect(convertMarkdownForWhatsApp("**مختصر جواب:**"))
      .toBe("*مختصر جواب:*");
  });

  it("bullet bold heading: '- **label:** text' → '- *label:* text'", () => {
    const input  = "- **حقِ وراثت کا قیام:** قرآن کریم نے واضح طور پر عورت کے حق وراثت کو ثابت کیا ہے۔";
    const output = "- *حقِ وراثت کا قیام:* قرآن کریم نے واضح طور پر عورت کے حق وراثت کو ثابت کیا ہے۔";
    expect(convertMarkdownForWhatsApp(input)).toBe(output);
  });

  it("multiple bold spans on one line including fraction 1/4", () => {
    const input  = "**شوہر کا حصہ:** کچھ متن **ایک چوتھائی (1/4)** اور مزید";
    const output = "*شوہر کا حصہ:* کچھ متن *ایک چوتھائی (1/4)* اور مزید";
    expect(convertMarkdownForWhatsApp(input)).toBe(output);
  });

  it("blank lines preserved unchanged", () => {
    const input = "**ہیڈنگ:**\n\nمتن";
    const output = "*ہیڈنگ:*\n\nمتن";
    expect(convertMarkdownForWhatsApp(input)).toBe(output);
  });

  it("existing WhatsApp-native *bold* is NOT altered", () => {
    expect(convertMarkdownForWhatsApp("*مختصر جواب:*"))
      .toBe("*مختصر جواب:*");
  });

  it("triple-asterisk ***text*** is NOT converted", () => {
    expect(convertMarkdownForWhatsApp("***مختصر جواب:***"))
      .toBe("***مختصر جواب:***");
  });

  it("'- ' bullet marker is NOT converted to '* '", () => {
    const input  = "- متن\n- مزید";
    expect(convertMarkdownForWhatsApp(input)).toBe(input);
  });

  it("full fiqhi sample: all ** converted, structure preserved", () => {
    const input = [
      "**مختصر جواب:**",
      "",
      "اسلامی شریعت میں عورت کو وراثت کا حق حاصل ہے، جو مرد کی نسبت نصف (1/4) ہے۔",
      "",
      "**تفصیلی احکام:**",
      "",
      "- **حقِ وراثت کا قیام:** قرآن کریم نے واضح طور پر عورت کے حق وراثت کو ثابت کیا ہے۔",
      "- **بچوں کا حق:** اگر صرف بچے ہوں تو بیٹی کو بیٹے کے مقابلے میں نصف ملتا ہے۔",
      "- **شوہر یا بیوی:** زوجین میں سے ہر ایک کو مخصوص حصہ ملتا ہے۔",
      "- **عصبہ:** جب کوئی مقرر وارث نہ ہو تو عصبہ کو باقی مال ملتا ہے۔",
      "",
      "**خلاصہ:**",
    ].join("\n");
    const expected = [
      "*مختصر جواب:*",
      "",
      "اسلامی شریعت میں عورت کو وراثت کا حق حاصل ہے، جو مرد کی نسبت نصف (1/4) ہے۔",
      "",
      "*تفصیلی احکام:*",
      "",
      "- *حقِ وراثت کا قیام:* قرآن کریم نے واضح طور پر عورت کے حق وراثت کو ثابت کیا ہے۔",
      "- *بچوں کا حق:* اگر صرف بچے ہوں تو بیٹی کو بیٹے کے مقابلے میں نصف ملتا ہے۔",
      "- *شوہر یا بیوی:* زوجین میں سے ہر ایک کو مخصوص حصہ ملتا ہے۔",
      "- *عصبہ:* جب کوئی مقرر وارث نہ ہو تو عصبہ کو باقی مال ملتا ہے۔",
      "",
      "*خلاصہ:*",
    ].join("\n");
    expect(convertMarkdownForWhatsApp(input)).toBe(expected);
  });

  it("idempotent: running twice yields same result", () => {
    const input = "**مختصر جواب:**\n- **حقِ وراثت کا قیام:** متن";
    const once  = convertMarkdownForWhatsApp(input);
    const twice = convertMarkdownForWhatsApp(once);
    expect(twice).toBe(once);
  });
});
