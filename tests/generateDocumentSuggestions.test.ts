import { generateDocumentSuggestions } from "../app/tools/document-studio/utils/generateDocumentSuggestions";
import { applySuggestionToText } from "../app/tools/document-studio/utils/suggestionReview";
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
    expect(spaceBefore!.contextBefore).toContain("ہے");
    expect(spaceBefore!.suggestedText).toBe("،");
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

describe("generateDocumentSuggestions — Context Display", () => {
  test("Unicode suggestions have surrounding contextBefore/contextAfter separate from the exact match", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("ابتداء علي انتہا")]));
    const yeh = suggestions.find((s) => s.type === "unicode-arabic-yeh");
    expect(yeh!.originalText).toBe("ي");
    expect(yeh!.contextBefore).toContain("ابتداء");
    expect(yeh!.contextAfter).toContain("انتہا");
  });

  test("document-level suggestions (numeral/punctuation) have empty context (no single position)", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("2024 اور ۱۲۳")]));
    const numeral = suggestions.find((s) => s.type === "numeral-mixed");
    expect(numeral!.contextBefore).toBe("");
    expect(numeral!.contextAfter).toBe("");
  });
});

describe("generateDocumentSuggestions — Typography category (tatweel)", () => {
  test("flags tatweel characters under the 'typography' category", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("الحمـــد لله")]));
    const tatweel = suggestions.filter((s) => s.category === "typography");
    expect(tatweel.length).toBeGreaterThan(0);
    expect(tatweel[0].originalText).toBe("\u0640");
  });

  test("clean text has no typography suggestions", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("الحمد لله")]));
    expect(suggestions.filter((s) => s.category === "typography")).toHaveLength(0);
  });
});

describe("generateDocumentSuggestions — Structure category", () => {
  test("flags a heading-hierarchy problem under 'structure'", () => {
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Section" }] }],
    };
    const suggestions = generateDocumentSuggestions(doc);
    expect(suggestions.some((s) => s.type === "structure-heading-hierarchy")).toBe(true);
  });

  test("flags empty paragraphs under 'structure'", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Real" }] },
        { type: "paragraph", content: [] },
      ],
    };
    const suggestions = generateDocumentSuggestions(doc);
    expect(suggestions.some((s) => s.type === "structure-empty-paragraphs")).toBe(true);
  });

  test("a well-structured document has no structure suggestions", () => {
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] }, paragraph("Body")],
    };
    const suggestions = generateDocumentSuggestions(doc);
    expect(suggestions.filter((s) => s.category === "structure")).toHaveLength(0);
  });
});

// Batch 1 (2026-08-09): Quote Correction, Duplicated Punctuation, Missing Space
describe("generateDocumentSuggestions — Quote Correction", () => {
  test("suggests curly opening quote for a straight quote preceded by whitespace", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph('he said "hello')]));
    const quote = suggestions.find((s) => s.type === "punctuation-straight-quote");
    expect(quote).toBeDefined();
    expect(quote!.suggestedText).toBe("\u201C");
  });

  test("suggests curly closing quote for a straight quote preceded by a letter", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph('hello" said he')]));
    const quote = suggestions.find((s) => s.type === "punctuation-straight-quote");
    expect(quote).toBeDefined();
    expect(quote!.suggestedText).toBe("\u201D");
  });

  test("flags unmatched curly quotes as one document-level advisory", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("\u201Chello world")]));
    expect(suggestions.some((s) => s.type === "punctuation-unmatched-quotes")).toBe(true);
  });

  test("balanced curly quotes produce no unmatched-quote advisory", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("\u201Chello\u201D world")]));
    expect(suggestions.some((s) => s.type === "punctuation-unmatched-quotes")).toBe(false);
  });

  test("never auto-applies — suggestedText is only ever a proposal, category is 'punctuation'", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph('"test"')]));
    const quotes = suggestions.filter((s) => s.type === "punctuation-straight-quote");
    expect(quotes.length).toBeGreaterThan(0);
    quotes.forEach((q) => expect(q.category).toBe("punctuation"));
  });
});

describe("generateDocumentSuggestions — Duplicated Punctuation", () => {
  test("flags ؟؟ and suggests a single ؟", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("کیا یہ ٹھیک ہے؟؟")]));
    const dup = suggestions.find((s) => s.type === "punctuation-duplicated");
    expect(dup).toBeDefined();
    expect(dup!.originalText).toBe("؟؟");
    expect(dup!.suggestedText).toBe("؟");
  });

  test("flags !! and ,, too", () => {
    const suggestionsExcl = generateDocumentSuggestions(docWith([paragraph("Wow!!")]));
    expect(suggestionsExcl.some((s) => s.type === "punctuation-duplicated" && s.originalText === "!!")).toBe(true);

    const suggestionsComma = generateDocumentSuggestions(docWith([paragraph("یہ،، وہ")]));
    expect(suggestionsComma.some((s) => s.type === "punctuation-duplicated" && s.originalText === "،،")).toBe(true);
  });

  test("single punctuation marks are not flagged", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("کیا یہ ٹھیک ہے؟")]));
    expect(suggestions.filter((s) => s.type === "punctuation-duplicated")).toHaveLength(0);
  });
});

describe("generateDocumentSuggestions — Missing Space After Punctuation", () => {
  test("flags word,next and suggests inserting a space", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ لفظ,اگلا لفظ")]));
    const spacing = suggestions.find((s) => s.type === "spacing-missing-after-punctuation");
    expect(spacing).toBeDefined();
    expect(spacing!.suggestedText).toContain(", ");
  });

  test("flags word؟next (Urdu question mark)", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("کیا یہ؟نہیں")]));
    expect(suggestions.some((s) => s.type === "spacing-missing-after-punctuation")).toBe(true);
  });

  test("flags word!next", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("واہ!زبردست")]));
    expect(suggestions.some((s) => s.type === "spacing-missing-after-punctuation")).toBe(true);
  });

  test("properly spaced punctuation is not flagged", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ لفظ, اگلا لفظ")]));
    expect(suggestions.filter((s) => s.type === "spacing-missing-after-punctuation")).toHaveLength(0);
  });
});

// Batch 2 (2026-08-09): Repeated Words, Mixed Script Advisory, Structure improvements
describe("generateDocumentSuggestions — Repeated Words Detection", () => {
  test("flags an accidental repeated Urdu word", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ یہ ایک غلطی ہے")]));
    const rep = suggestions.find((s) => s.type === "typography-repeated-word");
    expect(rep).toBeDefined();
    expect(rep!.originalText).toBe("یہ یہ");
    expect(rep!.suggestedText).toBe("یہ");
  });

  test("flags an accidental repeated English word", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("this is is a mistake")]));
    expect(suggestions.some((s) => s.type === "typography-repeated-word" && s.originalText === "is is")).toBe(true);
  });

  test("does not flag two different adjacent words", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ ایک اچھا دن ہے")]));
    expect(suggestions.filter((s) => s.type === "typography-repeated-word")).toHaveLength(0);
  });

  test("ignores repetition inside {{ }} protected quotations (may be intentional rhetorical repetition)", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("{{اللہ اللہ کرتے رہو}}")]));
    expect(suggestions.filter((s) => s.type === "typography-repeated-word")).toHaveLength(0);
  });
});

describe("generateDocumentSuggestions — Mixed Script Intelligence (advisory only)", () => {
  test("flags Latin text inside RTL prose as an advisory", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ Document Studio ہے")]));
    const advisories = suggestions.filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(advisories.length).toBeGreaterThan(0);
  });

  test("never proposes a text change — suggestedText always equals originalText", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ Document Studio ہے")]));
    const advisories = suggestions.filter((s) => s.type === "unicode-mixed-script-advisory");
    advisories.forEach((a) => expect(a.suggestedText).toBe(a.originalText));
  });

  test("applying this advisory is a genuine no-op on the text", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ Document ہے")]));
    const advisory = suggestions.find((s) => s.type === "unicode-mixed-script-advisory");
    expect(advisory).toBeDefined();
    expect(applySuggestionToText("یہ Document ہے", advisory!)).toBe("یہ Document ہے");
  });

  test("pure Urdu text with no Latin characters produces no advisory", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ ایک سادہ جملہ ہے")]));
    expect(suggestions.filter((s) => s.type === "unicode-mixed-script-advisory")).toHaveLength(0);
  });
});

describe("generateDocumentSuggestions — Structure: long paragraphs", () => {
  test("flags a paragraph over the length threshold", () => {
    const longText = "یہ ایک بہت طویل پیراگراف ہے۔ ".repeat(20);
    const suggestions = generateDocumentSuggestions(docWith([paragraph(longText)]));
    expect(suggestions.some((s) => s.type === "structure-long-paragraphs")).toBe(true);
  });

  test("a normal-length paragraph is not flagged", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ ایک مختصر پیراگراف ہے۔")]));
    expect(suggestions.filter((s) => s.type === "structure-long-paragraphs")).toHaveLength(0);
  });
});

// Maintenance Batch (2026-08-09): shared-regex lastIndex safety + thousands-separator fix
describe("generateDocumentSuggestions — shared regex lastIndex safety across consecutive calls", () => {
  test("a document with many matches (triggering the MAX_EXAMPLES_PER_TYPE cap) does not corrupt the next call's results", () => {
    const manySpaces = Array.from({ length: 8 }, (_, i) => `لفظ${i}  اگلا`).join(" ");
    const result1 = generateDocumentSuggestions(docWith([paragraph(manySpaces)]));
    expect(result1.filter((s) => s.type === "spacing-multiple-spaces").length).toBe(5);

    // Immediately after, a completely different, short document — its own
    // real match must still be found (this previously failed with a
    // shared module-level regex due to lastIndex leaking across calls).
    const result2 = generateDocumentSuggestions(docWith([paragraph("یہ  ٹھیک ہے")]));
    expect(result2.filter((s) => s.type === "spacing-multiple-spaces").length).toBe(1);
  });
});

describe("generateDocumentSuggestions — thousands-separator false positive fix", () => {
  test("does not flag 1,000 or 10,000 as missing-space issues", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("قیمت 1,000 اور 10,000 روپے ہے")]));
    expect(suggestions.filter((s) => s.type === "spacing-missing-after-punctuation")).toHaveLength(0);
  });

  test("still flags a genuine missing space after a comma (not preceded by a digit)", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ لفظ,اگلا لفظ")]));
    expect(suggestions.some((s) => s.type === "spacing-missing-after-punctuation")).toBe(true);
  });
});

// Polish Batch (2026-08-09): severity recalibration + category correction
describe("generateDocumentSuggestions — Severity Recalibration", () => {
  test("typography-repeated-word is now 'medium' (was 'low') — an accidental repeated word is a likely writing error", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ یہ ایک غلطی ہے")]));
    const rep = suggestions.find((s) => s.type === "typography-repeated-word");
    expect(rep).toBeDefined();
    expect(rep!.severity).toBe("medium");
  });

  test("severity filtering by 'medium' now includes repeated-word suggestions", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ یہ ایک غلطی ہے")]));
    const mediumOnly = suggestions.filter((s) => s.severity === "medium");
    expect(mediumOnly.some((s) => s.type === "typography-repeated-word")).toBe(true);
  });

  test("severity filtering by 'low' no longer includes repeated-word suggestions", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ یہ ایک غلطی ہے")]));
    const lowOnly = suggestions.filter((s) => s.severity === "low");
    expect(lowOnly.some((s) => s.type === "typography-repeated-word")).toBe(false);
  });
});

describe("generateDocumentSuggestions — Mixed Script Category Correction", () => {
  test("unicode-mixed-script-advisory is now under 'typography' category (was 'unicode')", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ Document Studio ہے")]));
    const advisory = suggestions.find((s) => s.type === "unicode-mixed-script-advisory");
    expect(advisory).toBeDefined();
    expect(advisory!.category).toBe("typography");
  });

  test("filtering by 'unicode' category no longer includes the mixed-script advisory", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("یہ Document Studio ہے")]));
    const unicodeOnly = suggestions.filter((s) => s.category === "unicode");
    expect(unicodeOnly.some((s) => s.type === "unicode-mixed-script-advisory")).toBe(false);
  });

  test("filtering by 'typography' category now includes the mixed-script advisory alongside tatweel/repeated-word", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("الحمـــد Document یہ یہ")]));
    const typographyOnly = suggestions.filter((s) => s.category === "typography");
    const typesFound = new Set(typographyOnly.map((s) => s.type));
    expect(typesFound.has("unicode-mixed-script-advisory")).toBe(true);
  });

  test("genuine unicode-form suggestions (Yeh/Kaf/Heh) remain under 'unicode' category (no regression)", () => {
    const suggestions = generateDocumentSuggestions(docWith([paragraph("علي")]));
    const yeh = suggestions.find((s) => s.type === "unicode-arabic-yeh");
    expect(yeh!.category).toBe("unicode");
  });
});
