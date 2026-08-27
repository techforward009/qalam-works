import { describe, it, expect } from "vitest";
import {
  formatForWhatsAppRTL,
  countBidiControls,
  BIDI,
} from "../app/utils/whatsappRtlFormatter";

const { RLM } = BIDI;
const BODY_BIDI_RE = /[\u200E\u2066\u2067\u2069\u061C]/;

function stripFinal(s: string): string {
  return s.replace(/(?:\r?\n)\u200F\s*$/g, "");
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

  it("leaves mixed Urdu + English body unchanged", () => {
    const mixed = "یہ Qalam Works کا ٹول ہے۔";
    expect(stripFinal(formatForWhatsAppRTL(mixed))).toBe(mixed);
  });

  it("leaves URLs unchanged", () => {
    const text = "سائٹ https://qalamworks.com دیکھیں";
    expect(stripFinal(formatForWhatsAppRTL(text))).toBe(text);
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

  it("does not inject body RLI/LRI/PDI/LRM", () => {
    const result = formatForWhatsAppRTL("• بلٹ\nیہ PDF ہے\nhttps://x.com");
    expect(BODY_BIDI_RE.test(result)).toBe(false);
  });

  it("is idempotent after stripping final stabilizer", () => {
    const input = "1. پہلا\n• دوسرا\nیہ ٹول ہے۔";
    const once = stripFinal(formatForWhatsAppRTL(input));
    const twice = stripFinal(formatForWhatsAppRTL(once));
    expect(twice).toBe(once);
  });
});
