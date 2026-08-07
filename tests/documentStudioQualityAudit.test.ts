import { describe, it, expect } from "vitest";
import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

describe("Document Studio Quality Audit Engine", () => {
  it("should return empty report for empty doc", () => {
    const emptyDoc: DocNode = {
      type: "doc",
      content: [],
    };

    const report = buildDocumentAuditReport(emptyDoc);
    expect(report.totalIssues).toBe(0);
    expect(report.recommendations.length).toBe(0);
  });

  it("should audit document text and calculate issues correctly", () => {
    const sampleDoc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "یہ ایک  ٹیسٹ جملہ ہے? جس میں کافى غلطیاں ہیں۔",
            },
          ],
        },
      ],
    };

    const report = buildDocumentAuditReport(sampleDoc);
    expect(report.totalIssues).toBeGreaterThan(0);
  });
});
