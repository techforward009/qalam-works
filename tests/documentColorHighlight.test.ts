import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { Packer } from "docx";
import JSZip from "jszip";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { applyHighlight, applyTextColor, clearHighlight } from "../app/tools/document-studio/utils/documentCommands";
import { resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";
import { buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import { createDocxDocument } from "../app/tools/document-studio/utils/buildDocxDocument";
import { normalizeSafeHex } from "../app/tools/document-studio/utils/studioColors";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
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

const interFace: PdfFontFace = {
  familyName: "Inter",
  regularSources: ["inter"],
  complete: true,
  declaredRegular: 1,
  declaredBold: 0,
  loadedRegular: 1,
  loadedBold: 0,
};

describe("normalizeSafeHex", () => {
  it("accepts hex and rejects arbitrary CSS", () => {
    expect(normalizeSafeHex("#1a3a2a")).toBe("#1A3A2A");
    expect(normalizeSafeHex("red")).toBeNull();
    expect(normalizeSafeHex("url(javascript:alert(1))")).toBeNull();
    expect(normalizeSafeHex("#fff")).toBeNull();
  });
});

describe("text color and highlight commands", () => {
  it("applying text color creates canonical textStyle color", () => {
    const ed = make({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Hello" }] }],
    });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    applyTextColor(ed, "#1A3A2A");
    const json = ed.getJSON() as DocNode;
    const marks = json.content?.[0]?.content?.[0]?.marks ?? [];
    const style = marks.find((m) => m.type === "textStyle");
    expect(style?.attrs?.color).toMatch(/#1A3A2A/i);
  });

  it("clearing color removes only color", () => {
    const ed = make({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "ltr" },
        content: [{
          type: "text",
          text: "Hello",
          marks: [
            { type: "bold" },
            { type: "textStyle", attrs: { color: "#991B1B", fontFamily: "Inter", fontSize: "14pt" } },
          ],
        }],
      }],
    });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    applyTextColor(ed, "");
    const json = ed.getJSON() as DocNode;
    const marks = json.content?.[0]?.content?.[0]?.marks ?? [];
    expect(marks.some((m) => m.type === "bold")).toBe(true);
    const style = marks.find((m) => m.type === "textStyle");
    expect(style?.attrs?.color == null || style?.attrs?.color === "").toBe(true);
    expect(style?.attrs?.fontFamily).toBe("Inter");
  });

  it("applying highlight preserves other marks", () => {
    const ed = make({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [{
          type: "text",
          text: "اردو",
          marks: [{ type: "italic" }, { type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq", fontSize: "16pt" } }],
        }],
      }],
    });
    ed.commands.setTextSelection({ from: 1, to: 5 });
    applyHighlight(ed, "#FEF3C7");
    const json = ed.getJSON() as DocNode;
    const marks = json.content?.[0]?.content?.[0]?.marks ?? [];
    expect(marks.some((m) => m.type === "italic")).toBe(true);
    expect(marks.some((m) => m.type === "highlight")).toBe(true);
    const style = marks.find((m) => m.type === "textStyle");
    expect(style?.attrs?.fontFamily).toBe("Jameel Noori Nastaleeq");
  });

  it("clearing highlight removes highlight only", () => {
    const ed = make({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "ltr" },
        content: [{
          type: "text",
          text: "Hi",
          marks: [{ type: "bold" }, { type: "highlight", attrs: { color: "#DBEAFE" } }],
        }],
      }],
    });
    ed.commands.setTextSelection({ from: 1, to: 3 });
    clearHighlight(ed);
    const json = ed.getJSON() as DocNode;
    const marks = json.content?.[0]?.content?.[0]?.marks ?? [];
    expect(marks.some((m) => m.type === "highlight")).toBe(false);
    expect(marks.some((m) => m.type === "bold")).toBe(true);
  });

  it("mixed selection reports mixed color and highlight", () => {
    const ed = make({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "ltr" },
        content: [
          { type: "text", text: "A", marks: [{ type: "textStyle", attrs: { color: "#111111" } }] },
          { type: "text", text: "B", marks: [{ type: "textStyle", attrs: { color: "#991B1B" } }] },
        ],
      }],
    });
    ed.commands.setTextSelection({ from: 1, to: 3 });
    const ui = resolveActiveToolbarFormatting(ed, defaultDocumentSettings(), "ltr");
    expect(ui.mixed.color).toBe(true);
  });

  it("collapsed selection uses stored color mark", () => {
    const ed = make({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Hello" }] }],
    });
    ed.commands.setTextSelection(6);
    applyTextColor(ed, "#1E3A8A");
    const ui = resolveActiveToolbarFormatting(ed, defaultDocumentSettings(), "ltr");
    expect(ui.color).toBe("#1E3A8A");
  });
});

describe("PDF color fidelity", () => {
  it("emits validated color and highlight and rejects unsafe CSS", () => {
    const doc: DocNode = {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "ltr" },
        content: [{
          type: "text",
          text: "Hello",
          marks: [
            { type: "textStyle", attrs: { color: "#1A3A2A", fontFamily: "Inter", fontSize: "14pt" } },
            { type: "highlight", attrs: { color: "#FEF3C7" } },
          ],
        }],
      }],
    };
    const html = buildPdfHtml(doc, "ltr", { faces: [interFace] });
    expect(html.html).toContain("color:#1A3A2A;");
    expect(html.html).toContain("background-color:#FEF3C7;");
    expect(html.html).toContain("font-size:14pt;");
    const unsafe: DocNode = {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "ltr" },
        content: [{ type: "text", text: "X", marks: [{ type: "textStyle", attrs: { color: "expression(alert(1))" } }] }],
      }],
    };
    const bad = buildPdfHtml(unsafe, "ltr", { faces: [interFace] });
    expect(bad.html).not.toContain("expression(");
    expect(bad.html).not.toContain("color:expression");
  });

  it("keeps Urdu RTL and English LTR with color", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "اردو", marks: [{ type: "textStyle", attrs: { color: "#1A3A2A" } }] }] },
        { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "English", marks: [{ type: "textStyle", attrs: { color: "#1E3A8A" } }] }] },
      ],
    };
    const html = buildPdfHtml(doc, "rtl", { faces: [interFace] });
    expect(html.html).toContain('dir="rtl"');
    expect(html.html).toContain('dir="ltr"');
    expect(html.html).toContain("color:#1A3A2A;");
    expect(html.html).toContain("color:#1E3A8A;");
  });
});

describe("DOCX color fidelity", () => {
  it("writes text color and highlight shading", async () => {
    const doc: DocNode = {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "ltr" },
        content: [{
          type: "text",
          text: "Hello",
          marks: [
            { type: "textStyle", attrs: { color: "#1A3A2A", fontFamily: "Inter" } },
            { type: "highlight", attrs: { color: "#FEF3C7" } },
          ],
        }],
      }],
    };
    const buffer = await Packer.toBuffer(createDocxDocument(doc, "ltr"));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("text");
    expect(xml).toContain("1A3A2A");
    expect(xml).toContain("FEF3C7");
  });
});
