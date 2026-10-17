import { describe, expect, it } from "vitest";
import { graphemeBoundaries, paginateMeasuredFlow, reconstructUnit, type ReaderFlowUnit } from "../app/lib/knowledge/bookReaderPagination";

describe("measured reader flow pagination", () => {
  it("keeps Arabic combining marks in graphemes and reconstructs exact source text", async () => {
    const longArabic = ("وَقَالَ أَمِيرُ الْمُؤْمِنِينَ عَلَيْهِ السَّلَامُ: إِنَّ الصَّبْرَ مِفْتَاحُ الْفَرَجِ۔ ").repeat(34);
    const longUrdu = ("یہ ایک مصنوعی طویل اردو آزمائشی عبارت ہے، جس میں اصل متن کے الفاظ، وقفے، اور سطری تسلسل برقرار رہتے ہیں۔ ").repeat(42);
    const units: ReaderFlowUnit[] = [
      { key: "arabic:p1", paragraphId: "fixture:record:p1", kind: "original", language: "ar", text: longArabic },
      { key: "urdu:p1", paragraphId: "fixture:record:p1", kind: "translation", language: "ur", translator: "Synthetic test fixture", source: "Not a verified translation", text: longUrdu },
    ];
    const pages = await paginateMeasuredFlow(units, fragments => fragments.reduce((size, f) => size + f.text.length, 0) < 920);
    expect(pages.length).toBeGreaterThanOrEqual(3);
    for (const unit of units) {
      const pieces = pages.flat().filter(f => f.key === unit.key).sort((a, b) => a.startOffset - b.startOffset);
      expect(pieces[0].startOffset).toBe(0);
      expect(pieces.at(-1)?.endOffset).toBe(unit.text.length);
      expect(pieces.every((piece, i) => i === 0 || pieces[i - 1].endOffset === piece.startOffset)).toBe(true);
      expect(reconstructUnit(pages.flat(), unit.key)).toBe(unit.text);
      expect(pieces.every(piece => unit.text.slice(piece.startOffset, piece.endOffset) === piece.text)).toBe(true);
    }
    const boundaries = graphemeBoundaries(longArabic);
    expect(pages.flat().filter(f => f.key === "arabic:p1").every(f => boundaries.includes(f.startOffset) && boundaries.includes(f.endOffset))).toBe(true);
    expect(longArabic).toContain("لْ");
    expect(longUrdu).toContain(" ");
  });
});
