import { describe, it, expect } from "vitest";
import { normalizeDocumentNodes } from "../app/tools/document-studio/utils/normalizeDocumentNodes";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { extractPlainText } from "../app/tools/document-studio/utils/extractPlainText";

function visibleText(doc: DocNode): string {
  return extractPlainText(doc, "ltr").replace(/\n+$/, "");
}

describe("normalizeDocumentNodes — rich-text boundary safety", () => {
  it("English: preserves space between plain and bold nodes", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "hello " },
            { type: "text", text: "world", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    const { document, changed } = normalizeDocumentNodes(doc, "en");
    expect(visibleText(document)).toBe("hello world");
    const para = document.content![0];
    expect(para.content![1].marks?.some((m) => m.type === "bold")).toBe(true);
    // Must not collapse to helloworld
    expect(visibleText(document)).not.toBe("helloworld");
    // Boundary space preservation is not itself a "correction"
    if (!changed) {
      expect(visibleText(document)).toBe("hello world");
    }
  });

  it("Urdu: preserves space before bold word and applies Urdu maps", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "یہ " },
            { type: "text", text: "كتاب", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    const { document } = normalizeDocumentNodes(doc, "ur");
    expect(visibleText(document)).toBe("یہ کتاب");
    expect(document.content![0].content![1].marks?.some((m) => m.type === "bold")).toBe(true);
    expect(document.content![0].content![1].text).toBe("کتاب");
  });

  it("Arabic: preserves space and linked text orthography", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "علي " },
            {
              type: "text",
              text: "كربلاء",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
      ],
    };
    const { document, report } = normalizeDocumentNodes(doc, "ar");
    expect(visibleText(document)).toBe("علي كربلاء");
    const linkNode = document.content![0].content![1];
    expect(linkNode.marks?.some((m) => m.type === "link")).toBe(true);
    expect(linkNode.marks?.find((m) => m.type === "link")?.attrs?.href).toBe("https://example.com");
    expect(linkNode.text).toContain("ك");
    expect(document.content![0].content![0].text).toContain("ي");
    expect(report.direction).toBe("rtl");
  });

  it("Auto: Arabic-script split across marks stays rtl-neutral and non-destructive", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "علي " },
            { type: "text", text: "كربلاء", marks: [{ type: "italic" }] },
          ],
        },
      ],
    };
    const { document, report } = normalizeDocumentNodes(doc, "auto");
    expect(visibleText(document)).toBe("علي كربلاء");
    expect(report.resolvedLanguage).toBe("rtl-neutral");
    expect(document.content![0].content![1].marks?.some((m) => m.type === "italic")).toBe(true);
  });

  it("Link: Visit + qalamworks.com keeps space and URL", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Visit " },
            {
              type: "text",
              text: "qalamworks.com",
              marks: [{ type: "link", attrs: { href: "https://qalamworks.com" } }],
            },
          ],
        },
      ],
    };
    const { document } = normalizeDocumentNodes(doc, "en");
    expect(visibleText(document)).toBe("Visit qalamworks.com");
    expect(document.content![0].content![1].text).toBe("qalamworks.com");
  });

  it("Multiple marks: plain + bold + italic + plain", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "one " },
            { type: "text", text: "two ", marks: [{ type: "bold" }] },
            { type: "text", text: "three ", marks: [{ type: "italic" }] },
            { type: "text", text: "four" },
          ],
        },
      ],
    };
    const { document } = normalizeDocumentNodes(doc, "en");
    expect(visibleText(document)).toBe("one two three four");
    expect(document.content![0].content![1].marks?.[0].type).toBe("bold");
    expect(document.content![0].content![2].marks?.[0].type).toBe("italic");
  });

  it("Leading/trailing block whitespace still cleaned for single text node", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "  hello world  " }],
        },
      ],
    };
    const { document } = normalizeDocumentNodes(doc, "en");
    expect(visibleText(document)).toBe("hello world");
  });

  it("Legitimate punctuation cleanup still works without breaking marks", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello ," },
            { type: "text", text: " world", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    const { document } = normalizeDocumentNodes(doc, "en");
    const text = visibleText(document);
    expect(text).toContain("Hello");
    expect(text).toContain("world");
    expect(text).not.toMatch(/helloworld/i);
    expect(document.content![0].content![1].marks?.[0].type).toBe("bold");
  });
});
