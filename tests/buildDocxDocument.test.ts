// Same verification philosophy as scripts/verification/docx-spike.ts (see
// PHASE-3C-DOCX-SPEC.md §7): asserting that createDocxDocument() doesn't
// throw proves almost nothing about correctness. These tests pack the
// real Document to a buffer and unzip it with JSZip to inspect the actual
// OOXML, the same way the spike was manually verified.

import JSZip from "jszip";
import { Packer } from "docx";
import { createDocxDocument, buildDocxBlob } from "../app/tools/document-studio/utils/buildDocxDocument";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

async function extractDocumentXml(doc: DocNode, dir: "rtl" | "ltr"): Promise<string> {
  const buffer = await Packer.toBuffer(createDocxDocument(doc, dir));
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("word/document.xml missing from generated docx");
  return file.async("text");
}

async function extractRelsXml(doc: DocNode, dir: "rtl" | "ltr"): Promise<string> {
  const buffer = await Packer.toBuffer(createDocxDocument(doc, dir));
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file("word/_rels/document.xml.rels");
  if (!file) throw new Error("word/_rels/document.xml.rels missing from generated docx");
  return file.async("text");
}

function docWith(content: DocNode["content"]): DocNode {
  return { type: "doc", content };
}

describe("createDocxDocument — paragraphs, headings, direction, alignment", () => {
  test("plain paragraph produces <w:p> with the given text", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }]),
      "ltr"
    );
    expect(xml).toContain("Hello world");
    expect(xml).toContain("<w:p>");
  });

  test("heading level 1 gets the Heading1 style", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] }]),
      "ltr"
    );
    expect(xml).toContain('w:val="Heading1"');
  });

  test("heading level 2 gets the Heading2 style", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Subtitle" }] }]),
      "ltr"
    );
    expect(xml).toContain('w:val="Heading2"');
  });

  test("RTL direction sets <w:bidi/> on the paragraph", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "اردو متن" }] }]),
      "rtl"
    );
    expect(xml).toContain("<w:bidi/>");
  });

  test("LTR direction does NOT set <w:bidi/>", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "English text" }] }]),
      "ltr"
    );
    expect(xml).not.toContain("<w:bidi/>");
  });

  test("textAlign attrs map to the correct <w:jc> value", async () => {
    const xml = await extractDocumentXml(
      docWith([
        { type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "Centered" }] },
        { type: "paragraph", attrs: { textAlign: "right" }, content: [{ type: "text", text: "Right" }] },
      ]),
      "ltr"
    );
    expect(xml).toContain('w:val="center"');
    expect(xml).toContain('w:val="right"');
  });
});

describe("createDocxDocument — marks (bold, italic, links, hardBreak)", () => {
  test("bold mark produces <w:b/> and <w:bCs/> together", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "paragraph",
          content: [{ type: "text", text: "bold text", marks: [{ type: "bold" }] }],
        },
      ]),
      "ltr"
    );
    expect(xml).toContain("<w:b/>");
    expect(xml).toContain("<w:bCs/>");
  });

  test("italic mark produces <w:i/> and <w:iCs/> together", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "paragraph",
          content: [{ type: "text", text: "italic text", marks: [{ type: "italic" }] }],
        },
      ]),
      "ltr"
    );
    expect(xml).toContain("<w:i/>");
    expect(xml).toContain("<w:iCs/>");
  });

  test("a link mark with a valid href produces a real hyperlink relationship", async () => {
    const doc = docWith([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Qalam Works",
            marks: [{ type: "link", attrs: { href: "https://qalamworks.com" } }],
          },
        ],
      },
    ]);
    const xml = await extractDocumentXml(doc, "ltr");
    const rels = await extractRelsXml(doc, "ltr");
    expect(xml).toContain("<w:hyperlink");
    expect(xml).toContain("Qalam Works");
    expect(rels).toContain('Target="https://qalamworks.com"');
    expect(rels).toContain('TargetMode="External"');
  });

  test("a link mark with no href falls back to plain formatted text, not dropped", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "paragraph",
          content: [{ type: "text", text: "no href here", marks: [{ type: "link", attrs: {} }] }],
        },
      ]),
      "ltr"
    );
    expect(xml).toContain("no href here");
    expect(xml).not.toContain("<w:hyperlink");
  });

  test("hardBreak produces <w:br/>", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "paragraph",
          content: [{ type: "text", text: "line one" }, { type: "hardBreak" }, { type: "text", text: "line two" }],
        },
      ]),
      "ltr"
    );
    expect(xml).toContain("<w:br/>");
    expect(xml).toContain("line one");
    expect(xml).toContain("line two");
  });
});

describe("createDocxDocument — lists", () => {
  test("bullet list items get numbering references", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "First" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Second" }] }] },
          ],
        },
      ]),
      "ltr"
    );
    expect(xml).toContain("<w:numPr>");
    expect(xml).toContain("First");
    expect(xml).toContain("Second");
  });

  test("bullet list and numbered list use distinct numbering references, not shared", async () => {
    const doc = docWith([
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet" }] }] }],
      },
      {
        type: "orderedList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Numbered" }] }] }],
      },
    ]);
    const xml = await extractDocumentXml(doc, "ltr");
    // docx always includes one baseline numbering entry regardless of how
    // many lists are registered (confirmed via scripts/verification/docx-spike.ts too —
    // 2 registered lists produced 3 <w:num> entries there as well), so the
    // robust check is that the two lists IN THE DOCUMENT reference two
    // DISTINCT numId values, not an exact total count in numbering.xml.
    const numIds = [...xml.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]);
    expect(numIds).toHaveLength(2);
    expect(numIds[0]).not.toBe(numIds[1]);
  });
});

describe("createDocxDocument — blockquote and edge cases", () => {
  test("blockquote content is preserved as indented paragraphs", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Quoted text" }] }],
        },
      ]),
      "ltr"
    );
    expect(xml).toContain("Quoted text");
    expect(xml).toContain("<w:ind");
  });

  test("an empty document produces a valid (if empty) docx without throwing", async () => {
    const buffer = await Packer.toBuffer(createDocxDocument(docWith([]), "ltr"));
    expect(buffer.length).toBeGreaterThan(0);
  });

  test("an unsupported node type (e.g. a table stub) doesn't throw — walks children defensively", async () => {
    const doc = docWith([
      {
        type: "table",
        content: [{ type: "paragraph", content: [{ type: "text", text: "cell content" }] }],
      },
    ]);
    const xml = await extractDocumentXml(doc, "ltr");
    expect(xml).toContain("cell content");
  });
});

describe("buildDocxBlob", () => {
  test("resolves to a Blob", async () => {
    const blob = await buildDocxBlob(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "test" }] }]),
      "ltr"
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});

// v1.1 Phase 1 (2026-08-09): professional page layout + corrected
// heading hierarchy. Font assignments (FONT_RTL/FONT_LTR) deliberately
// untouched — verified separately below that they remain unchanged.
describe("createDocxDocument — v1.1 Phase 1: page layout", () => {
  test("sets A4 page size", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "test" }] }]),
      "ltr"
    );
    expect(xml).toContain('<w:pgSz w:w="11906" w:h="16838"');
  });

  test("sets 1-inch (1440 twip) margins on all four sides", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "test" }] }]),
      "ltr"
    );
    expect(xml).toContain('w:top="1440"');
    expect(xml).toContain('w:bottom="1440"');
    expect(xml).toContain('w:left="1440"');
    expect(xml).toContain('w:right="1440"');
  });

  test("applies paragraph/line spacing to a plain paragraph", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "test" }] }]),
      "ltr"
    );
    expect(xml).toContain("<w:spacing");
    expect(xml).toContain('w:line="360"');
  });

  test("applies the same spacing to headings, blockquotes, and list items too", async () => {
    const xml = await extractDocumentXml(
      docWith([
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "H" }] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Q" }] }] },
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "L" }] }] }],
        },
      ]),
      "ltr"
    );
    // 4 paragraphs total (heading, blockquote line, list item) should
    // each carry their own <w:spacing> — a simple count check confirms
    // it's applied broadly, not just to the first block.
    const spacingCount = (xml.match(/<w:spacing/g) ?? []).length;
    expect(spacingCount).toBeGreaterThanOrEqual(3);
  });
});

describe("createDocxDocument — v1.1 Phase 1: heading hierarchy fix", () => {
  test("H3 maps to Heading3 style (previously silently collapsed to Heading1)", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "H3" }] }]),
      "ltr"
    );
    expect(xml).toContain('w:val="Heading3"');
    expect(xml).not.toContain('w:val="Heading1"');
  });

  test("H4 maps to Heading4 style", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "H4" }] }]),
      "ltr"
    );
    expect(xml).toContain('w:val="Heading4"');
  });

  test("H1 and H2 still map correctly (no regression)", async () => {
    const xml = await extractDocumentXml(
      docWith([
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "H1" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "H2" }] },
      ]),
      "ltr"
    );
    expect(xml).toContain('w:val="Heading1"');
    expect(xml).toContain('w:val="Heading2"');
  });

  test("an unrecognized level (5) falls back to Heading4, not Heading1", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "heading", attrs: { level: 5 }, content: [{ type: "text", text: "H5" }] }]),
      "ltr"
    );
    expect(xml).toContain('w:val="Heading4"');
  });
});

describe("createDocxDocument — v1.1 Phase 1: fonts unchanged (explicit regression guard)", () => {
  test("RTL still uses Noto Nastaliq Urdu, LTR still uses Calibri", async () => {
    const rtlXml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "متن" }] }]),
      "rtl"
    );
    const ltrXml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "text" }] }]),
      "ltr"
    );
    expect(rtlXml).toContain("Noto Nastaliq Urdu");
    expect(ltrXml).toContain("Calibri");
  });
});
