import { extractPlainText, getBlockTexts, type DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { normalizeDocumentNodes } from "../app/tools/document-studio/utils/normalizeDocumentNodes";
import { buildQualityInput } from "../app/tools/document-studio/utils/buildQualityInput";

// A representative mixed document: heading, bold/italic marks, a link,
// a bullet list, a numbered list, an empty paragraph, and mixed
// Urdu(RTL) + English(LTR) text in the same paragraph.
function sampleDoc(): DocNode {
  return {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "عنوان Heading" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "یہ " },
          { type: "text", text: "بولڈ", marks: [{ type: "bold" }] },
          { type: "text", text: " اور " },
          { type: "text", text: "italic", marks: [{ type: "italic" }] },
          { type: "text", text: " ہے۔" },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "دیکھیں " },
          { type: "text", text: "قلم ورکس", marks: [{ type: "link", attrs: { href: "https://qalamworks.com" } }] },
        ],
      },
      { type: "paragraph" }, // empty paragraph — no content field
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "پہلا نکتہ" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "دوسرا نکتہ" }] }] },
        ],
      },
      {
        type: "orderedList",
        attrs: { start: 1 },
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "السلام علیک" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "و علی الارواح" }] }] },
        ],
      },
    ],
  };
}

describe("extractPlainText", () => {
  test("reconstructs numbering and bullets, one block per line, RTL-safe", () => {
    const text = extractPlainText(sampleDoc(), "rtl");
    const lines = text.split("\r\n");

    expect(lines[0]).toBe("عنوان Heading");
    expect(lines.some((l) => l.includes("• پہلا نکتہ"))).toBe(true);
    expect(lines.some((l) => l.includes("• دوسرا نکتہ"))).toBe(true);
    // RTL numbering is wrapped in U+200E (LRM) marks around "1." / "2." —
    // strip marks before comparing, since the general bidi-weak-run
    // isolation (for brackets/digits elsewhere in a document) also wraps
    // digits and can add further marks on top; only the logical order
    // matters here.
    expect(lines.some((l) => l.replace(/\u200E/g, "").includes("1. السلام علیک"))).toBe(true);
    expect(lines.some((l) => l.replace(/\u200E/g, "").includes("2. و علی الارواح"))).toBe(true);
  });

  test("uses plain 'N. ' numbering (no bidi marks) in LTR mode", () => {
    const text = extractPlainText(sampleDoc(), "ltr");
    expect(text.includes("1. السلام علیک")).toBe(true);
    expect(text.includes("\u200E")).toBe(false);
  });

  test("extracts mixed RTL/LTR text within one paragraph correctly", () => {
    const text = extractPlainText(sampleDoc(), "rtl");
    expect(text).toContain("عنوان Heading");
    expect(text).toContain("یہ بولڈ اور italic ہے۔");
  });

  // Regression test for a real bug (2026-08-07, reported: a citation bracket
  // "[...]" that looked correct in the browser editor came out reversed when
  // the downloaded .txt was opened in Microsoft Word). Follow-up finding,
  // same day: an RLM (U+200F) fix had NO effect — confirmed via a live A/B
  // test comparing the same text in an RTL vs LTR Word paragraph — because
  // brackets are Unicode-*mirrored* characters that flip their glyph under
  // RTL resolution specifically; adding more "this is RTL" marks to text
  // that's already RTL changes nothing. LRM (U+200E), which forces an
  // LTR-resolved run, is the fix that actually stops the mirroring.
  test("isolates authored brackets and digits (citation-style refs) with LRM, not RLM, for correct rendering in RTL export", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "[اتحاف السادة المتقین ج.1 ص.501 دار الکتب العلمیہ]" }],
        },
      ],
    };
    const text = extractPlainText(doc, "rtl");
    expect(text).toContain("\u200E[\u200E");
    expect(text).toContain("\u200E]\u200E");
    // stripping the marks recovers the exact original, untouched text
    expect(text.replace(/\u200E/g, "")).toBe("[اتحاف السادة المتقین ج.1 ص.501 دار الکتب العلمیہ]");
  });

  test("does not add bidi marks around brackets/digits in LTR mode", () => {
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "[citation] page 501, vol. 2" }] }],
    };
    const text = extractPlainText(doc, "ltr");
    expect(text).toBe("[citation] page 501, vol. 2");
    expect(text.includes("\u200E")).toBe(false);
  });
});

describe("getBlockTexts / buildQualityInput", () => {
  test("keeps each block on its own line without list-marker decoration", () => {
    const blocks = getBlockTexts(sampleDoc());
    expect(blocks).toContain("پہلا نکتہ");
    expect(blocks).toContain("السلام علیک");
    // no synthetic "1. " / "• " prefixes here
    expect(blocks.some((b) => b.startsWith("• "))).toBe(false);
    expect(blocks.some((b) => /^\d+\.\s/.test(b))).toBe(false);
  });

  test("buildQualityInput joins blocks with a single newline, preserving paragraph boundaries", () => {
    const input = buildQualityInput(sampleDoc());
    const paragraphs = input.split("\n");
    expect(paragraphs.length).toBeGreaterThanOrEqual(getBlockTexts(sampleDoc()).length);
    expect(input).not.toContain("\u200E");
  });
});

describe("normalizeDocumentNodes", () => {
  test("preserves bold/italic marks", () => {
    const { document } = normalizeDocumentNodes(sampleDoc());
    const para = document.content?.[1];
    const boldNode = para?.content?.find((n) => n.marks?.some((m) => m.type === "bold"));
    const italicNode = para?.content?.find((n) => n.marks?.some((m) => m.type === "italic"));
    expect(boldNode).toBeDefined();
    expect(italicNode).toBeDefined();
  });

  test("does not change a link's href", () => {
    const { document } = normalizeDocumentNodes(sampleDoc());
    const linkPara = document.content?.[2];
    const linkNode = linkPara?.content?.find((n) => n.marks?.some((m) => m.type === "link"));
    const linkMark = linkNode?.marks?.find((m) => m.type === "link");
    expect(linkMark?.attrs?.href).toBe("https://qalamworks.com");
  });

  test("preserves numbered and bullet list structure", () => {
    const { document } = normalizeDocumentNodes(sampleDoc());
    const bulletList = document.content?.find((n) => n.type === "bulletList");
    const orderedList = document.content?.find((n) => n.type === "orderedList");
    expect(bulletList?.content?.length).toBe(2);
    expect(orderedList?.content?.length).toBe(2);
    expect(orderedList?.attrs?.start).toBe(1);
  });

  test("preserves empty paragraphs (no content field)", () => {
    const { document } = normalizeDocumentNodes(sampleDoc());
    const emptyPara = document.content?.[3];
    expect(emptyPara?.type).toBe("paragraph");
    expect(emptyPara?.content).toBeUndefined();
  });

  test("does not mutate the original document object", () => {
    const original = sampleDoc();
    const originalCopy = JSON.parse(JSON.stringify(original));
    normalizeDocumentNodes(original);
    expect(original).toEqual(originalCopy);
  });

  test("reports changed:false for an already-standardized document", () => {
    const clean: DocNode = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "علی کربلا" }] }],
    };
    const { changed, report } = normalizeDocumentNodes(clean);
    expect(changed).toBe(false);
    expect(report.totalCorrections).toBe(0);
  });

  test("reports changed:true and correction counts for text needing normalization", () => {
    const dirty: DocNode = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "علي ، كربلاء" }] }],
    };
    const { changed, report, document } = normalizeDocumentNodes(dirty);
    expect(changed).toBe(true);
    expect(report.totalCorrections).toBeGreaterThan(0);
    expect(document.content?.[0].content?.[0].text).not.toBe("علي ، كربلاء");
  });
});
