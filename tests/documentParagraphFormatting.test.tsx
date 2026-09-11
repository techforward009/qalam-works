/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Packer } from "docx";
import JSZip from "jszip";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import { createDocumentStudioExtensions, BLOCK_STYLE_EDITOR_CSS } from "../app/tools/document-studio/utils/documentSchema";
import { applyBlockStyle, applyParagraphDirection, applyDocumentDirection, applyFontSize, setAlign, transformPastedSlice } from "../app/tools/document-studio/utils/documentCommands";
import { detectParagraphDirection } from "../app/tools/document-studio/utils/paragraphDirection";
import { BLOCK_STYLE_IDS, BLOCK_STYLES } from "../app/tools/document-studio/utils/documentStyles";
import { defaultDocumentSettings, FONT_SIZE_OPTIONS_PT } from "../app/tools/document-studio/utils/documentSettings";
import { resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";
import { createDocxDocument } from "../app/tools/document-studio/utils/buildDocxDocument";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { Slice, Fragment } from "@tiptap/pm/model";

const editors: Editor[] = [];
const settings = defaultDocumentSettings();
function make(content = '<p dir="rtl">یہ کراچی ہے۔</p><p dir="ltr">This is Karachi.</p>') {
  const editor = new Editor({ extensions: createDocumentStudioExtensions(), content });
  editors.push(editor);
  editor.view.dispatch(editor.state.tr.setMeta("normalizeParagraphDirection", true));
  return editor;
}
afterEach(() => { cleanup(); editors.splice(0).forEach(editor => editor.destroy()); });

describe("semantic paragraph formatting", () => {
  it.each(BLOCK_STYLE_IDS)("preserves %s semantics and direction in DOCX and PDF HTML", async id => {
    const ed = make('<p>کراچی</p>');
    applyBlockStyle(ed, id);
    const doc = ed.getJSON();
    const zip = await JSZip.loadAsync(await Packer.toBuffer(createDocxDocument(doc, "rtl")));
    const xml = await zip.file("word/document.xml")!.async("string");
    const style = BLOCK_STYLES[id];
    expect(xml).toContain('<w:bidi/>');
    if (style.headingLevel) expect(xml).toContain(`w:val="Heading${style.headingLevel}"`);
    if (style.defaultFontSizePt) expect(xml).toContain(`<w:sz w:val="${style.defaultFontSizePt * 2}"/>`);
    if (id === "quote") expect(xml).toContain("w:pBdr");
    const pdf = buildPdfHtml(doc, "rtl", { faces: [] }, settings.typography);
    expect(pdf.html).toContain('dir="rtl"');
    expect(pdf.html).toContain("کراچی");
    if (style.headingLevel) expect(pdf.html).toContain(`<h${style.headingLevel} `);
    if (style.defaultFontSizePt) expect(pdf.html).toContain(`font-size:${style.defaultFontSizePt}pt`);
    if (id === "quote") expect(pdf.html).toContain("<blockquote");
  });

  it.each(BLOCK_STYLE_IDS)("transitions every style to %s and back to Normal", target => {
    for (const source of BLOCK_STYLE_IDS) {
      const ed = make();
      ed.commands.setTextSelection(2);
      applyBlockStyle(ed, source);
      applyBlockStyle(ed, target);
      const ui = resolveActiveToolbarFormatting(ed, settings);
      expect(ui.blockStyle, `${source} -> ${target}`).toBe(target);
      expect(ui.fontSizePt).toBe(BLOCK_STYLES[target].defaultFontSizePt ?? 12);
      expect(ed.state.selection.$from.parent.attrs.dir).toBe("rtl");
      expect(ed.state.doc.lastChild?.attrs.dir).toBe("ltr");
      applyBlockStyle(ed, "normal");
      expect(ed.state.doc.firstChild?.type.name).toBe("paragraph");
      expect(resolveActiveToolbarFormatting(ed, settings).blockStyle).toBe("normal");
    }
  });

  it("styles selected blocks, preserving unselected quote siblings and inline marks", () => {
    const ed = make('<blockquote><p><strong>One</strong></p><p>Two</p></blockquote><p>Three</p>');
    ed.commands.setTextSelection({ from: 8, to: 17 });
    applyBlockStyle(ed, "heading-2");
    expect(ed.state.doc.firstChild?.type.name).toBe("blockquote");
    expect(ed.state.doc.firstChild?.textContent).toBe("One");
    expect(ed.state.doc.child(1).type.name).toBe("heading");
    expect(ed.state.doc.child(2).type.name).toBe("heading");
    expect(ed.state.doc.firstChild?.firstChild?.firstChild?.marks[0].type.name).toBe("bold");
    expect(ed.commands.undo()).toBe(true);
    expect(ed.state.doc.childCount).toBe(2);
  });

  it("toolbar tracks cursor moves and exposes working size 15 and direction controls", () => {
    const ed = make('<p data-block-style="title">Title</p><h3>Heading</h3><p>Body</p>');
    const view = render(<DocumentToolbar editor={ed} dir="rtl" setDir={() => {}} isUr={false} />);
    const style = view.getByLabelText("Style") as HTMLSelectElement;
    expect(style.value).toBe("title");
    act(() => { ed.commands.setTextSelection(9); });
    expect(style.value).toBe("heading-3");
    act(() => { ed.commands.setTextSelection(18); });
    expect(style.value).toBe("normal");
    expect(FONT_SIZE_OPTIONS_PT).toContain(15);
    fireEvent.click(view.getByTitle("Right-to-left (Urdu/Arabic/Persian)"));
    expect(ed.state.selection.$from.parent.attrs.directionMode).toBe("rtl");
    fireEvent.click(view.getByTitle("Automatic paragraph direction"));
    expect(ed.state.selection.$from.parent.attrs.dir).toBe("ltr");
  });

  it("size 15 applies to selection and newly typed text", () => {
    const ed = make('<p>Hello</p>');
    ed.commands.setTextSelection({ from: 1, to: 6 });
    applyFontSize(ed, "15");
    expect(ed.state.doc.firstChild?.firstChild?.marks[0].attrs.fontSize).toBe("15pt");
    ed.commands.setTextSelection(6);
    applyFontSize(ed, "15");
    ed.commands.insertContent("!");
    expect(ed.state.doc.firstChild?.lastChild?.marks[0].attrs.fontSize).toBe("15pt");
  });

  it("Normal removes quote wrappers and stale paragraph spacing while retaining alignment", () => {
    const ed = make('<blockquote><p style="line-height:3;text-align:center" data-space-before-pt="70" data-space-after-pt="90">Body</p></blockquote>');
    ed.commands.setTextSelection(3);
    applyBlockStyle(ed, "normal");
    const ui = resolveActiveToolbarFormatting(ed, settings);
    expect(ed.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(ui.lineHeight).toBe(1.5);
    expect(ui.spaceBeforePt).toBe(0);
    expect(ui.spaceAfterPt).toBe(6);
    expect(ui.textAlign).toBe("center");
    for (const id of BLOCK_STYLE_IDS.filter(id => BLOCK_STYLES[id].defaultFontSizePt)) {
      expect(BLOCK_STYLE_EDITOR_CSS).toContain(`font-size:${BLOCK_STYLES[id].defaultFontSizePt}pt`);
    }
  });
});

describe("paragraph auto direction", () => {
  it.each([
    ["یہ کراچی ہے۔", "rtl"], ["This is Karachi.", "ltr"],
    ["2026 کراچی", "rtl"], ["2026 Karachi", "ltr"], ["https://example.com", "ltr"],
    ["۱۲۳، ... Karachi", "ltr"], ["A یہ کراچی کا خوبصورت شہر ہے", "rtl"],
    ["کراچی This paragraph is mostly English", "ltr"],
  ])("detects %s as %s", (text, dir) => expect(detectParagraphDirection(text)).toBe(dir));

  it("retains fallback for empty, numbers and punctuation", () => {
    for (const text of ["", "  ", "2026۱۲۳،۔!?"]) {
      expect(detectParagraphDirection(text, "ltr")).toBe("ltr");
      expect(detectParagraphDirection(text, "rtl")).toBe("rtl");
    }
  });

  it("typing, manual overrides, Auto, paste and root language changes stay paragraph-local", () => {
    const ed = make('<p dir="rtl">English</p><p dir="ltr">کراچی</p><p dir="ltr"></p>');
    expect(ed.state.doc.content.content.map(n => n.attrs.dir)).toEqual(["ltr", "rtl", "ltr"]);
    ed.commands.setTextSelection(2);
    setAlign(ed, "center");
    applyParagraphDirection(ed, "rtl");
    ed.commands.insertContent(" more English ");
    applyDocumentDirection(ed, "ltr");
    expect(ed.state.doc.firstChild?.attrs.dir).toBe("rtl");
    expect(ed.state.doc.child(1).attrs.dir).toBe("rtl");
    const slice = transformPastedSlice(new Slice(Fragment.from(ed.state.doc.firstChild!), 0, 0), "ltr");
    expect(slice.content.firstChild?.attrs.dir).toBe("rtl");
    const saved = ed.getHTML();
    const restored = make(saved);
    expect(restored.state.doc.firstChild?.attrs.directionMode).toBe("rtl");
    applyParagraphDirection(ed, "auto");
    expect(ed.state.doc.firstChild?.attrs.dir).toBe("ltr");
    expect(ed.state.doc.firstChild?.attrs.textAlign).toBe("center");
    ed.commands.setTextSelection({ from: 1, to: ed.state.doc.firstChild!.nodeSize - 1 });
    ed.commands.insertContent("کراچی");
    expect(ed.state.doc.firstChild?.attrs.dir).toBe("rtl");
  });

  it("exports Urdu RTL, English LTR and explicit manual direction to DOCX", async () => {
    const ed = make('<p>کراچی</p><p>Karachi</p><p dir="rtl" data-direction-mode="rtl">Manual English</p>');
    const doc = createDocxDocument(ed.getJSON(), "rtl");
    const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
    const xml = await zip.file("word/document.xml")!.async("string");
    const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g)!;
    expect(paragraphs.find(p => p.includes("کراچی"))).toContain('<w:bidi/>');
    expect(paragraphs.find(p => p.includes(">Karachi<"))).toContain('<w:bidi w:val="false"/>');
    expect(paragraphs.find(p => p.includes("Manual English"))).toContain('<w:bidi/>');
  });
});
