import { describe, expect, it } from "vitest";
import { graphemeBoundaries, paginateMeasuredFlow, reconstructUnit, readingFlowUnits, shouldDisplayBookParagraph, type ReaderFlowUnit } from "../app/lib/knowledge/bookReaderPagination";

describe("measured reader flow pagination", () => {
  it("shows the English translation without separate parallel Arabic paragraphs", () => {
    const paragraphs = [
      { id: "sahifa-en:supplication:1:p1", text: "( 1 ) وَ كَانَ مِنْ دُعَائِهِ عَلَيْهِ السَّلَامُ" },
      { id: "sahifa-en:supplication:1:p2", text: "When he began to supplicate, he would begin with praise of God." },
      { id: "sahifa-en:supplication:1:p3", text: "1. الْحَمْدُ لِلَّهِ" },
      { id: "sahifa-en:supplication:1:p4", text: "1- Praise belongs to God, the First, without a first before Him." },
      { id: "sahifa-en:supplication:1:p5", text: "." },
      { id: "sahifa-en:supplication:1:p6", text: "English notes that mention الله can remain." },
    ];
    const english = {
      language: "en" as const, paragraphs, translations: [],
      recordId: "sahifa-en:supplication:1", sourceId: "sahifa-en", recordOrdinal: 1,
      kind: "supplication", title: "The First Supplication", reference: "Sahifa, Supplication 1",
      translator: null, paragraphCount: paragraphs.length,
      page: 1, pageCount: 1, previousRecordId: null, nextRecordId: null,
      recordSha256: "a".repeat(64), sourceSha256: "b".repeat(64), screenPartOnly: true as const,
    };
    const source = readingFlowUnits(english as Parameters<typeof readingFlowUnits>[0], "original");
    expect(source.map(unit => unit.paragraphId)).toEqual([paragraphs[1].id, paragraphs[3].id, paragraphs[5].id]);
    expect(source.every(unit => /[A-Za-z]/u.test(unit.text))).toBe(true);
    expect(paragraphs).toHaveLength(6); // no mutation of imported R2 source
    expect(paragraphs[0].text).toContain("وَ كَانَ");
    expect(shouldDisplayBookParagraph("ar", paragraphs[0].text)).toBe(true);
    expect(shouldDisplayBookParagraph("ur", "اردو ترجمہ")).toBe(true);
    expect(shouldDisplayBookParagraph("en", paragraphs[2].text)).toBe(false);
    const arabic = { ...english, language: "ar" as const };
    expect(readingFlowUnits(arabic as Parameters<typeof readingFlowUnits>[0], "original")).toHaveLength(6);
  });
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
