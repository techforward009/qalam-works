import { describe, expect, it } from "vitest";
import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import { buildDocumentHealthReport } from "../app/tools/document-studio/utils/buildDocumentHealthReport";
import {
  generateDocumentSuggestions,
  localizedSuggestionExplanation,
} from "../app/tools/document-studio/utils/generateDocumentSuggestions";
import { createDocumentAnalysisContext, type DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function paragraph(text: string): DocNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function docWith(nodes: DocNode[]): DocNode {
  return { type: "doc", content: nodes };
}

const ENGLISH =
  "Draft notes: Review spacing and punctuation, then standardize and run Quality Audit before export.";
const URDU = "یہ ایک صاف ستھرا جملہ ہے۔";
const ARABIC = /[\u0600-\u06FF]/;

describe("mixed-document Quality Audit / Suggestions alignment", () => {
  it("does not flag a full English paragraph inside a mixed document as Latin typography", () => {
    const doc = docWith([paragraph(URDU), paragraph(ENGLISH)]);
    const mixedScript = generateDocumentSuggestions(doc).filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(mixedScript).toHaveLength(0);
    expect(buildDocumentAuditReport(doc).counts.mixedScript).toBe(0);
  });

  it("still detects a genuine Latin intrusion inside an Urdu paragraph", () => {
    const doc = docWith([paragraph("یہ Document Studio ہے")]);
    const context = createDocumentAnalysisContext(doc, "ur");
    const advisories = generateDocumentSuggestions(doc, context).filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(advisories).toHaveLength(1);
    expect(advisories[0].originalText).toBe("Document Studio");
    expect(buildDocumentAuditReport(doc, context).counts.mixedScript).toBe(1);
    expect(buildDocumentHealthReport(doc, context).typographyIssueCount).toBe(1);
  });

  it("keeps punctuation counts consistent across audit and suggestions for bilingual paragraphs", () => {
    const doc = docWith([paragraph("یہ، ایک اردو جملہ ہے۔"), paragraph(ENGLISH)]);
    const audit = buildDocumentAuditReport(doc);
    const punctuationSuggestions = generateDocumentSuggestions(doc).filter((s) => s.category === "punctuation");
    expect(audit.counts.punctuation).toBe(punctuationSuggestions.length);
  });

  it("uses the same typography occurrence semantics for health and suggestions", () => {
    const doc = docWith([paragraph("یہ Document ہے"), paragraph(ENGLISH)]);
    const health = buildDocumentHealthReport(doc);
    const typographySuggestions = generateDocumentSuggestions(doc).filter((s) => s.category === "typography");
    expect(health.typographyIssueCount).toBe(buildDocumentAuditReport(doc).counts.mixedScript);
    expect(typographySuggestions.length).toBeGreaterThan(0);
    expect(typographySuggestions.length).toBeLessThanOrEqual(health.typographyIssueCount);
    expect(typographySuggestions.every((s) => s.type !== "unicode-mixed-script-advisory" || s.originalText !== "Draft")).toBe(
      true,
    );
  });

  it("does not reduce score for an English paragraph in a mixed document", () => {
    const urduOnly = buildDocumentAuditReport(docWith([paragraph(URDU)]));
    const mixed = buildDocumentAuditReport(docWith([paragraph(URDU), paragraph(ENGLISH)]));
    expect(mixed.score).toBe(urduOnly.score);
    expect(mixed.counts.mixedScript).toBe(0);
  });

  it("still reports a genuine missing space after Urdu punctuation", () => {
    const doc = docWith([paragraph("ہے،جس")]);
    expect(generateDocumentSuggestions(doc).some((s) => s.type === "spacing-missing-after-punctuation")).toBe(true);
    expect(buildDocumentAuditReport(doc).counts.spacing).toBeGreaterThan(0);
  });
});

describe("same processing language reaches Audit / Health / Suggestions", () => {
  it("uses one context language for mixed-script counts", () => {
    const doc = docWith([paragraph("یہ Document ہے")]);
    const auto = createDocumentAnalysisContext(doc, "auto");
    const ur = createDocumentAnalysisContext(doc, "ur");

    const autoAudit = buildDocumentAuditReport(doc, auto);
    const autoHealth = buildDocumentHealthReport(doc, auto);
    const autoSuggestions = generateDocumentSuggestions(doc, auto).filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(autoAudit.counts.mixedScript).toBe(0);
    expect(autoHealth.typographyIssueCount).toBe(0);
    expect(autoSuggestions).toHaveLength(0);

    const urAudit = buildDocumentAuditReport(doc, ur);
    const urHealth = buildDocumentHealthReport(doc, ur);
    const urSuggestions = generateDocumentSuggestions(doc, ur).filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(urAudit.counts.mixedScript).toBeGreaterThan(0);
    expect(urHealth.typographyIssueCount).toBe(urAudit.counts.mixedScript);
    expect(urSuggestions.length).toBeGreaterThan(0);
    expect(urSuggestions.length).toBeLessThanOrEqual(urAudit.counts.mixedScript);
  });

  it("Audit / Health / Suggestions share the same run-analysis mixed-script count", () => {
    const doc = docWith([paragraph("یہ Document Studio اور Qalam Works مفید ہیں")]);
    const context = createDocumentAnalysisContext(doc, "ur");
    const audit = buildDocumentAuditReport(doc, context);
    const health = buildDocumentHealthReport(doc, context);
    const advisories = generateDocumentSuggestions(doc, context).filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(audit.counts.mixedScript).toBe(2);
    expect(health.typographyIssueCount).toBe(2);
    expect(advisories.map((s) => s.originalText)).toEqual(["Document Studio", "Qalam Works"]);
    expect(context.runAnalysis.paragraphs).toHaveLength(1);
  });
});

describe("protected technical Latin tokens", () => {
  it("does not flag TXT / DOCX / PDF as mixed-script", () => {
    const doc = docWith([paragraph("فائل TXT، DOCX اور PDF میں محفوظ کریں۔")]);
    const context = createDocumentAnalysisContext(doc, "ur");
    expect(buildDocumentAuditReport(doc, context).counts.mixedScript).toBe(0);
    expect(
      generateDocumentSuggestions(doc, context).filter((s) => s.type === "unicode-mixed-script-advisory"),
    ).toHaveLength(0);
  });

  it("does not lower score for protected acronyms", () => {
    const clean = buildDocumentAuditReport(docWith([paragraph(URDU)]), createDocumentAnalysisContext(docWith([paragraph(URDU)]), "ur"));
    const withAcronyms = buildDocumentAuditReport(
      docWith([paragraph("فائل TXT DOCX PDF میں محفوظ کریں۔")]),
      createDocumentAnalysisContext(docWith([paragraph("فائل TXT DOCX PDF میں محفوظ کریں۔")]), "ur"),
    );
    expect(withAcronyms.score).toBe(clean.score);
  });

  it("still detects a genuine unexpected Latin run beside protected tokens", () => {
    const doc = docWith([paragraph("یہ Document کو PDF میں محفوظ کریں۔")]);
    const context = createDocumentAnalysisContext(doc, "ur");
    const advisories = generateDocumentSuggestions(doc, context).filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(advisories.some((s) => s.originalText === "Document")).toBe(true);
    expect(advisories.some((s) => s.originalText === "PDF")).toBe(false);
    expect(buildDocumentAuditReport(doc, context).counts.mixedScript).toBeGreaterThan(0);
  });
});

describe("suggestion explanation localization", () => {
  it("uses English-only explanation chrome in ENG", () => {
    const doc = docWith([paragraph("یہ Document ہے")]);
    const suggestion = generateDocumentSuggestions(doc, createDocumentAnalysisContext(doc, "ur")).find(
      (s) => s.type === "unicode-mixed-script-advisory",
    );
    expect(suggestion).toBeTruthy();
    const text = localizedSuggestionExplanation(suggestion!, false);
    expect(text).not.toMatch(ARABIC);
    expect(text).toMatch(/Latin/i);
  });

  it("uses Urdu-only explanation chrome in Urdu", () => {
    const doc = docWith([paragraph("یہ Document ہے")]);
    const suggestion = generateDocumentSuggestions(doc, createDocumentAnalysisContext(doc, "ur")).find(
      (s) => s.type === "unicode-mixed-script-advisory",
    );
    expect(suggestion).toBeTruthy();
    const text = localizedSuggestionExplanation(suggestion!, true);
    expect(text).toMatch(ARABIC);
    expect(text).not.toMatch(/[A-Za-z]/);
  });
});
