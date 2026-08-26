import { describe, it, expect } from "vitest";
import {
  formatForWhatsAppRTL,
  countBidiControls,
  BIDI,
} from "../app/utils/whatsappRtlFormatter";

const { RLM, LRI, PDI, RLI, LRM } = BIDI;

const BIDI_RE = /[\u200E\u200F\u2066\u2067\u2069\u061C]/;

describe("formatForWhatsAppRTL — plain text + list normalization", () => {
  it("returns empty string for empty input", () => {
    expect(formatForWhatsAppRTL("")).toBe("");
  });

  it("returns whitespace-only input unchanged", () => {
    expect(formatForWhatsAppRTL("   \n  \t")).toBe("   \n  \t");
  });

  it("leaves pure Urdu unchanged and inserts no bidi", () => {
    const urdu = "یہ ایک سادہ اردو جملہ ہے۔";
    const result = formatForWhatsAppRTL(urdu);
    expect(result).toBe(urdu);
    expect(BIDI_RE.test(result)).toBe(false);
  });

  it("leaves pure English unchanged", () => {
    expect(formatForWhatsAppRTL("Hello world.")).toBe("Hello world.");
  });

  it("leaves mixed Urdu + English unchanged", () => {
    const mixed = "یہ Qalam Works کا ٹول ہے۔";
    expect(formatForWhatsAppRTL(mixed)).toBe(mixed);
    expect(BIDI_RE.test(formatForWhatsAppRTL(mixed))).toBe(false);
  });

  it("leaves URLs unchanged", () => {
    const text = "سائٹ https://qalamworks.com دیکھیں";
    expect(formatForWhatsAppRTL(text)).toBe(text);
  });

  it("leaves emails unchanged", () => {
    const text = "ای میل qalamworks.services@gmail.com پر بھیجیں";
    expect(formatForWhatsAppRTL(text)).toBe(text);
  });

  it("leaves numbers inside Urdu unchanged", () => {
    const text = "قیمت 1500 روپے ہے";
    expect(formatForWhatsAppRTL(text)).toBe(text);
  });

  it("converts leading numbered markers 1. → 1)", () => {
    const input = "1. پہلا نکتہ\n2. دوسرا نکتہ\n3. تیسرا نکتہ";
    const expected = "1) پہلا نکتہ\n2) دوسرا نکتہ\n3) تیسرا نکتہ";
    expect(formatForWhatsAppRTL(input)).toBe(expected);
  });

  it("leaves already-paren numbered markers unchanged", () => {
    const input = "1) پہلا نکتہ\n2) دوسرا نکتہ";
    expect(formatForWhatsAppRTL(input)).toBe(input);
  });

  it("converts bullet • to ◆", () => {
    const input = "• پہلا بلٹ\n• دوسرا بلٹ";
    expect(formatForWhatsAppRTL(input)).toBe("◆ پہلا بلٹ\n◆ دوسرا بلٹ");
  });

  it("converts bullet ▪ to ◆", () => {
    const input = "▪ پہلا بلٹ\n▪ دوسرا بلٹ";
    expect(formatForWhatsAppRTL(input)).toBe("◆ پہلا بلٹ\n◆ دوسرا بلٹ");
  });

  it("converts existing - bullets to ◆", () => {
    const input = "◆ پہلا بلٹ\n- دوسرا بلٹ";
    expect(formatForWhatsAppRTL(input)).toBe("◆ پہلا بلٹ\n◆ دوسرا بلٹ");
  });

  it("does not alter * as a non-bullet mid-line character", () => {
    const text = "نوٹ * اہم";
    expect(formatForWhatsAppRTL(text)).toBe(text);
  });

  it("does not convert decimal numbers mid-line", () => {
    const text = "ورژن 3.14 جاری ہے";
    expect(formatForWhatsAppRTL(text)).toBe(text);
  });

  it("does not convert year ranges mid-line", () => {
    const text = "سال 2025-26";
    expect(formatForWhatsAppRTL(text)).toBe(text);
  });

  it("strips leftover bidi controls from input", () => {
    const withBidi = RLM + "یہ جملہ ہے" + LRI + "PDF" + PDI + RLM;
    const result = formatForWhatsAppRTL(withBidi);
    expect(result).toBe("یہ جملہ ہےPDF");
    expect(BIDI_RE.test(result)).toBe(false);
  });

  it("is idempotent for list-normalized output", () => {
    const input = "1. پہلا\n• دوسرا\nیہ Qalam Works ہے۔";
    const once = formatForWhatsAppRTL(input);
    const twice = formatForWhatsAppRTL(once);
    expect(twice).toBe(once);
  });

  it("preserves blank lines and exact line breaks", () => {
    const input = "1. پہلا\n\n• بلٹ\n\nآخری سطر";
    const expected = "1) پہلا\n\n◆ بلٹ\n\nآخری سطر";
    expect(formatForWhatsAppRTL(input)).toBe(expected);
  });

  it("handles combined sample without inserting bidi", () => {
    const input = `1. پہلا نکتہ
• پہلا بلٹ
یہ Qalam Works کا ٹول ہے۔`;
    const expected = `1) پہلا نکتہ
◆ پہلا بلٹ
یہ Qalam Works کا ٹول ہے۔`;
    const result = formatForWhatsAppRTL(input);
    expect(result).toBe(expected);
    expect(countBidiControls(result)).toBe(0);
  });

  it("countBidiControls reports zero on formatter output", () => {
    const result = formatForWhatsAppRTL(
      "1. item\n• bullet\nاردو متن with English",
    );
    expect(countBidiControls(result)).toBe(0);
  });
});
