import { describe, expect, it } from "vitest";
import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import { buildDocumentHealthReport } from "../app/tools/document-studio/utils/buildDocumentHealthReport";
import { generateDocumentSuggestions } from "../app/tools/document-studio/utils/generateDocumentSuggestions";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function paragraph(text: string): DocNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function docWith(nodes: DocNode[]): DocNode {
  return { type: "doc", content: nodes };
}

const ENGLISH =
  "Draft notes: Review spacing and punctuation, then standardize and run Quality Audit before export.";
const URDU = "یہ ایک صاف ستھرا جملہ ہے۔";

describe("mixed-document Quality Audit / Suggestions alignment", () => {
  it("does not flag a full English paragraph inside a mixed document as Latin typography", () => {
    const doc = docWith([paragraph(URDU), paragraph(ENGLISH)]);
    const mixedScript = generateDocumentSuggestions(doc).filter((s) => s.type === "unicode-mixed-script-advisory");
    expect(mixedScript).toHaveLength(0);
    expect(buildDocumentAuditReport(doc).counts.mixedScript).toBe(0);
  });

  it("still detects a genuine Latin intrusion inside an Urdu paragraph", () => {
    const doc = docWith([paragraph("یہ Document Studio ہے")]);
    expect(generateDocumentSuggestions(doc).some((s) => s.type === "unicode-mixed-script-advisory")).toBe(true);
    expect(buildDocumentAuditReport(doc).counts.mixedScript).toBeGreaterThan(0);
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
