import { buildDocumentStats } from "../app/tools/document-studio/utils/buildDocumentStats";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function paragraph(text: string): DocNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function docWith(nodes: DocNode[]): DocNode {
  return { type: "doc", content: nodes };
}

describe("buildDocumentStats — word/character/paragraph counts", () => {
  test("counts words using the same convention as Document Cleaner (trim + split on whitespace)", () => {
    const stats = buildDocumentStats(docWith([paragraph("یہ پانچ الفاظ کا جملہ ہے")]));
    expect(stats.wordCount).toBe(6);
  });

  test("character count matches the raw joined text length", () => {
    const stats = buildDocumentStats(docWith([paragraph("abc")]));
    expect(stats.characterCount).toBe(3);
  });

  test("counts only non-empty paragraphs", () => {
    const stats = buildDocumentStats(docWith([paragraph("پہلا"), paragraph(""), paragraph("دوسرا")]));
    expect(stats.paragraphCount).toBe(2);
  });

  test("an empty document reports all zeros, not an error", () => {
    const stats = buildDocumentStats(docWith([]));
    expect(stats.wordCount).toBe(0);
    expect(stats.characterCount).toBe(0);
    expect(stats.paragraphCount).toBe(0);
  });

  test("headings are counted the same as paragraphs (getBlockTexts includes both)", () => {
    const stats = buildDocumentStats(
      docWith([{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "عنوان" }] }, paragraph("متن")])
    );
    expect(stats.paragraphCount).toBe(2);
  });
});

describe("buildDocumentStats — Numeral Intelligence", () => {
  test("detects Western digits (0-9)", () => {
    const stats = buildDocumentStats(docWith([paragraph("سال 2024")]));
    expect(stats.numerals.western).toBe(4);
    expect(stats.numerals.arabicIndic).toBe(0);
    expect(stats.numerals.urduIndic).toBe(0);
  });

  test("detects Urdu-Indic digits (۰-۹) separately from Arabic-Indic (٠-٩)", () => {
    const stats = buildDocumentStats(docWith([paragraph("۱۲۳ اور ١٢٣")]));
    expect(stats.numerals.urduIndic).toBe(3);
    expect(stats.numerals.arabicIndic).toBe(3);
  });

  test("flags isMixed when more than one numeral system is present", () => {
    const stats = buildDocumentStats(docWith([paragraph("2024 اور ۱۲۳")]));
    expect(stats.numerals.isMixed).toBe(true);
  });

  test("does not flag isMixed when only one numeral system is used", () => {
    const stats = buildDocumentStats(docWith([paragraph("۱۲۳ اور ۴۵۶")]));
    expect(stats.numerals.isMixed).toBe(false);
  });

  test("a document with no digits at all reports zero everywhere, not mixed", () => {
    const stats = buildDocumentStats(docWith([paragraph("کوئی ہندسہ نہیں")]));
    expect(stats.numerals).toEqual({ western: 0, arabicIndic: 0, urduIndic: 0, isMixed: false });
  });
});

describe("buildDocumentStats — Language Intelligence", () => {
  test("pure Urdu/Arabic-script text is 100% arabic-script, dominant", () => {
    const stats = buildDocumentStats(docWith([paragraph("یہ ایک اردو جملہ ہے۔")]));
    expect(stats.language.latinChars).toBe(0);
    expect(stats.language.arabicScriptPercent).toBe(100);
    expect(stats.language.dominant).toBe("arabic-script");
  });

  test("pure English text is 100% latin, dominant", () => {
    const stats = buildDocumentStats(docWith([paragraph("This is a plain English sentence.")]));
    expect(stats.language.arabicScriptChars).toBe(0);
    expect(stats.language.latinPercent).toBe(100);
    expect(stats.language.dominant).toBe("latin");
  });

  test("a genuinely mixed document is classified as 'mixed', not forced to one side", () => {
    const stats = buildDocumentStats(docWith([paragraph("یہ Document Studio ہے۔")]));
    expect(stats.language.arabicScriptChars).toBeGreaterThan(0);
    expect(stats.language.latinChars).toBeGreaterThan(0);
    expect(stats.language.dominant).toBe("mixed");
  });

  test("percentages always add up to 100 when there is any letter content", () => {
    const stats = buildDocumentStats(docWith([paragraph("یہ Test ہے۔")]));
    expect(stats.language.arabicScriptPercent + stats.language.latinPercent).toBe(100);
  });

  test("a document with no letters at all (only digits/punctuation) reports dominant 'none'", () => {
    const stats = buildDocumentStats(docWith([paragraph("123 456!")]));
    expect(stats.language.dominant).toBe("none");
  });
});
