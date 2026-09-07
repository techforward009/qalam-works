import { describe, it, expect } from "vitest";
import {
  formatForWhatsAppRTL,
  countBidiControls,
  BIDI,
} from "../app/utils/whatsappRtlFormatter";

const { RLM, LRI, PDI, RTL_SEED } = BIDI;
const BODY_BIDI_RE = /[\u200E\u2066\u2067\u2069\u061C]/;

function stripFinal(s: string): string {
  return s.replace(/(?:\r?\n)\u200F\s*$/g, "");
}

function stripBidi(s: string): string {
  return s.replace(/[\u2066\u2067\u2069\u200E\u200F\u061C]/g, "");
}

function stripDecorations(s: string): string {
  return stripBidi(s).replace(/(^|\n)ا(?=(?:\d+[).]\s*)?[A-Za-z])/g, "$1");
}

describe("formatForWhatsAppRTL — Variant M", () => {
  it("returns empty string for empty input", () => {
    expect(formatForWhatsAppRTL("")).toBe("");
  });

  it("leaves pure Urdu body unchanged; may add final RLM stabilizer", () => {
    const urdu = "یہ ایک سادہ اردو جملہ ہے۔";
    const result = formatForWhatsAppRTL(urdu);
    expect(stripFinal(result)).toBe(urdu);
    expect(BODY_BIDI_RE.test(result)).toBe(false);
    expect(result.endsWith("\n" + RLM) || result.endsWith(RLM)).toBe(true);
  });

  it("leaves pure English without final RLM", () => {
    expect(formatForWhatsAppRTL("Hello world.")).toBe("Hello world.");
  });

  it("wraps Latin runs in mixed Urdu + English", () => {
    const mixed = "یہ Qalam Works کا ٹول ہے۔";
    expect(stripDecorations(stripFinal(formatForWhatsAppRTL(mixed)))).toBe(mixed);
    expect(stripFinal(formatForWhatsAppRTL(mixed))).toBe(
      RLM + "یہ " + LRI + "Qalam Works" + PDI + " کا ٹول ہے۔",
    );
  });

  it("wraps URLs as a single Latin run", () => {
    const text = "سائٹ https://qalamworks.com دیکھیں";
    expect(stripDecorations(stripFinal(formatForWhatsAppRTL(text)))).toBe(text);
    expect(stripFinal(formatForWhatsAppRTL(text))).toContain(
      LRI + "https://qalamworks.com" + PDI,
    );
  });

  it("converts 1. to 1)", () => {
    expect(stripFinal(formatForWhatsAppRTL("1. پہلا نکتہ"))).toBe("1) پہلا نکتہ");
  });

  it("converts bullets to ◆ with gap", () => {
    const input = "• پہلا بلٹ\n• دوسرا بلٹ";
    expect(stripFinal(formatForWhatsAppRTL(input))).toBe(RLM + "◆ پہلا بلٹ\n" + RLM + "◆ دوسرا بلٹ");
  });

  it("indents continuation lines under bullet text", () => {
    const input = "• پہلا بلٹ\n  جاری متن";
    expect(stripFinal(formatForWhatsAppRTL(input))).toBe(RLM + "◆ پہلا بلٹ\n  جاری متن");
  });

  it("does not inject RLI or LRM", () => {
    const result = formatForWhatsAppRTL("• بلٹ\nیہ PDF ہے\nhttps://x.com");
    expect(result).not.toMatch(/[\u200E\u2067]/);
  });

  it("is idempotent after stripping final stabilizer", () => {
    const input = "1. پہلا\n• دوسرا\nیہ ٹول ہے۔";
    const once = stripFinal(formatForWhatsAppRTL(input));
    const twice = stripFinal(formatForWhatsAppRTL(once));
    expect(twice).toBe(once);
  });
});

describe("formatForWhatsAppRTL — mixed-script bidi", () => {
  it("keeps 1) Lachesis — attached at the start of an RTL paragraph", () => {
    const input = "1) Lachesis —\nمناسبت: بائیں طرف کا مکمل غلبہ";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result.startsWith(RLM)).toBe(true);
    expect(result).toContain(LRI + "1) Lachesis —" + PDI);
    expect(stripDecorations(result)).toBe(input);
  });

  it("keeps 2) Spigelia — attached at the start of an RTL paragraph", () => {
    const input = "2) Spigelia —\nدل کی طرف درد";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result.startsWith(RLM)).toBe(true);
    expect(result).toContain(LRI + "2) Spigelia —" + PDI);
    expect(stripDecorations(result)).toBe(input);
  });

  it("keeps 3) Carbo vegetabilis — as one Latin run", () => {
    const input = "3) Carbo vegetabilis —\nخون کی کمی";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result.startsWith(RLM)).toBe(true);
    expect(result).toContain(LRI + "3) Carbo vegetabilis —" + PDI);
    expect(stripDecorations(result)).toBe(input);
  });

  it("wraps inline Latin in an Urdu sentence", () => {
    const input = "یہ دوا Spigelia پہلے بھی کام کرتی رہی ہے۔";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result).toBe(
      RLM + "یہ دوا " + LRI + "Spigelia" + PDI + " پہلے بھی کام کرتی رہی ہے۔",
    );
    expect(result).not.toContain(RTL_SEED + LRI);
  });

  it("does not alter a pure Urdu/Arabic paragraph", () => {
    const urdu = "مناسبت: بائیں طرف کا مکمل غلبہ۔";
    expect(stripFinal(formatForWhatsAppRTL(urdu))).toBe(urdu);
  });

  it("does not double-wrap text that already contains bidi isolates", () => {
    const input = "1) Lachesis —\nمناسبت: بائیں طرف";
    const once = formatForWhatsAppRTL(input);
    const twice = formatForWhatsAppRTL(once);
    expect(twice).toBe(once);
    expect((once.match(/\u2066/g) || []).length).toBe(1);
    expect((once.match(/\u2069/g) || []).length).toBe(1);
    expect(countBidiControls(twice)).toBe(countBidiControls(once));
  });
});

describe("formatForWhatsAppRTL — leading Arabic seed for mobile", () => {
  it("puts ا before numbering + English so stripped mobile text is still RTL-first", () => {
    const input = "1) Lachesis —\nمناسبت: بائیں طرف کا مکمل غلبہ";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result).toContain(RTL_SEED + LRI + "1) Lachesis —" + PDI);
    const mobile = stripBidi(result);
    expect(mobile.startsWith(RTL_SEED)).toBe(true);
    expect(mobile).toContain(RTL_SEED + "1) Lachesis —");
  });

  it("seeds each numbered English heading, not the following Urdu line", () => {
    const input =
      "1) Lachesis —\nمناسبت: بائیں طرف\n2) Spigelia —\nدل کی طرف درد\n3) Carbo vegetabilis —\nخون کی کمی";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result).toContain(RTL_SEED + LRI + "1) Lachesis —" + PDI);
    expect(result).toContain(RTL_SEED + LRI + "2) Spigelia —" + PDI);
    expect(result).toContain(RTL_SEED + LRI + "3) Carbo vegetabilis —" + PDI);
    expect(result).not.toContain(RTL_SEED + "مناسبت");
    expect(result).not.toContain(RTL_SEED + "دل");
    expect((stripBidi(result).match(/^ا/gm) || []).length).toBe(3);
  });

  it("does not seed inline English after Urdu", () => {
    const input = "یہ دوا Spigelia پہلے بھی کام کرتی رہی ہے۔";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(stripBidi(result).startsWith(RTL_SEED)).toBe(false);
    expect(result).toContain(LRI + "Spigelia" + PDI);
  });

  it("does not stack ا on re-format", () => {
    const input = "1) Lachesis —\nمناسبت: بائیں طرف";
    const once = stripFinal(formatForWhatsAppRTL(input));
    const twice = stripFinal(formatForWhatsAppRTL(once));
    expect(twice).toBe(once);
    expect((stripBidi(once).match(/^ا/gm) || []).length).toBe(1);
  });
});
