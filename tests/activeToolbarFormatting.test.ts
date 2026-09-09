import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { MIXED_TOOLBAR_VALUE, resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

function make(doc: DocNode) {
  editor = new Editor({ extensions: createDocumentStudioExtensions(), content: doc });
  return editor;
}

const settings = defaultDocumentSettings();

describe("effective toolbar formatting", () => {
  it("default Normal body text uses bodyFontSizePt, document lineHeight, and RTL family", () => {
    const ed = make({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "اردو ڈیفالٹ" }] }],
    });
    ed.commands.setTextSelection(2);
    const ui = resolveActiveToolbarFormatting(ed, settings, "rtl");
    expect(ui.fontFamily).toBe("Noto Nastaliq Urdu");
    expect(ui.fontSizePt).toBe(12);
    expect(ui.lineHeight).toBe(1.5);
    expect(ui.blockStyle).toBe("normal");
    expect(ui.mixed.fontFamily).toBe(false);
  });

  it("explicit fontSize and lineHeight override document defaults", () => {
    const ed = make({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "rtl", lineHeight: 2 },
        content: [{ type: "text", text: "اردو جمیل", marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq", fontSize: "14pt" } }] }],
      }],
    });
    ed.commands.setTextSelection(2);
    const ui = resolveActiveToolbarFormatting(ed, settings, "rtl");
    expect(ui.fontFamily).toBe("Jameel Noori Nastaleeq");
    expect(ui.fontSizePt).toBe(14);
    expect(ui.lineHeight).toBe(2);
  });

  it("Title and Heading 1 show implied size and bold without adding a bold mark", () => {
    const title = make({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl", blockStyle: "title" }, content: [{ type: "text", text: "عنوان" }] }],
    });
    title.commands.setTextSelection(2);
    const titleUi = resolveActiveToolbarFormatting(title, settings, "rtl");
    expect(titleUi.blockStyle).toBe("title");
    expect(titleUi.fontSizePt).toBe(28);
    expect(titleUi.bold).toBe(true);
    expect(JSON.stringify(title.getJSON())).not.toContain('"type":"bold"');
    title.destroy();

    const heading = make({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 1, dir: "rtl" }, content: [{ type: "text", text: "سرخی" }] }],
    });
    heading.commands.setTextSelection(2);
    const headingUi = resolveActiveToolbarFormatting(heading, settings, "rtl");
    expect(headingUi.blockStyle).toBe("heading-1");
    expect(headingUi.fontSizePt).toBe(24);
    expect(headingUi.bold).toBe(true);
    expect(JSON.stringify(heading.getJSON())).not.toContain('"type":"bold"');
  });

  it("default LTR text uses Inter", () => {
    const ed = make({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Hello" }] }],
    });
    ed.commands.setTextSelection(2);
    expect(resolveActiveToolbarFormatting(ed, settings, "ltr").fontFamily).toBe("Inter");
  });

  it("mixed font and size selection does not pick one value", () => {
    const ed = make({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [
          { type: "text", text: "جمیل", marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq", fontSize: "14pt" } }] },
          { type: "text", text: "نوٹو", marks: [{ type: "textStyle", attrs: { fontFamily: "Noto Nastaliq Urdu", fontSize: "12pt" } }] },
        ],
      }],
    });
    ed.commands.selectAll();
    const ui = resolveActiveToolbarFormatting(ed, settings, "rtl");
    expect(ui.mixed.fontFamily).toBe(true);
    expect(ui.mixed.fontSize).toBe(true);
    expect(ui.fontFamily).toBe(MIXED_TOOLBAR_VALUE);
    expect(ui.fontSizePt).toBeNull();
  });

  it("reload of Jameel JSON still resolves Jameel + 14pt at the cursor", () => {
    const json: DocNode = {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [{ type: "text", text: "اردو جمیل", marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq", fontSize: "14pt" } }] }],
      }],
    };
    const first = make(json);
    const snapshot = first.getJSON();
    first.destroy();
    const reloaded = make(snapshot as DocNode);
    reloaded.commands.setTextSelection(2);
    const ui = resolveActiveToolbarFormatting(reloaded, settings, "rtl");
    expect(ui.fontFamily).toBe("Jameel Noori Nastaleeq");
    expect(ui.fontSizePt).toBe(14);
  });
});
