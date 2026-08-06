import { describe, it, expect } from "vitest";
import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import { buildQualityInput } from "../app/tools/document-studio/utils/buildQualityInput";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

describe("Document Studio Quality Audit Adapter (Vitest)", () => {
  it("returns score 100 and zero issues for empty doc with paragraph node", () => {
    const emptyDoc: DocNode = {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
    const report = buildDocumentAuditReport(emptyDoc);
    expect(report.score).toBe(100);
    expect(report.totalIssues).toBe(0);
    expect(report.recommendations).toHaveLength(0);
  });

  it("ensures empty audit reports return new object references (no shared mutation)", () => {
    const emptyDoc: DocNode = {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
    const report1 = buildDocumentAuditReport(emptyDoc);
    const report2 = buildDocumentAuditReport(emptyDoc);

    expect(report1).not.toBe(report2);
    expect(report1.counts).not.toBe(report2.counts);
    expect(report1.recommendations).not.toBe(report2.recommendations);
  });

  it("buildQualityInput retains list items on separate lines", () => {
    const docWithList: DocNode = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "پہلی آئٹم" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "دوسری آئٹم" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const textInput = buildQualityInput(docWithList);
    expect(textInput).toContain("پہلی آئٹم\nدوسری آئٹم");
  });

  it("does not mutate the input document object", () => {
    const inputDoc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "یہ ایک تجرباتی جملہ ہے۔" }],
        },
      ],
    };
    const clonedDoc = JSON.parse(JSON.stringify(inputDoc));
    buildDocumentAuditReport(inputDoc);
    expect(inputDoc).toEqual(clonedDoc);
  });

  it("asserts concrete issue detection on problematic text", () => {
    const sampleDoc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "علي عليه السلام , كربلاء ; يحيى ?" },
          ],
        },
      ],
    };
    const report = buildDocumentAuditReport(sampleDoc);

    expect(report.totalIssues).toBeGreaterThan(0);
    expect(report.counts.mixedScript).toBeGreaterThan(0);
    expect(report.counts.punctuation).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);

    const calculatedSum =
      report.counts.mixedScript +
      report.counts.punctuation +
      report.counts.spacing +
      report.counts.longParagraphs;
    expect(report.totalIssues).toBe(calculatedSum);
  });

  it("returns zero issues and empty recommendations for a clean document fixture", () => {
    const cleanDoc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "یہ ایک بالکل معیاری اور صاف متن ہے۔" }],
        },
      ],
    };
    const report = buildDocumentAuditReport(cleanDoc);

    expect(report.totalIssues).toBe(0);
    expect(report.recommendations).toHaveLength(0);
  });

  it("verifies paragraph threshold breach against checkTextQuality limits (control vs breached)", () => {
    const shortDoc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "یہ مختصر متن ہے" }],
        },
      ],
    };

    // Concrete threshold verification (500+ characters to safely trigger paragraph_length issue)
    const longText = "یہ ایک طویل پیراگراف کا معلوماتی جملہ ہے جس کو لازماً چیکر کی مقررہ حد یعنی پانچ سو کریکٹر سے زیادہ ہونا چاہیے۔ ".repeat(8);
    const longDoc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: longText }],
        },
      ],
    };

    const shortReport = buildDocumentAuditReport(shortDoc);
    const longReport = buildDocumentAuditReport(longDoc);

    expect(shortReport.counts.longParagraphs).toBe(0);
    expect(longReport.counts.longParagraphs).toBeGreaterThan(0);
  });

  it("returns identical deterministic output on repeated calls", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "ٹیسٹ مواد" }],
        },
      ],
    };
    const report1 = buildDocumentAuditReport(doc);
    const report2 = buildDocumentAuditReport(doc);
    expect(report1).toEqual(report2);
  });
});
