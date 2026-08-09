import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import { checkTextQuality } from "../app/utils/quality/checkTextQuality";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

function docWithText(text: string): DocNode {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function docFromLines(lines: string[]): DocNode {
  return {
    type: "doc",
    content: lines.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
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

  // Regression test for a real bug (2026-08-07, found via Sajjad's screenshot):
  // a document made of several genuinely short paragraphs, whose combined
  // length exceeds 250 chars, was being wrongly flagged as "1 long
  // paragraph" — because checkTextQuality's own paragraph-split (on a blank
  // line) never matched buildQualityInput's single-"\n" block join, so the
  // whole document was checked as one block. Fixed by computing
  // longParagraphs directly from the document's real per-block boundaries.
  test("does NOT flag several short paragraphs as one long paragraph, even if their combined length exceeds 250 chars", () => {
    const shortLines = [
      "یہ پہلا مختصر جملہ ہے",
      "یہ دوسرا مختصر جملہ ہے",
      "یہ تیسرا مختصر جملہ ہے",
      "یہ چوتھا مختصر جملہ ہے، تھوڑا لمبا کرنے کے لیے کچھ اور الفاظ شامل کر رہے ہیں",
      "یہ پانچواں مختصر جملہ ہے",
      "یہ چھٹا مختصر جملہ ہے، اور اسے بھی تھوڑا لمبا بنا رہے ہیں تاکہ مجموعی طوالت 250 سے تجاوز کر جائے",
    ];
    const combinedLength = shortLines.join("\n").length;
    expect(combinedLength).toBeGreaterThan(250); // confirms the test actually exercises the bug condition

    const report = buildDocumentAuditReport(docFromLines(shortLines));
    expect(report.counts.longParagraphs).toBe(0);
  });

  test("still flags each genuinely long paragraph individually, in a multi-paragraph document", () => {
    const longLine = "لفظ ".repeat(80); // ~400 chars, one block
    const report = buildDocumentAuditReport(docFromLines([longLine, "چھوٹا جملہ", longLine]));
    expect(report.counts.longParagraphs).toBe(2);
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

// Advanced Quality Layer (2026-08-09): heading hierarchy, empty paragraphs,
// mixed Urdu/Arabic character forms, and Publishing Readiness.
describe("buildDocumentAuditReport — heading hierarchy issues", () => {
  test("document starting with H2 (not H1) is flagged", () => {
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Section" }] }],
    };
    const report = buildDocumentAuditReport(doc);
    expect(report.counts.headingHierarchy).toBe(1);
  });

  test("document starting with H1 is not flagged", () => {
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] }],
    };
    const report = buildDocumentAuditReport(doc);
    expect(report.counts.headingHierarchy).toBe(0);
  });

  test("H1 followed directly by H3 (skipping H2) is flagged", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Sub-sub" }] },
      ],
    };
    const report = buildDocumentAuditReport(doc);
    expect(report.counts.headingHierarchy).toBe(1);
  });

  test("H1 -> H2 -> H3 in proper order is not flagged", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Section" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Subsection" }] },
      ],
    };
    const report = buildDocumentAuditReport(doc);
    expect(report.counts.headingHierarchy).toBe(0);
  });

  test("going shallower (H3 back to H1) is normal structure, not flagged", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "x" }] },
      ],
    };
    // Note: this itself is 1 issue (H1->H3 skip). Add a second top-level
    // H1 afterward and confirm THAT transition alone isn't double-flagged.
    doc.content!.push({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "New Section" }] });
    const report = buildDocumentAuditReport(doc);
    expect(report.counts.headingHierarchy).toBe(1); // only the H1->H3 skip, not the H3->H1 drop
  });

  test("a document with no headings at all is not flagged", () => {
    const report = buildDocumentAuditReport(docWithText("Just a plain paragraph, no headings."));
    expect(report.counts.headingHierarchy).toBe(0);
  });
});

describe("buildDocumentAuditReport — empty paragraphs", () => {
  test("flags a genuinely empty paragraph block", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Real content." }] },
        { type: "paragraph", content: [] },
        { type: "paragraph", content: [{ type: "text", text: "More content." }] },
      ],
    };
    const report = buildDocumentAuditReport(doc);
    expect(report.counts.emptyParagraphs).toBe(1);
  });

  test("does not flag paragraphs that have real text", () => {
    const report = buildDocumentAuditReport(docFromLines(["First.", "Second.", "Third."]));
    expect(report.counts.emptyParagraphs).toBe(0);
  });
});

describe("buildDocumentAuditReport — mixed Urdu/Arabic character forms", () => {
  test("flags Arabic-form letters in the document", () => {
    const report = buildDocumentAuditReport(docWithText("علي نے كتاب پڑھی۔"));
    expect(report.counts.mixedUrduArabicForms).toBeGreaterThan(0);
  });

  test("produces a matching recommendation", () => {
    const report = buildDocumentAuditReport(docWithText("علي نے كتاب پڑھی۔"));
    expect(report.recommendations.some((r) => r.type === "mixedUrduArabicForms")).toBe(true);
  });
});

describe("buildDocumentAuditReport — Publishing Readiness (categorical, not numeric)", () => {
  test("a clean document reports 'ok' across all four categories", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "عنوان" }] },
        { type: "paragraph", content: [{ type: "text", text: "یہ ایک سادہ اور معیاری جملہ ہے۔" }] },
      ],
    };
    const report = buildDocumentAuditReport(doc);
    expect(report.readiness).toEqual({
      typography: "ok",
      unicodeConsistency: "ok",
      structure: "ok",
      rtlLtr: "ok",
    });
  });

  test("mixed Urdu/Arabic forms mark unicodeConsistency as needs_review only", () => {
    const report = buildDocumentAuditReport(docWithText("علي نے كتاب پڑھی۔"));
    expect(report.readiness.unicodeConsistency).toBe("needs_review");
    expect(report.readiness.typography).toBe("ok");
  });

  test("a heading-hierarchy problem marks structure as needs_review", () => {
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Section" }] }],
    };
    const report = buildDocumentAuditReport(doc);
    expect(report.readiness.structure).toBe("needs_review");
  });

  test("an empty document reports 'ok' across all four categories", () => {
    const report = buildDocumentAuditReport({ type: "doc", content: [] });
    expect(report.readiness).toEqual({
      typography: "ok",
      unicodeConsistency: "ok",
      structure: "ok",
      rtlLtr: "ok",
    });
  });
});
