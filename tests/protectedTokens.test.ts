import { describe, expect, it } from "vitest";
import {
  findProtectedTokens,
  maskProtectedTokens,
  type ProtectedTokenKind,
} from "../app/utils/quality/protectedTokens";
import { analyzeScriptRuns } from "../app/utils/quality/analyzeLanguageRuns";
import { checkTextQuality } from "../app/utils/quality/checkTextQuality";
import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import { buildDocumentHealthReport } from "../app/tools/document-studio/utils/buildDocumentHealthReport";
import { generateDocumentSuggestions } from "../app/tools/document-studio/utils/generateDocumentSuggestions";
import { createDocumentAnalysisContext, type DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function paragraph(text: string): DocNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function docWith(nodes: DocNode[]): DocNode {
  return { type: "doc", content: nodes };
}
function kinds(text: string): ProtectedTokenKind[] {
  return findProtectedTokens(text).map((token) => token.kind);
}
function textsOf(kind: ProtectedTokenKind, source: string): string[] {
  return findProtectedTokens(source).filter((token) => token.kind === kind).map((token) => token.text);
}

describe("LI-2 protected token engine", () => {
  it("protects URLs", () => {
    expect(textsOf("url", "see https://qalamworks.com now")).toEqual(["https://qalamworks.com"]);
    expect(textsOf("url", "visit www.example.com/path")).toEqual(["www.example.com/path"]);
  });

  it("protects emails", () => {
    expect(textsOf("email", "write info@qalamworks.com please")).toEqual(["info@qalamworks.com"]);
  });

  it("protects filenames", () => {
    expect(textsOf("filename", "attach report.docx")).toEqual(["report.docx"]);
  });

  it("protects uppercase acronyms", () => {
    expect(textsOf("acronym", "export HTML CSS API JSON")).toEqual(["HTML", "CSS", "API", "JSON"]);
  });

  it("protects decimals", () => {
    expect(textsOf("decimal", "value 12.5 and 3.14")).toEqual(["12.5", "3.14"]);
  });

  it("protects grouped numbers", () => {
    expect(textsOf("number-group", "cost 1,000 or 1,234,567")).toEqual(["1,000", "1,234,567"]);
  });

  it("protects dates", () => {
    expect(textsOf("date", "on 2026-09-09 or 09/09/2026 or 9/9/26")).toEqual([
      "2026-09-09",
      "09/09/2026",
      "9/9/26",
    ]);
  });

  it("protects times", () => {
    expect(textsOf("time", "at 12:30 PM or 14:45")).toEqual(["12:30 PM", "14:45"]);
  });

  it("protects mentions", () => {
    expect(textsOf("mention", "ping @username today")).toEqual(["@username"]);
  });

  it("protects hashtags", () => {
    expect(textsOf("hashtag", "tag #QalamWorks here")).toEqual(["#QalamWorks"]);
  });

  it("preserves placeholder markers", () => {
    expect(textsOf("placeholder", "quote {{کلاسیکی متن}} here")).toEqual(["{{کلاسیکی متن}}"]);
  });

  it("keeps token offsets aligned with source text", () => {
    const text = "file report.docx ready";
    const token = findProtectedTokens(text).find((item) => item.kind === "filename");
    expect(token).toBeTruthy();
    expect(text.slice(token!.start, token!.end)).toBe(token!.text);
    expect(token!.text).toBe("report.docx");
  });

  it("preserves mask length", () => {
    const text = "info@qalamworks.com and https://qalamworks.com file.pdf";
    const masked = maskProtectedTokens(text);
    expect(masked.length).toBe(text.length);
  });

  it("applies overlap precedence: email/url/filename win over inner pieces", () => {
    const email = findProtectedTokens("mail info@qalamworks.com");
    expect(email).toHaveLength(1);
    expect(email[0].kind).toBe("email");
    const url = findProtectedTokens("open https://example.com/file.pdf");
    expect(url.some((token) => token.kind === "url")).toBe(true);
    expect(url.some((token) => token.kind === "filename")).toBe(false);
    const file = findProtectedTokens("send report.docx");
    expect(file).toHaveLength(1);
    expect(file[0].kind).toBe("filename");
  });
});

describe("LI-2 quality integration", () => {
  it("does not generate mixed-script suggestions for filename/url/email", () => {
    const doc = docWith([
      paragraph("یہ report.docx بھیجیں"),
      paragraph("مزید معلومات https://qalamworks.com پر"),
      paragraph("ای میل info@qalamworks.com ہے"),
    ]);
    const context = createDocumentAnalysisContext(doc, "ur");
    const advisories = generateDocumentSuggestions(doc, context).filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(advisories).toHaveLength(0);
    expect(buildDocumentAuditReport(doc, context).counts.mixedScript).toBe(0);
    expect(analyzeScriptRuns("یہ report.docx بھیجیں").some((run) => run.kind === "protected")).toBe(true);
  });

  it("does not treat protected punctuation as a punctuation issue", () => {
    const text = "رابطہ name@example.com اور https://example.com?a=1,000 پر کریں۔";
    const report = checkTextQuality(text, "ur");
    expect(report.punctuation.mixedPunctuation).toBe(0);
    expect(report.typography.missingSpaceAfterPunctuation).toBe(0);
    const doc = docWith([paragraph(text)]);
    const suggestions = generateDocumentSuggestions(doc, createDocumentAnalysisContext(doc, "ur"));
    expect(suggestions.some((s) => s.type === "spacing-missing-after-punctuation")).toBe(false);
    expect(suggestions.some((s) => s.type === "punctuation-inconsistent")).toBe(false);
  });

  it("does not over-protect genuine Latin phrases", () => {
    const text = "یہ Document Studio بہت مفید ہے";
    expect(kinds(text)).toEqual([]);
    const latin = analyzeScriptRuns(text).filter((run) => run.kind === "latin");
    expect(latin).toHaveLength(1);
    expect(latin[0].text).toBe("Document Studio");
  });

  it("still reports a genuine Urdu spacing issue", () => {
    const doc = docWith([paragraph("ہے،جس")]);
    expect(generateDocumentSuggestions(doc).some((s) => s.type === "spacing-missing-after-punctuation")).toBe(true);
    expect(buildDocumentAuditReport(doc).counts.spacing).toBeGreaterThan(0);
  });

  it("keeps Audit / Health / Suggestions aligned for protected and latin runs", () => {
    const doc = docWith([paragraph("یہ Document Studio کو PDF میں بھیجیں۔")]);
    const context = createDocumentAnalysisContext(doc, "ur");
    const audit = buildDocumentAuditReport(doc, context);
    const health = buildDocumentHealthReport(doc, context);
    const advisories = generateDocumentSuggestions(doc, context).filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(audit.counts.mixedScript).toBe(1);
    expect(health.typographyIssueCount).toBe(1);
    expect(advisories).toHaveLength(1);
    expect(advisories[0].originalText).toBe("Document Studio");
  });
});
