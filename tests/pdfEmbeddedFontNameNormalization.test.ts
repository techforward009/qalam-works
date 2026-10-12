import { describe, expect, it } from "vitest";
import { normalizeEmbeddedPdfFontFamily as normalized } from "../app/tools/document-studio/utils/pdfEmbeddedFonts";
describe("PDF name escapes", () => {
  it("recognizes the real subset font names while retaining embedding verification", () => {
    expect(normalized("AAAAAA+Alvi#E5#BC#A0Nastaleeq")).toBe("alvinastaleeq");
    expect(normalized("AAAAAA+Jameel#E5#BC#A0Noori#E5#BC#A0Nastaleeq")).toBe("jameelnoorinastaleeq");
    expect(normalized("AAAAAA+Gulzar-Regular")).toBe("gulzarregular");
    expect(normalized("AAAAAA+NotoNastaliqUrdu-Regular")).toBe("notonastaliqurduregular");
  });
});
