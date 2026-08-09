import { buildDocumentHealthReport } from "../app/tools/document-studio/utils/buildDocumentHealthReport";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function heading(level: number, text: string): DocNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}
function paragraph(text: string): DocNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function docWith(nodes: DocNode[]): DocNode {
  return { type: "doc", content: nodes };
}

describe("buildDocumentHealthReport — clean document", () => {
  test("a well-structured, clean document reports 'ok' across all statuses", () => {
    const report = buildDocumentHealthReport(docWith([heading(1, "عنوان"), paragraph("یہ ایک صاف ستھرا جملہ ہے۔")]));
    expect(report.unicodeConsistency).toBe("ok");
    expect(report.typographyIssueCount).toBe(0);
    expect(report.numeralConsistency).toBe("ok");
    expect(report.paragraphStructure).toBe("ok");
    expect(report.headingHierarchy).toBe("ok");
  });

  test("an empty document reports 'ok' everywhere, not an error", () => {
    const report = buildDocumentHealthReport(docWith([]));
    expect(report.unicodeConsistency).toBe("ok");
    expect(report.numeralConsistency).toBe("ok");
    expect(report.paragraphStructure).toBe("ok");
    expect(report.headingHierarchy).toBe("ok");
    expect(report.languageDistribution.dominant).toBe("none");
  });
});

describe("buildDocumentHealthReport — unicodeConsistency", () => {
  test("Arabic-form letters mark unicodeConsistency as needs_review", () => {
    const report = buildDocumentHealthReport(docWith([paragraph("علي نے كتاب پڑھی۔")]));
    expect(report.unicodeConsistency).toBe("needs_review");
  });
});

describe("buildDocumentHealthReport — typographyIssueCount reflects Advanced Typography checks", () => {
  test("a space before punctuation is counted", () => {
    const report = buildDocumentHealthReport(docWith([paragraph("یہ ٹھیک ہے ، بالکل۔")]));
    expect(report.typographyIssueCount).toBeGreaterThan(0);
  });

  test("tatweel characters are counted", () => {
    const report = buildDocumentHealthReport(docWith([paragraph("الحمـــد لله")]));
    expect(report.typographyIssueCount).toBeGreaterThan(0);
  });

  test("inconsistent punctuation style is counted", () => {
    const report = buildDocumentHealthReport(docWith([paragraph("یہ، اور یہ بھی, اور یہ")]));
    expect(report.typographyIssueCount).toBeGreaterThan(0);
  });
});

describe("buildDocumentHealthReport — numeralConsistency", () => {
  test("mixed numeral systems mark numeralConsistency as needs_review", () => {
    const report = buildDocumentHealthReport(docWith([paragraph("2024 اور ۱۲۳")]));
    expect(report.numeralConsistency).toBe("needs_review");
  });

  test("a single numeral system is 'ok'", () => {
    const report = buildDocumentHealthReport(docWith([paragraph("۱۲۳ اور ۴۵۶")]));
    expect(report.numeralConsistency).toBe("ok");
  });
});

describe("buildDocumentHealthReport — languageDistribution", () => {
  test("reflects the same values as buildDocumentStats' language analysis", () => {
    const report = buildDocumentHealthReport(docWith([paragraph("یہ Document Studio ہے۔")]));
    expect(report.languageDistribution.dominant).toBe("mixed");
    expect(report.languageDistribution.arabicScriptPercent + report.languageDistribution.latinPercent).toBe(100);
  });
});

describe("buildDocumentHealthReport — structure and heading hierarchy", () => {
  test("a document starting with H2 marks both headingHierarchy and paragraphStructure as needs_review", () => {
    const report = buildDocumentHealthReport(docWith([heading(2, "Section")]));
    expect(report.headingHierarchy).toBe("needs_review");
    expect(report.paragraphStructure).toBe("needs_review");
  });

  test("correct H1-first structure reports headingHierarchy 'ok'", () => {
    const report = buildDocumentHealthReport(docWith([heading(1, "Title"), heading(2, "Section")]));
    expect(report.headingHierarchy).toBe("ok");
  });
});
