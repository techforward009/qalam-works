import { describe, it, expect } from "vitest";
import { normalizeDocumentNodes } from "../app/tools/document-studio/utils/normalizeDocumentNodes";
import { buildDocumentAuditReport } from "../app/tools/document-studio/utils/buildDocumentAuditReport";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { processText } from "../app/utils/processing/processText";
import { standardizeUrduText } from "../app/utils/unicode/standardizeUrduText";

function plainDoc(text: string): DocNode {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe("Document Studio multilingual normalize", () => {
  it("English explicit cleans spacing without Arabic punctuation", () => {
    const r = normalizeDocumentNodes(plainDoc("This is a test ,with bad spacing."), "en");
    expect(r.document.content?.[0].content?.[0].text).toBe("This is a test, with bad spacing.");
    expect(r.report.resolvedLanguage).toBe("en");
    expect(r.report.direction).toBe("ltr");
  });

  it("English Auto resolves English", () => {
    const r = normalizeDocumentNodes(plainDoc("This is a test ,with bad spacing."), "auto");
    expect(r.report.resolvedLanguage).toBe("en");
    expect(r.report.direction).toBe("ltr");
  });

  it("Urdu explicit normalizes orthography", () => {
    const r = normalizeDocumentNodes(plainDoc("علي كتاب"), "ur");
    expect(r.document.content?.[0].content?.[0].text).toBe("علی کتاب");
    expect(r.report.direction).toBe("rtl");
  });

  it("Urdu Auto remains non-destructive", () => {
    const r = normalizeDocumentNodes(plainDoc("علي كتاب"), "auto");
    expect(r.document.content?.[0].content?.[0].text).toBe("علي كتاب");
    expect(r.report.resolvedLanguage).toBe("rtl-neutral");
  });

  it("Arabic explicit preserves orthography", () => {
    const r = normalizeDocumentNodes(plainDoc("علي عليه السلام، كربلاء"), "ar");
    const text = r.document.content?.[0].content?.[0].text || "";
    expect(text).toContain("ي");
    expect(text).toContain("ك");
    expect(r.report.direction).toBe("rtl");
  });

  it("Arabic Auto remains non-destructive", () => {
    const r = normalizeDocumentNodes(plainDoc("علي كربلاء"), "auto");
    expect(r.document.content?.[0].content?.[0].text).toBe("علي كربلاء");
    expect(r.report.resolvedLanguage).toBe("rtl-neutral");
  });

  it("Persian-like Auto non-destructive", () => {
    const input = "علي در تهران زندگي مي‌كند";
    const r = normalizeDocumentNodes(plainDoc(input), "auto");
    expect(r.document.content?.[0].content?.[0].text).toContain("ي");
    expect(r.document.content?.[0].content?.[0].text).toContain("ك");
    expect(r.report.resolvedLanguage).toBe("rtl-neutral");
  });

  it("Mixed Urdu+English Auto preserves Latin", () => {
    const input = "یہ Qalam Works کا نیا tool ہے۔";
    const r = normalizeDocumentNodes(plainDoc(input), "auto");
    expect(r.document.content?.[0].content?.[0].text).toContain("Qalam Works");
    expect(["ur", "rtl-neutral"]).toContain(r.report.resolvedLanguage);
  });

  it("URL preserved under English", () => {
    const r = normalizeDocumentNodes(plainDoc("Visit qalamworks.com , then continue."), "en");
    const text = r.document.content?.[0].content?.[0].text || "";
    expect(text).toContain("qalamworks.com");
    expect(text).not.toContain("،");
  });

  it("mode switching pipeline Auto→Urdu→Arabic→Auto", () => {
    const src = "علي كتاب";
    const a = processText(src, "auto");
    expect(a.output).toBe(src);
    const u = processText(src, "ur");
    expect(u.output).toBe("علی کتاب");
    const ar = processText(src, "ar");
    expect(ar.output).toContain("ي");
    const a2 = processText(src, "auto");
    expect(a2.output).toBe(src);
  });

  it("default normalizeDocumentNodes remains Urdu for historical tests", () => {
    const r = normalizeDocumentNodes(plainDoc("علي"));
    expect(r.document.content?.[0].content?.[0].text).toBe("علی");
  });

  it("audit in Arabic mode does not flag valid Arabic forms", () => {
    const report = buildDocumentAuditReport(plainDoc("علي كربلاء"), undefined, "ar");
    expect(report.counts.mixedUrduArabicForms).toBe(0);
  });

  it("standardizeUrduText still explicit Urdu", () => {
    expect(standardizeUrduText("علي كتاب").output).toBe("علی کتاب");
  });
});

describe("normalizeDocumentNodes — Auto mixed example shape", () => {
  it("separate paragraphs: Urdu + English get segment-appropriate fixes", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "علي كتاب" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "This is a test ,with bad spacing." }],
        },
        { type: "paragraph", content: [{ type: "text", text: "علي كربلاء" }] },
      ],
    };
    const { document, report, changed } = normalizeDocumentNodes(doc as any, "auto");
    expect(changed).toBe(true);
    const texts = document.content!.map((p: any) => p.content?.[0]?.text);
    expect(texts[0]).toBe("علی کتاب");
    expect(texts[1]).toBe("This is a test, with bad spacing.");
    // Third line is Arabic-script without protection in mixed doc → Urdu maps apply
    expect(texts[2]).toBe("علی کربلاء");
  });

  it("pure Arabic document paragraphs stay non-destructive", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "علي كربلاء" }] },
        { type: "paragraph", content: [{ type: "text", text: "عليه السلام" }] },
      ],
    };
    const { document, report } = normalizeDocumentNodes(doc as any, "auto");
    expect(report.resolvedLanguage).toBe("rtl-neutral");
    expect(document.content![0].content![0].text).toBe("علي كربلاء");
  });
});
