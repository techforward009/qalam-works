import { describe, expect, it } from "vitest";
import { tagChromeUrduPdfStream } from "../app/tools/document-studio/utils/pdfLogicalUrduText";

describe("Urdu ActualText PDF postprocessing", () => {
  it("preserves glyph commands and MCIDs while replacing fragmented text metadata", () => {
    const data = [
      "/NonStruct <</MCID 0 >>BDC",
      "BT", "/ReversedChars BMC",
      "/Span<</ActualText ( ) >> BDC", "<0128> Tj", "EMC",
      "<4321> Tj", "EMC", "ET", "EMC",
      "/NonStruct <</MCID 1 >>BDC", "BT", "/ReversedChars BMC",
      "<7842> Tj", "EMC", "ET", "EMC",
    ].join("\n");
    const result = tagChromeUrduPdfStream(data, ["یہ اردو ہے۔", "ایک اور سطر۔"]);
    expect(result).not.toBeNull();
    for (const text of ["<0128> Tj", "<4321> Tj", "<7842> Tj", "/MCID 0", "/MCID 1"]) {
      expect(result).toContain(text);
    }
    expect(result).not.toContain("/ReversedChars");
    expect(result).toContain("/ActualText <FEFF");
    expect((result!.match(/\bBDC\b/g) ?? []).length).toBe((result!.match(/\bEMC\b/g) ?? []).length);
  });
  it("skips unfamiliar, incomplete or reordered Chrome markup", () => {
    expect(tagChromeUrduPdfStream("/Other BMC EMC", ["اردو"])).toBeNull();
    expect(tagChromeUrduPdfStream("/NonStruct <</MCID 0 >>BDC BT", ["اردو"])).toBeNull();
    expect(tagChromeUrduPdfStream("/NonStruct <</MCID 2 >>BDC EMC", ["اردو"])).toBeNull();
    expect(tagChromeUrduPdfStream("/NonStruct <</MCID 0 >>BDC EMC", ["اردو", "دوسرا"])).toBeNull();
  });
  it("allows one trailing, glyph-free Chromium MCID without inventing text", () => {
    const data = [
      "/NonStruct <</MCID 0 >>BDC", "BT", "/ReversedChars BMC", "<4321> Tj", "EMC", "ET", "EMC",
      "/NonStruct <</MCID 1 >>BDC", "BT", "/ReversedChars BMC",
      "/Span<</ActualText <FEFF0646> >> BDC", "EMC", "EMC", "ET", "EMC",
    ].join("\\n");
    const result = tagChromeUrduPdfStream(data, ["یہ متن ہے۔"]);
    expect(result).not.toBeNull();
    expect(result).toContain("<4321> Tj");
    expect(result).toContain("/MCID 1");
    expect((result!.match(/\\bBDC\\b/g) ?? []).length).toBe((result!.match(/\\bEMC\\b/g) ?? []).length);
  });
  it("never skips a glyph-free group before painted content", () => {
    const data = [
      "/NonStruct <</MCID 0 >>BDC", "BT", "ET", "EMC",
      "/NonStruct <</MCID 1 >>BDC", "BT", "<abcd> Tj", "ET", "EMC",
    ].join("\\n");
    expect(tagChromeUrduPdfStream(data, ["یہ متن ہے۔"])).toBeNull();
  });

});
