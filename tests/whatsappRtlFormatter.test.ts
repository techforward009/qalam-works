import { describe, it, expect } from "vitest";
import {
  formatForWhatsAppRTL,
  countBidiControls,
  BIDI,
} from "../app/utils/whatsappRtlFormatter";

const { RLM, LRI, PDI, ALM } = BIDI;
const BODY_BIDI_RE = /[\u200E\u2066\u2067\u2069\u061C]/;

function stripFinal(s: string): string {
  return s.replace(/(?:\r?\n)\u200F\s*$/g, "");
}

function stripBidi(s: string): string {
  return s.replace(/[\u2066\u2067\u2069\u200E\u200F\u061C]/g, "");
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
    expect(stripBidi(stripFinal(formatForWhatsAppRTL(mixed)))).toBe(mixed);
    expect(stripFinal(formatForWhatsAppRTL(mixed))).toBe(
      RLM + "یہ " + LRI + "Qalam Works" + PDI + " کا ٹول ہے۔",
    );
  });

  it("wraps URLs as a single Latin run", () => {
    const text = "سائٹ https://qalamworks.com دیکھیں";
    expect(stripBidi(stripFinal(formatForWhatsAppRTL(text)))).toBe(text);
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
  it("inserts invisible ALM after 1) and wraps the English run", () => {
    const input = "1) Lachesis —\nمناسبت: بائیں طرف کا مکمل غلبہ";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result.startsWith(RLM)).toBe(true);
    expect(result).toContain("1) " + ALM + LRI + "Lachesis —" + PDI);
    expect(result).not.toContain("ا1)");
    expect(stripBidi(result)).toBe(input);
  });

  it("inserts invisible ALM after 2) Spigelia —", () => {
    const input = "2) Spigelia —\nدل کی طرف درد";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result).toContain("2) " + ALM + LRI + "Spigelia —" + PDI);
    expect(stripBidi(result)).toBe(input);
  });

  it("inserts invisible ALM after 3) Carbo vegetabilis —", () => {
    const input = "3) Carbo vegetabilis —\nخون کی کمی";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result).toContain("3) " + ALM + LRI + "Carbo vegetabilis —" + PDI);
    expect(stripBidi(result)).toBe(input);
  });

  it("wraps inline Latin in an Urdu sentence without ALM", () => {
    const input = "یہ دوا Spigelia پہلے بھی کام کرتی رہی ہے۔";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(result).toBe(
      RLM + "یہ دوا " + LRI + "Spigelia" + PDI + " پہلے بھی کام کرتی رہی ہے۔",
    );
    expect(result).not.toContain(ALM);
  });

  it("does not alter a pure Urdu/Arabic paragraph", () => {
    const urdu = "مناسبت: بائیں طرف کا مکمل غلبہ۔";
    expect(stripFinal(formatForWhatsAppRTL(urdu))).toBe(urdu);
  });

  it("does not insert a visible alef", () => {
    const input = "1) Lachesis —\nمناسبت: بائیں طرف";
    const result = stripFinal(formatForWhatsAppRTL(input));
    expect(stripBidi(result)).toBe(input);
    expect(stripBidi(result).startsWith("ا")).toBe(false);
    expect(result).not.toMatch(/ا\d+\)/);
  });

  it("does not double-wrap text that already contains bidi isolates", () => {
    const input = "1) Lachesis —\nمناسبت: بائیں طرف";
    const once = formatForWhatsAppRTL(input);
    const twice = formatForWhatsAppRTL(once);
    expect(twice).toBe(once);
    expect((once.match(/\u2066/g) || []).length).toBe(1);
    expect((once.match(/\u2069/g) || []).length).toBe(1);
    expect((once.match(/\u061C/g) || []).length).toBe(1);
    expect(countBidiControls(twice)).toBe(countBidiControls(once));
  });
});
