import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import { checkTextQuality } from "../app/utils/quality/checkTextQuality";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function docWithText(text: string): DocNode {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe("checkTextQuality — real shape sanity check", () => {
  test("returns a single structured object, never an array or an {issues:[]} shape", () => {
    const result = checkTextQuality("test  text, with issues?");
    expect(Array.isArray(result)).toBe(false);
    expect((result as unknown as { issues?: unknown }).issues).toBeUndefined();
    expect((result as unknown as { errors?: unknown }).errors).toBeUndefined();
    expect(result).toHaveProperty("typography");
    expect(result).toHaveProperty("punctuation");
    expect(result).toHaveProperty("textQuality");
  });
});

describe("buildDocumentAuditReport", () => {
  test("returns the empty/perfect report for an empty document", () => {
    const report = buildDocumentAuditReport(docWithText(""));
    expect(report.totalIssues).toBe(0);
    expect(report.recommendations).toHaveLength(0);
  });

  test("detects real spacing issues (multiple spaces) via the actual counts, not a regex guess", () => {
    const report = buildDocumentAuditReport(docWithText("لفظ  دوسرا لفظ"));
    expect(report.counts.spacing).toBeGreaterThan(0);
    expect(report.totalIssues).toBeGreaterThan(0);
    expect(report.recommendations.some((r) => r.type === "spacing")).toBe(true);
  });

  test("detects mixed-script issues (Latin letters in Arabic-script text)", () => {
    const report = buildDocumentAuditReport(docWithText("یہ ABC ٹیسٹ ہے"));
    expect(report.counts.mixedScript).toBeGreaterThan(0);
    expect(report.recommendations.some((r) => r.type === "mixedScript")).toBe(true);
  });

  test("detects punctuation issues (ASCII comma/semicolon/question mark)", () => {
    const report = buildDocumentAuditReport(docWithText("سوال ہے؟ کیا, ٹھیک ہے"));
    expect(report.counts.punctuation).toBeGreaterThan(0);
    expect(report.recommendations.some((r) => r.type === "punctuation")).toBe(true);
  });

  test("detects long paragraphs (over 250 chars)", () => {
    const longText = "لفظ ".repeat(80); // well over 250 chars
    const report = buildDocumentAuditReport(docWithText(longText));
    expect(report.counts.longParagraphs).toBeGreaterThan(0);
    expect(report.recommendations.some((r) => r.type === "longParagraphs")).toBe(true);
  });

  test("detects repeated adjacent words as their own category", () => {
    const report = buildDocumentAuditReport(docWithText("یہ یہ جملہ دہرایا گیا ہے"));
    expect(report.counts.repeatedWords).toBeGreaterThan(0);
    expect(report.recommendations.some((r) => r.type === "repeatedWords")).toBe(true);
  });

  test("counts (including repeatedWords) sum to totalIssues", () => {
    const report = buildDocumentAuditReport(docWithText("لفظ  دوسرا, ABC لفظ؟ یہ یہ دہرایا"));
    const sum =
      report.counts.mixedScript +
      report.counts.punctuation +
      report.counts.spacing +
      report.counts.longParagraphs +
      report.counts.repeatedWords;
    expect(report.totalIssues).toBe(sum);
  });

  test("score is present as a number but its formula is not tested (provisional, not yet approved — see DECISIONS.md)", () => {
    const report = buildDocumentAuditReport(docWithText("لفظ  دوسرا, ABC؟ ".repeat(50)));
    expect(typeof report.score).toBe("number");
  });

  test("clean, standard text produces a perfect report", () => {
    const report = buildDocumentAuditReport(docWithText("یہ ایک سادہ اور معیاری جملہ ہے۔"));
    expect(report.totalIssues).toBe(0);
  });
});
