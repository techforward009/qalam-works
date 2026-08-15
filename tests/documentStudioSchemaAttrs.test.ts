// Batch 16A — real schema round-trip tests. Uses the ACTUAL production
// ParagraphWithDir/HeadingWithDir extensions (exported from
// DocumentStudioEditor.tsx for testability) built into a real TipTap
// schema via getSchema() + real ProseMirror Node.fromJSON()/toJSON() —
// not a manually re-implemented/guessed schema. This directly proves the
// core Batch 16A bug fix: previously `blockStyle` (and the other new
// attrs) were being set via updateAttributes() without being declared in
// the schema, so TipTap silently dropped them on JSON serialization —
// they never survived a save/reload. This test would have failed before
// the fix (the attrs would be missing from the round-tripped JSON) and
// passes now.

import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontFamily } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Node as PMNode } from "@tiptap/pm/model";
import { ParagraphWithDir, HeadingWithDir } from "../app/tools/document-studio/components/DocumentStudioEditor";

const extensions = [
  StarterKit.configure({ paragraph: false, heading: false }),
  ParagraphWithDir,
  HeadingWithDir,
  TextStyle,
  FontFamily,
  Underline,
];
const schema = getSchema(extensions);

function roundTrip(json: Record<string, unknown>) {
  return PMNode.fromJSON(schema, json).toJSON();
}

describe("Batch 16A — paragraph/heading schema attrs really persist (real TipTap schema)", () => {
  test("all 7 new paragraph attrs survive a real schema round-trip", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: {
            dir: "rtl",
            blockStyle: "title",
            lineHeight: 1.8,
            firstLineIndentMm: 8,
            indentStartMm: 10,
            indentEndMm: 5,
            spaceBeforePt: 12,
            spaceAfterPt: 6,
          },
          content: [{ type: "text", text: "test" }],
        },
      ],
    };
    const result = roundTrip(json) as { content: [{ attrs: Record<string, unknown> }] };
    const attrs = result.content[0].attrs;
    expect(attrs.blockStyle).toBe("title");
    expect(attrs.lineHeight).toBe(1.8);
    expect(attrs.firstLineIndentMm).toBe(8);
    expect(attrs.indentStartMm).toBe(10);
    expect(attrs.indentEndMm).toBe(5);
    expect(attrs.spaceBeforePt).toBe(12);
    expect(attrs.spaceAfterPt).toBe(6);
  });

  test("heading attrs (lineHeight, spaceBeforePt, spaceAfterPt) also survive round-trip", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, dir: "ltr", lineHeight: 2, spaceBeforePt: 24, spaceAfterPt: 12 },
          content: [{ type: "text", text: "Heading" }],
        },
      ],
    };
    const result = roundTrip(json) as { content: [{ attrs: Record<string, unknown> }] };
    const attrs = result.content[0].attrs;
    expect(attrs.lineHeight).toBe(2);
    expect(attrs.spaceBeforePt).toBe(24);
    expect(attrs.spaceAfterPt).toBe(12);
  });

  test("a paragraph with no explicit new attrs defaults blockStyle/lineHeight/indent/spacing to null (no forced values)", () => {
    const json = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "plain" }] }] };
    const result = roundTrip(json) as { content: [{ attrs: Record<string, unknown> }] };
    const attrs = result.content[0].attrs;
    expect(attrs.blockStyle).toBeNull();
    expect(attrs.lineHeight).toBeNull();
    expect(attrs.firstLineIndentMm).toBeNull();
  });

  test("blockStyle renders as data-block-style in HTML (parseHTML/renderHTML round-trip)", () => {
    const paragraphNodeType = schema.nodes.paragraph;
    const node = paragraphNodeType.create({ blockStyle: "subtitle" }, schema.text("hi"));
    const dom = paragraphNodeType.spec.toDOM?.(node) as unknown as [string, Record<string, string>, ...unknown[]];
    expect(dom[1]["data-block-style"]).toBe("subtitle");
  });
});

describe("Batch 16A — normalizeDocumentNodes (Standardize) preserves all formatting attrs", () => {
  test("real TipTap JSON with blockStyle/lineHeight/indent/spacing/fontFamily/fontSize/underline/dir/textAlign survives Standardize unchanged (only text content may change)", async () => {
    const { normalizeDocumentNodes } = await import("../app/tools/document-studio/utils/normalizeDocumentNodes");

    // Built via the REAL schema (not a manually invented DocNode) so this
    // is genuinely representative of what the editor would actually
    // produce.
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: {
            dir: "rtl",
            blockStyle: "title",
            lineHeight: 1.8,
            firstLineIndentMm: 8,
            indentStartMm: 10,
            indentEndMm: 5,
            spaceBeforePt: 12,
            spaceAfterPt: 6,
            textAlign: "center",
          },
          content: [
            {
              type: "text",
              text: "علي نے كتاب پڑھی",
              marks: [
                { type: "textStyle", attrs: { fontFamily: "Amiri", fontSize: "20pt" } },
                { type: "underline" },
              ],
            },
          ],
        },
      ],
    };
    const realDoc = roundTrip(json) as typeof json;

    const result = normalizeDocumentNodes(realDoc as never, "ur");
    const outParagraph = result.document.content![0];

    // All attrs — including the ones this batch just added — must be
    // completely untouched by Standardize (only text content normalizes).
    expect(outParagraph.attrs).toEqual(realDoc.content[0].attrs);
    // Marks (fontFamily/fontSize/underline) must also survive untouched.
    expect(outParagraph.content![0].marks).toEqual(realDoc.content[0].content[0].marks);
    // The text itself DID get normalized (علي → علی is the whole point of Standardize).
    expect(outParagraph.content![0].text).toContain("علی");
  });
});
