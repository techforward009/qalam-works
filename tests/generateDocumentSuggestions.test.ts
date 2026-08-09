import { generateDocumentSuggestions } from "../app/tools/document-studio/utils/generateDocumentSuggestions";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function paragraph(text: string): DocNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function docWith(nodes: DocNode[]): DocNode {
  return { type: "doc", content: nodes };
}

describe("generateDocumentSuggestions — Unicode normalization", () => {
  test("suggests Arabic Yeh (ي) → Urdu Yeh (ی) with correct context", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("علي آیا")]));
    const yeh = suggestions.find((s) => s.type === "unicode-arabic-yeh");
    expect(yeh).toBeDefined();
    expect(yeh!.originalText).toContain("ي");
    expect(yeh!.suggestedText).toContain("ی");
    expect(yeh!.suggestedText).not.toContain("ي");
  });

  test("suggests Arabic Kaf (ك) → Urdu Kaf (ک)", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("كتاب")]));
    const kaf = suggestions.find((s) => s.type === "unicode-arabic-kaf");
    expect(kaf).toBeDefined();
    expect(kaf!.suggestedText).toContain("ک");
  });

  test("suggests Arabic Heh (ه) → Urdu Heh/Goal (ہ)", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("چاه")]));
    const heh = suggestions.find((s) => s.type === "unicode-arabic-heh");
    expect(heh).toBeDefined();
    expect(heh!.suggestedText).toContain("ہ");
  });

  test("skips Unicode suggestions inside {{ }} protected classical Arabic content", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("{{قال ابن مسعود: العلم نور}}")]));
    expect(suggestions.filter((s) => s.category === "unicode")).toHaveLength(0);
  });

  test("clean Urdu text (already using Urdu forms) produces no unicode suggestions", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("علی نے کتاب پڑھی")]));
    expect(suggestions.filter((s) => s.category === "unicode")).toHaveLength(0);
  });

  test("caps the number of examples per type for documents with many occurrences", () => {
    const manyYehs = Array(20).fill("علي").join(" ");
    const suggestions = generateDocumentSuggestions(docWith([paragraph(manyYehs)]));
    const yehSuggestions = suggestions.filter((s) => s.type === "unicode-arabic-yeh");
    expect(yehSuggestions.length).toBeLessThanOrEqual(5);
  });
});

describe("generateDocumentSuggestions — Spacing", () => {
  test("suggests removing multiple spaces", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ  ٹھیک ہے")]));
    const spacing = suggestions.find((s) => s.type === "spacing-multiple-spaces");
    expect(spacing).toBeDefined();
    expect(spacing!.suggestedText).not.toMatch(/ {2,}/);
  });

  test("suggests removing space before punctuation", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ ٹھیک ہے ، بالکل")]));
    const spaceBefore = suggestions.find((s) => s.type === "spacing-before-punctuation");
    expect(spaceBefore).toBeDefined();
    expect(spaceBefore!.suggestedText).toContain("ہے،");
  });

  test("clean spacing produces no spacing suggestions", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ ٹھیک ہے، بالکل۔")]));
    expect(suggestions.filter((s) => s.category === "spacing")).toHaveLength(0);
  });
});

describe("generateDocumentSuggestions — Numeral consistency", () => {
  test("suggests consistency when Western and Urdu-Indic numerals are mixed", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("سال 2024 اور ۱۲۳")]));
    const numeral = suggestions.find((s) => s.type === "numeral-mixed");
    expect(numeral).toBeDefined();
  });

  test("a single numeral system produces no numeral suggestion", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("۱۲۳ اور ۴۵۶")]));
    expect(suggestions.filter((s) => s.category === "numeral")).toHaveLength(0);
  });

  test("produces exactly one document-level suggestion, not one per digit", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("2024 ۱۲۳ ١٢٣ 5678 ۹۹۹")]));
    expect(suggestions.filter((s) => s.category === "numeral")).toHaveLength(1);
  });
});

describe("generateDocumentSuggestions — Punctuation consistency", () => {
  test("suggests consistency when both comma styles are used", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ، اور یہ بھی, درست")]));
    expect(suggestions.some((s) => s.type === "punctuation-inconsistent")).toBe(true);
  });

  test("using only one style produces no punctuation suggestion", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ، اور یہ بھی، درست")]));
    expect(suggestions.filter((s) => s.category === "punctuation")).toHaveLength(0);
  });
});

describe("generateDocumentSuggestions — shape and edge cases", () => {
  test("every suggestion has all 5 required fields", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("علي")]));
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(typeof s.type).toBe("string");
      expect(["low", "medium", "high"]).toContain(s.severity);
      expect(typeof s.originalText).toBe("string");
      expect(typeof s.suggestedText).toBe("string");
      expect(typeof s.explanation).toBe("string");
    }
  });

  test("a clean, standard document produces zero suggestions", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ ایک صاف ستھرا جملہ ہے۔")]));
    expect(suggestions).toHaveLength(0);
  });

  test("an empty document produces zero suggestions, not an error", () => {
    expect(generateDocumentSuggestions(docWith([]))).toEqual([]);
  });
});
