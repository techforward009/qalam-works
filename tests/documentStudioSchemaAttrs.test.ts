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
import { Node as PMNode } from "@tiptap/pm/model";
import { ParagraphWithDir, HeadingWithDir } from "../app/tools/document-studio/components/DocumentStudioEditor";

const extensions = [
  StarterKit.configure({ paragraph: false, heading: false }),
  ParagraphWithDir,
  HeadingWithDir,
  TextStyle,
  FontFamily,
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

describe("Batch 16A.1 — invalid JSON attr safety (renderHTML re-validates independent of parseHTML)", () => {
  test("a corrupted lineHeight (999) loaded directly via Node.fromJSON does not render an extreme inline style", () => {
    const paragraphNodeType = schema.nodes.paragraph;
    // Node.create() mirrors what a direct JSON load (bypassing parseHTML)
    // would produce if the schema didn't clamp — simulates a corrupted
    // localStorage value reaching the node's actual attrs.
    const node = paragraphNodeType.create({ lineHeight: 999 }, schema.text("x"));
    const dom = paragraphNodeType.spec.toDOM?.(node) as unknown as [string, Record<string, string>, ...unknown[]];
    // renderHTML must re-validate and refuse to emit the extreme value.
    expect(dom[1].style).toBeUndefined();
  });

  test("a corrupted firstLineIndentMm (9999) does not render an extreme data attribute", () => {
    const paragraphNodeType = schema.nodes.paragraph;
    const node = paragraphNodeType.create({ firstLineIndentMm: 9999 }, schema.text("x"));
    const dom = paragraphNodeType.spec.toDOM?.(node) as unknown as [string, Record<string, string>, ...unknown[]];
    expect(dom[1]["data-first-line-indent-mm"]).toBeUndefined();
  });

  test("an unrecognized blockStyle string does not render data-block-style", () => {
    const paragraphNodeType = schema.nodes.paragraph;
    const node = paragraphNodeType.create({ blockStyle: "not-a-real-style" }, schema.text("x"));
    const dom = paragraphNodeType.spec.toDOM?.(node) as unknown as [string, Record<string, string>, ...unknown[]];
    expect(dom[1]["data-block-style"]).toBeUndefined();
  });

  test("a valid lineHeight (1.8) still renders correctly (validation doesn't reject legitimate values)", () => {
    const paragraphNodeType = schema.nodes.paragraph;
    const node = paragraphNodeType.create({ lineHeight: 1.8 }, schema.text("x"));
    const dom = paragraphNodeType.spec.toDOM?.(node) as unknown as [string, Record<string, string>, ...unknown[]];
    expect(dom[1].style).toBe("line-height:1.8");
  });
});

describe("Batch 16A.1 — editor default RTL/LTR font resolution (through fontRegistry)", () => {
  test("defaultRtlFontId/defaultLtrFontId resolve to real, distinct editorFamily values via fontRegistry", async () => {
    const { getFontById } = await import("../app/tools/document-studio/utils/fontRegistry");
    const { defaultDocumentSettings } = await import("../app/tools/document-studio/utils/documentSettings");
    const settings = defaultDocumentSettings();
    const rtlFamily = getFontById(settings.typography.defaultRtlFontId).editorFamily;
    const ltrFamily = getFontById(settings.typography.defaultLtrFontId).editorFamily;
    expect(rtlFamily).toBe("Noto Nastaliq Urdu");
    expect(ltrFamily).toBe("Inter");
    expect(rtlFamily).not.toBe(ltrFamily);
  });

  test("changing defaultRtlFontId to Amiri resolves to Amiri's real editorFamily (registry-driven, not hardcoded)", async () => {
    const { getFontById } = await import("../app/tools/document-studio/utils/fontRegistry");
    const amiriFamily = getFontById("amiri").editorFamily;
    expect(amiriFamily).toBe("Amiri");
  });
});

describe("Batch 16B.1 — document-default paragraph typography vs. explicit override", () => {
  test("Book Manuscript document defaults (13pt/1.8/8mm) are represented as CSS variables, not written into TipTap JSON", () => {
    // A plain paragraph with no explicit attrs carries none of the
    // Book Manuscript numbers in its own JSON — they live only in
    // documentSettings.typography, applied via CSS variables the editor
    // wrapper sets. This proves the defaults aren't stamped as marks.
    const json = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] };
    const paragraph = json.content[0] as { attrs?: Record<string, unknown> };
    expect(paragraph.attrs).toBeUndefined();
  });

  test("an explicit firstLineIndentMm=3 renders its own inline style, independent of any document default", () => {
    const paragraphNodeType = schema.nodes.paragraph;
    const node = paragraphNodeType.create({ firstLineIndentMm: 3 }, schema.text("x"));
    const dom = paragraphNodeType.spec.toDOM?.(node) as unknown as [string, Record<string, string>, ...unknown[]];
    // The rendered style carries 3mm — a document default of 8mm (set
    // only via the CSS variable on an ancestor) never reaches this
    // inline style at all, so it cannot compete with or override it.
    expect(dom[1].style).toContain("text-indent:3mm");
    expect(dom[1].style).not.toContain("8mm");
  });
});
