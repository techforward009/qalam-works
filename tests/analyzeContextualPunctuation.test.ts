import { describe, expect, it } from "vitest";
import { analyzeDocumentRuns } from "../app/utils/quality/analyzeLanguageRuns";
import { analyzeContextualPunctuation } from "../app/utils/quality/analyzeContextualPunctuation";
import { checkTextQuality } from "../app/utils/quality/checkTextQuality";
import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import { generateDocumentSuggestions, localizedSuggestionExplanation } from "../app/tools/document-studio/utils/generateDocumentSuggestions";
import { createDocumentAnalysisContext, type DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function paragraph(text: string): DocNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function docWith(nodes: DocNode[]): DocNode {
  return { type: "doc", content: nodes };
}
function issues(text: string, mode: "auto" | "ur" | "en" | "ar" = "ur") {
  return analyzeContextualPunctuation(analyzeDocumentRuns([text]), mode).issues;
}

describe("LI-3 context-aware punctuation", () => {
  it("suggests Urdu comma in Arabic-script context", () => {
    const found = issues("یہ درست ہے, لیکن مکمل نہیں۔");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ originalText: ",", suggestedText: "،", type: "comma-style" });
  });

  it("suggests Urdu semicolon in Arabic-script context", () => {
    const found = issues("یہ پہلی بات ہے; دوسری بات یہ ہے۔");
    expect(found.map((item) => item.suggestedText)).toEqual(["؛"]);
  });

  it("suggests Urdu question mark in Arabic-script context", () => {
    const found = issues("کیا یہ درست ہے?");
    expect(found.map((item) => item.suggestedText)).toEqual(["؟"]);
  });

  it("suggests Urdu sentence-ending period in Arabic-script context", () => {
    const found = issues("یہ کام مکمل ہوگیا.");
    expect(found.map((item) => item.suggestedText)).toEqual(["۔"]);
  });

  it("leaves English sentence punctuation unchanged", () => {
    expect(issues("Document Studio is ready.", "ur")).toEqual([]);
    expect(issues("Are you ready?", "ur")).toEqual([]);
  });

  it("does not blindly convert English-clause punctuation in mixed text", () => {
    expect(issues("یہ feature is useful, but ابھی مکمل نہیں۔")).toEqual([]);
    expect(issues("یہ Document Studio useful, but incomplete ہے۔")).toEqual([]);
  });

  it("still detects clear Urdu punctuation inside a mixed paragraph", () => {
    const found = issues("اس نے کہا, یہ درست ہے۔");
    expect(found).toHaveLength(1);
    expect(found[0].originalText).toBe(",");
  });

  it("protects URL, email, filename, decimal, grouped-number, and code punctuation", () => {
    expect(issues("مزید https://example.com?a=1,000 پر")).toEqual([]);
    expect(issues("ای میل info@example.com ہے")).toEqual([]);
    expect(issues("فائل report.docx بھیجیں")).toEqual([]);
    expect(issues("قیمت 3.14 ہے")).toEqual([]);
    expect(issues("رقم 1,000 ہے")).toEqual([]);
    expect(issues("کیا `const x = 1;` درست ہے")).toEqual([]);
    expect(issues("Version 2.5 بہت بہتر ہے۔")).toEqual([]);
  });

  it("does not convert acronym/technical separators", () => {
    expect(issues("PDF; DOCX; TXT")).toEqual([]);
  });

  it("keeps original offsets aligned with source text", () => {
    const text = "یہ درست ہے, لیکن";
    const found = issues(text);
    expect(found).toHaveLength(1);
    expect(text.slice(found[0].start, found[0].end)).toBe(found[0].originalText);
    expect(found[0].originalText).toBe(",");
  });

  it("keeps Audit and Suggestions on the same contextual punctuation occurrences", () => {
    const doc = docWith([paragraph("یہ درست ہے, لیکن مکمل نہیں۔")]);
    const context = createDocumentAnalysisContext(doc, "ur");
    const audit = buildDocumentAuditReport(doc, context);
    const contextual = generateDocumentSuggestions(doc, context).filter((s) =>
      s.type.startsWith("punctuation-") && s.type.endsWith("-style"),
    );
    expect(context.punctuationAnalysis.issues).toHaveLength(1);
    expect(checkTextQuality(context.joinedText, "ur").punctuation.mixedPunctuation).toBe(1);
    expect(contextual).toHaveLength(1);
    expect(contextual[0].originalText).toBe(",");
    expect(audit.counts.punctuation).toBeGreaterThanOrEqual(contextual.length);
  });

  it("is conservative in Auto and does not Urdu-normalize explicit English", () => {
    expect(issues("This is ready.", "auto")).toEqual([]);
    expect(issues("یہ درست ہے, لیکن", "en")).toEqual([]);
  });

  it("explicit Urdu still preserves protected and clear English technical spans", () => {
    expect(issues("Email: info@example.com", "ur")).toEqual([]);
    expect(issues("Use Node.js later", "ur")).toEqual([]);
    expect(issues("API response: success; پھر اگلا مرحلہ شروع ہوا۔", "ur")).toEqual([]);
  });

  it("still reports the existing Urdu spacing issue", () => {
    const doc = docWith([paragraph("ہے،جس")]);
    expect(generateDocumentSuggestions(doc).some((s) => s.type === "spacing-missing-after-punctuation")).toBe(true);
    expect(buildDocumentAuditReport(doc).counts.spacing).toBeGreaterThan(0);
  });

  it("localizes contextual punctuation explanations by site language", () => {
    const suggestion = {
      type: "punctuation-comma-style",
      category: "punctuation" as const,
      severity: "medium" as const,
      originalText: ",",
      suggestedText: "،",
      explanation: "اس اردو متن کے سیاق میں اردو رموزِ اوقاف استعمال کریں۔",
      contextBefore: "ہے",
      contextAfter: " لیکن",
    };
    expect(localizedSuggestionExplanation(suggestion, false)).toBe("Use Urdu punctuation in this Urdu text context.");
    expect(localizedSuggestionExplanation(suggestion, true)).toBe("اس اردو متن کے سیاق میں اردو رموزِ اوقاف استعمال کریں۔");
    expect(localizedSuggestionExplanation(suggestion, false)).not.toMatch(/[\u0600-\u06FF]/);
  });
});
