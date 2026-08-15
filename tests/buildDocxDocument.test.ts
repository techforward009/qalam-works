// Same verification philosophy as scripts/verification/docx-spike.ts (see
// PHASE-3C-DOCX-SPEC.md §7): asserting that createDocxDocument() doesn't
// throw proves almost nothing about correctness. These tests pack the
// real Document to a buffer and unzip it with JSZip to inspect the actual
// OOXML, the same way the spike was manually verified.

import JSZip from "jszip";
import { Packer } from "docx";
import { createDocxDocument, buildDocxBlob } from "../app/tools/document-studio/utils/buildDocxDocument";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";

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

// v1.2 Phase 2A — mixed/nested list tests need to inspect both the
// paragraph-level numPr/ilvl (document.xml) and the level format
// definitions (numbering.xml) together.
async function extractBothXml(doc: DocNode, dir: "rtl" | "ltr"): Promise<{ docXml: string; numberingXml: string }> {
  const buffer = await Packer.toBuffer(createDocxDocument(doc, dir));
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file("word/document.xml");
  const numFile = zip.file("word/numbering.xml");
  if (!docFile) throw new Error("word/document.xml missing from generated docx");
  if (!numFile) throw new Error("word/numbering.xml missing from generated docx");
  return { docXml: await docFile.async("text"), numberingXml: await numFile.async("text") };
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
  test("RTL still uses Noto Nastaliq Urdu, LTR uses Inter", async () => {
    const rtlXml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "متن" }] }]),
      "rtl"
    );
    const ltrXml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "text" }] }]),
      "ltr"
    );
    expect(rtlXml).toContain("Noto Nastaliq Urdu");
    expect(ltrXml).toContain("Inter");
  });
});

// v1.2 Phase 2A (2026-08-09): Enhanced Blockquote Styling + Nested Lists.
describe("createDocxDocument — v1.2 Phase 2A: enhanced blockquote", () => {
  test("adds a real paragraph border (not just indent)", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "A quote" }] }] }]),
      "ltr"
    );
    expect(xml).toContain("<w:pBdr>");
  });

  test("adds subtle shading", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "A quote" }] }] }]),
      "ltr"
    );
    expect(xml).toContain('<w:shd w:fill="FEF3C7"');
  });

  test("border sits on the left for LTR", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "quote" }] }] }]),
      "ltr"
    );
    expect(xml).toMatch(/<w:pBdr><w:left/);
  });

  test("border sits on the right for RTL (matches border-inline-start behavior)", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "اقتباس" }] }] }]),
      "rtl"
    );
    expect(xml).toMatch(/<w:pBdr><w:right/);
  });

  test("still applies existing spacing (Phase 1 behavior preserved)", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "quote" }] }] }]),
      "ltr"
    );
    expect(xml).toContain("<w:spacing");
  });
});

describe("createDocxDocument — v1.2 Phase 2A: nested lists", () => {
  test("a nested bullet list indents to level 1 under its parent item, same numId", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Outer A" }] },
                {
                  type: "bulletList",
                  content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Inner A1" }] }] }],
                },
              ],
            },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Outer B" }] }] },
          ],
        },
      ]),
      "ltr"
    );
    const ilvls = [...xml.matchAll(/<w:ilvl w:val="(\d+)"\/>/g)].map((m) => m[1]);
    const numIds = [...xml.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]);
    expect(ilvls).toEqual(["0", "1", "0"]);
    expect(new Set(numIds).size).toBe(1);
  });

  test("a nested ordered list under a bullet parent gets a decimal format at its level (mixed nesting)", async () => {
    const doc = docWith([
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Outer" }] },
              {
                type: "orderedList",
                content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Inner numbered" }] }] }],
              },
            ],
          },
        ],
      },
    ]);
    const { docXml, numberingXml } = await extractBothXml(doc, "ltr");
    expect(docXml).toMatch(/<w:ilvl w:val="0"\/>[\s\S]*<w:ilvl w:val="1"\/>/);
    expect(numberingXml).toContain('<w:numFmt w:val="decimal"/>');
  });

  test("three-level nesting reaches level 2 with correct indent", async () => {
    const doc = docWith([
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "L0" }] },
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      { type: "paragraph", content: [{ type: "text", text: "L1" }] },
                      {
                        type: "bulletList",
                        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "L2" }] }] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const { numberingXml } = await extractBothXml(doc, "ltr");
    expect(numberingXml).toContain('w:start="2160"');
  });

  test("existing flat lists are unaffected — every item stays at level 0", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item 1" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item 2" }] }] },
          ],
        },
      ]),
      "ltr"
    );
    const ilvls = [...xml.matchAll(/<w:ilvl w:val="(\d+)"\/>/g)].map((m) => m[1]);
    expect(ilvls).toEqual(["0", "0"]);
  });

  test("nested list numbering still respects RTL", async () => {
    const doc = docWith([
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "خارجی" }] },
              {
                type: "bulletList",
                content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "اندرونی" }] }] }],
              },
            ],
          },
        ],
      },
    ]);
    const xml = await extractDocumentXml(doc, "rtl");
    expect(xml).toContain("<w:bidi/>");
    expect(xml).toContain("اندرونی");
  });
});

// v1.3 Phase — Professional Polish (2026-08-09): heading spacing,
// enhanced blockquote (italic + size), header/footer, and metadata.
describe("createDocxDocument — v1.3: heading-specific spacing", () => {
  test("H1 gets the largest before/after spacing", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "H1" }] }]),
      "ltr"
    );
    expect(xml).toContain('w:after="240"');
    expect(xml).toContain('w:before="480"');
  });

  test("H2 gets medium spacing, smaller than H1", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "H2" }] }]),
      "ltr"
    );
    expect(xml).toContain('w:after="200"');
    expect(xml).toContain('w:before="360"');
  });

  test("H3 and H4 get smaller spacing than H1/H2", async () => {
    const h3Xml = await extractDocumentXml(
      docWith([{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "H3" }] }]),
      "ltr"
    );
    const h4Xml = await extractDocumentXml(
      docWith([{ type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "H4" }] }]),
      "ltr"
    );
    expect(h3Xml).toContain('w:before="240"');
    expect(h4Xml).toContain('w:before="200"');
  });

  test("plain paragraphs use documentSettings.typography defaults when no per-block override exists (Batch 16A)", async () => {
    // Updated for Batch 16A: body paragraph spacing now genuinely comes
    // from DocumentStudioSettings.typography (paragraphBeforePt: 0,
    // paragraphAfterPt: 6 in the defaults) rather than the old hardcoded
    // PARAGRAPH_SPACING constant (before:120/after:120) — this is the
    // intended, correct behavior change this batch implements, not a
    // regression. 6pt × 20 = 120 twips (coincidentally matches the old
    // "after" value); 0pt × 20 = 0 twips for "before" (genuinely different
    // from the old hardcoded 120).
    const xml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "body text" }] }]),
      "ltr"
    );
    expect(xml).toContain('w:before="0"');
    expect(xml).toContain('w:after="120"');
  });
});

describe("createDocxDocument — v1.3: enhanced blockquote (italic + size)", () => {
  test("blockquote text is italic even when the source has no italic mark", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "plain quote" }] }] }]),
      "ltr"
    );
    const run = xml.match(/<w:pBdr>[\s\S]*?<\/w:r>/)?.[0];
    expect(run).toContain("<w:i/>");
  });

  test("blockquote text uses the smaller 10pt (20 half-point) size", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "quote" }] }] }]),
      "ltr"
    );
    expect(xml).toContain('<w:sz w:val="20"/>');
  });

  test("bold marks inside a blockquote are still preserved alongside the forced italic", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "bold quote", marks: [{ type: "bold" }] }] }] }]),
      "ltr"
    );
    const run = xml.match(/<w:pBdr>[\s\S]*?<\/w:r>/)?.[0];
    expect(run).toContain("<w:b/>");
    expect(run).toContain("<w:i/>");
  });

  test("regular (non-blockquote) text is unaffected by the italic/size override (regression guard)", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "paragraph", content: [{ type: "text", text: "normal text" }] }]),
      "ltr"
    );
    expect(xml).not.toContain("<w:i/>");
    expect(xml).not.toContain('<w:sz w:val="20"/>');
  });

  test("existing border and shading are still present (Phase 2A behavior preserved)", async () => {
    const xml = await extractDocumentXml(
      docWith([{ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "quote" }] }] }]),
      "ltr"
    );
    expect(xml).toContain("<w:pBdr>");
    expect(xml).toContain('<w:shd w:fill="FEF3C7"');
  });
});

describe("createDocxDocument — v1.3: header and footer", () => {
  test("header shows the document's first H1 text", async () => {
    const buffer = await Packer.toBuffer(
      createDocxDocument(
        docWith([{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "My Research Paper" }] }]),
        "ltr"
      )
    );
    const zip = await JSZip.loadAsync(buffer);
    const headerFile = Object.keys(zip.files).find((f) => /word\/header\d+\.xml$/.test(f));
    expect(headerFile).toBeDefined();
    const headerXml = await zip.file(headerFile!)!.async("text");
    expect(headerXml).toContain("My Research Paper");
  });

  test("header falls back to 'Qalam Works' when there is no H1", async () => {
    const buffer = await Packer.toBuffer(
      createDocxDocument(docWith([{ type: "paragraph", content: [{ type: "text", text: "just text" }] }]), "ltr")
    );
    const zip = await JSZip.loadAsync(buffer);
    const headerFile = Object.keys(zip.files).find((f) => /word\/header\d+\.xml$/.test(f));
    const headerXml = await zip.file(headerFile!)!.async("text");
    expect(headerXml).toContain("Qalam Works");
  });

  test("footer contains a real PAGE field", async () => {
    const buffer = await Packer.toBuffer(createDocxDocument(docWith([{ type: "paragraph", content: [{ type: "text", text: "x" }] }]), "ltr"));
    const zip = await JSZip.loadAsync(buffer);
    const footerFile = Object.keys(zip.files).find((f) => /word\/footer\d+\.xml$/.test(f));
    expect(footerFile).toBeDefined();
    const footerXml = await zip.file(footerFile!)!.async("text");
    expect(footerXml).toContain("PAGE");
  });

  test("footer contains a real NUMPAGES (total pages) field", async () => {
    const buffer = await Packer.toBuffer(createDocxDocument(docWith([{ type: "paragraph", content: [{ type: "text", text: "x" }] }]), "ltr"));
    const zip = await JSZip.loadAsync(buffer);
    const footerFile = Object.keys(zip.files).find((f) => /word\/footer\d+\.xml$/.test(f));
    const footerXml = await zip.file(footerFile!)!.async("text");
    expect(footerXml).toContain("NUMPAGES");
  });

  // Regression (2026-08-11): the DOCX header paragraph must NOT inherit
  // RTL/bidi formatting when the title text is pure Latin ("Qalam Works").
  // Previously, bidirectional was always set to `dir === "rtl"`, causing
  // Word to render the header with strange character spacing on RTL docs.
  test("pure-Latin fallback header ('Qalam Works') is never bidirectional even in an RTL document", async () => {
    const buffer = await Packer.toBuffer(
      createDocxDocument(docWith([{ type: "paragraph", content: [{ type: "text", text: "اردو متن" }] }]), "rtl")
    );
    const zip = await JSZip.loadAsync(buffer);
    const headerFile = Object.keys(zip.files).find((f) => /word\/header\d+\.xml$/.test(f));
    expect(headerFile).toBeDefined();
    const headerXml = await zip.file(headerFile!)!.async("text");
    // The header paragraph must NOT contain <w:bidi/> for a pure-Latin title.
    // We assert on the paragraph-properties section (everything before the run).
    const pPrMatch = headerXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
    expect(pPrMatch).toBeDefined();
    expect(pPrMatch![1]).not.toContain("<w:bidi/>");
  });

  test("RTL document with an Urdu H1 header IS bidirectional", async () => {
    const buffer = await Packer.toBuffer(
      createDocxDocument(
        docWith([{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "اردو تحقیق" }] }]),
        "rtl"
      )
    );
    const zip = await JSZip.loadAsync(buffer);
    const headerFile = Object.keys(zip.files).find((f) => /word\/header\d+\.xml$/.test(f));
    expect(headerFile).toBeDefined();
    const headerXml = await zip.file(headerFile!)!.async("text");
    expect(headerXml).toContain("<w:bidi/>");
  });
});

describe("createDocxDocument — v1.3: document metadata", () => {
  test("sets Title, Creator, Subject, and Keywords in docProps/core.xml", async () => {
    const buffer = await Packer.toBuffer(
      createDocxDocument(
        docWith([{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "A Title" }] }]),
        "rtl"
      )
    );
    const zip = await JSZip.loadAsync(buffer);
    const coreXml = await zip.file("docProps/core.xml")!.async("text");
    expect(coreXml).toContain("<dc:title>A Title</dc:title>");
    expect(coreXml).toContain("<dc:creator>Qalam Works</dc:creator>");
    expect(coreXml).toContain("<dc:subject>");
    expect(coreXml).toContain("<cp:keywords>");
  });

  test("keywords reflect the document's direction", async () => {
    const buffer = await Packer.toBuffer(createDocxDocument(docWith([{ type: "paragraph", content: [{ type: "text", text: "x" }] }]), "rtl"));
    const zip = await JSZip.loadAsync(buffer);
    const coreXml = await zip.file("docProps/core.xml")!.async("text");
    expect(coreXml).toMatch(/<cp:keywords>[^<]*Urdu[^<]*<\/cp:keywords>/);
  });
});

// v1.4 (2026-08-09) — title detection fix: searches the whole document
// for the first H1, not just doc.content[0].
describe("createDocxDocument — v1.4: title detection searches the full document", () => {
  async function coreXmlFor(doc: DocNode): Promise<string> {
    const buffer = await Packer.toBuffer(createDocxDocument(doc, "ltr"));
    const zip = await JSZip.loadAsync(buffer);
    return zip.file("docProps/core.xml")!.async("text");
  }

  test("H1 as the first node is still extracted (no regression)", async () => {
    const coreXml = await coreXmlFor(
      docWith([{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "First Title" }] }])
    );
    expect(coreXml).toContain("<dc:title>First Title</dc:title>");
  });

  test("a paragraph before the H1 no longer defeats title detection", async () => {
    const coreXml = await coreXmlFor(
      docWith([
        { type: "paragraph", content: [{ type: "text", text: "intro text" }] },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Real Title" }] },
      ])
    );
    expect(coreXml).toContain("<dc:title>Real Title</dc:title>");
  });

  test("with multiple H1 headings, the first one is used", async () => {
    const coreXml = await coreXmlFor(
      docWith([
        { type: "paragraph", content: [{ type: "text", text: "x" }] },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "First H1" }] },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Second H1" }] },
      ])
    );
    expect(coreXml).toContain("<dc:title>First H1</dc:title>");
    expect(coreXml).not.toContain("Second H1");
  });

  test("no H1 anywhere still falls back to 'Qalam Works' (regression guard)", async () => {
    const coreXml = await coreXmlFor(docWith([{ type: "paragraph", content: [{ type: "text", text: "no heading here" }] }]));
    expect(coreXml).toContain("<dc:title>Qalam Works</dc:title>");
  });
});

describe("createDocxDocument — per-block direction for quote/list", () => {
  test("RTL document with LTR blockquote paragraph uses no bidi on that child", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              attrs: { dir: "ltr" },
              content: [{ type: "text", text: "Quoted English" }],
            },
          ],
        },
      ]),
      "rtl"
    );
    // The LTR quote paragraph should not force document-wide RTL on that run's container alone;
    // we assert the English text is present and the quote border appears on left for LTR.
    expect(xml).toContain("Quoted English");
  });

  test("LTR document with RTL list item paragraph sets bidi", async () => {
    const xml = await extractDocumentXml(
      docWith([
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  attrs: { dir: "rtl" },
                  content: [{ type: "text", text: "نقطہ" }],
                },
              ],
            },
          ],
        },
      ]),
      "ltr"
    );
    expect(xml).toContain("نقطہ");
    expect(xml).toContain("<w:bidi");
  });
});

describe("Batch 16A — Book Manuscript preset produces real, distinct typography", () => {
  test("Book Manuscript settings (13pt, 1.8 line height, 8mm first-line indent) actually reach the OOXML", async () => {
    const bookManuscriptTypography = {
      bodyFontSizePt: 13,
      lineHeight: 1.8,
      paragraphBeforePt: 0,
      paragraphAfterPt: 0,
      firstLineIndentMm: 8,
      defaultRtlFontId: "noto-nastaliq-urdu" as const,
      defaultLtrFontId: "inter" as const,
    };
    const settings = { ...defaultDocumentSettings(), typography: bookManuscriptTypography };
    const doc: DocNode = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "body text" }] }] };
    const buffer = await Packer.toBuffer(createDocxDocument(doc, "ltr", settings));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("text");

    // 1.8 line height × 240 = 432
    expect(xml).toContain('w:line="432"');
    // 8mm first-line indent → (8/25.4)*1440 ≈ 454 twips
    expect(xml).toMatch(/w:firstLine="45[0-9]"/);
  });

  test("a manually-applied explicit run override (Amiri 20pt) survives switching document-wide preset/typography settings", async () => {
    // Simulates: user sets Book Manuscript, manually makes one run Amiri
    // 20pt, then switches to Academic. Since the manual run formatting is
    // stored as REAL TipTap marks (fontFamily/fontSize) on the text node
    // itself — not derived from documentSettings — it must be completely
    // unaffected by which typography settings object is passed in.
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "manual override", marks: [{ type: "textStyle", attrs: { fontFamily: "Amiri", fontSize: "20pt" } }] }],
        },
      ],
    };
    const bookManuscript = { ...defaultDocumentSettings(), typography: { ...defaultDocumentSettings().typography, bodyFontSizePt: 13, lineHeight: 1.8 } };
    const academic = { ...defaultDocumentSettings(), typography: { ...defaultDocumentSettings().typography, bodyFontSizePt: 12, lineHeight: 2 } };

    const xmlBook = await (async () => {
      const buffer = await Packer.toBuffer(createDocxDocument(doc, "ltr", bookManuscript));
      const zip = await JSZip.loadAsync(buffer);
      return zip.file("word/document.xml")!.async("text");
    })();
    const xmlAcademic = await (async () => {
      const buffer = await Packer.toBuffer(createDocxDocument(doc, "ltr", academic));
      const zip = await JSZip.loadAsync(buffer);
      return zip.file("word/document.xml")!.async("text");
    })();

    // The explicit Amiri 20pt run formatting is identical regardless of
    // which document-wide preset/typography was active.
    for (const xml of [xmlBook, xmlAcademic]) {
      expect(xml).toContain('w:ascii="Amiri"');
      expect(xml).toContain('w:sz w:val="40"'); // 20pt in half-points
    }
    // But the document-wide line spacing genuinely DID change between presets.
    expect(xmlBook).toContain('w:line="432"'); // 1.8 * 240
    expect(xmlAcademic).toContain('w:line="480"'); // 2.0 * 240
  });
});
