// @vitest-environment happy-dom
import JSZip from "jszip";
import { Editor, getSchema } from "@tiptap/core";
import { Packer } from "docx";
import { Node as PMNode } from "@tiptap/pm/model";
import { createDocumentStudioExtensions, insertDocumentBreak } from "../app/tools/document-studio/utils/documentSchema";
import { createMemoryDocumentLibrary } from "../app/tools/document-studio/utils/documentLibrary";
import { createDocxDocument } from "../app/tools/document-studio/utils/buildDocxDocument";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { extractPlainText, type DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { documentPrintCss, mountDocumentPrintPortal, unmountDocumentPrintPortal } from "../app/tools/document-studio/utils/documentView";

function breakDocument(): DocNode {
  return {
    type: "doc",
    content: [
      { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Page one" }] },
      { type: "pageBreak" },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "صفحہ دو" }] },
      { type: "sectionBreak", attrs: { type: "nextPage" } },
      { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Next section" }] },
      { type: "sectionBreak", attrs: { type: "continuous" } },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "مسلسل حصہ" }] },
    ],
  };
}

async function docxXml(doc: DocNode): Promise<string> {
  const buffer = await Packer.toBuffer(createDocxDocument(doc, "rtl"));
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("word/document.xml missing");
  return file.async("text");
}

describe("Document Studio v2.3 page and section breaks", () => {
  test("real pageBreak and sectionBreak nodes survive the TipTap schema JSON round-trip", () => {
    const schema = getSchema(createDocumentStudioExtensions());
    const roundTripped = PMNode.fromJSON(schema, breakDocument()).toJSON() as DocNode;
    expect(roundTripped.content?.[1]).toMatchObject({ type: "pageBreak" });
    expect(roundTripped.content?.[3]).toMatchObject({ type: "sectionBreak", attrs: { type: "nextPage" } });
    expect(roundTripped.content?.[5]).toMatchObject({ type: "sectionBreak", attrs: { type: "continuous" } });
  });

  test("editor commands insert selectable persisted page and section nodes", () => {
    const editor = new Editor({ extensions: createDocumentStudioExtensions(), content: "<p>Page one</p>" });
    editor.chain().focus().insertContent({ type: "pageBreak" }).insertContent({ type: "sectionBreak", attrs: { type: "continuous" } }).run();
    const json = editor.getJSON() as DocNode;
    expect(json.content?.some((node) => node.type === "pageBreak")).toBe(true);
    expect(json.content?.find((node) => node.type === "sectionBreak")?.attrs?.type).toBe("continuous");
    editor.destroy();
  });

  test("page and section break insertion places a collapsed caret in the following paragraph so typing keeps every character", () => {
    const editor = new Editor({
      extensions: createDocumentStudioExtensions(),
      content: { type: "doc", content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Page one text." }] }] },
    });
    editor.commands.focus("end");
    expect(insertDocumentBreak(editor, { type: "pageBreak" })).toBe(true);
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(editor.state.selection.$from.parent.textContent).toBe("");
    editor.commands.insertContent("Page two text.");

    expect(insertDocumentBreak(editor, { type: "sectionBreak", attrs: { type: "nextPage" } })).toBe(true);
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(editor.state.selection.$from.parent.textContent).toBe("");
    editor.commands.insertContent("Section two text.");

    const json = editor.getJSON() as DocNode;
    expect(json.content?.some((node) => node.type === "pageBreak")).toBe(true);
    expect(json.content?.find((node) => node.type === "sectionBreak")?.attrs?.type).toBe("nextPage");
    const last = json.content?.[json.content.length - 1];
    expect(last?.type).toBe("paragraph");
    expect(last?.content?.[0]?.text).toBe("Section two text.");
    expect(extractPlainText(json, "ltr")).toContain("Page two text.");
    editor.destroy();
  });

  test("typing while a section break is selected lands in the following paragraph without dropping the first characters", () => {
    const editor = new Editor({
      extensions: createDocumentStudioExtensions(),
      content: { type: "doc", content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Page two text." }] }] },
    });
    editor.commands.focus("end");
    insertDocumentBreak(editor, { type: "sectionBreak", attrs: { type: "nextPage" } });
    let breakPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "sectionBreak") breakPos = pos;
    });
    if (breakPos === null) throw new Error("Expected a section break node.");
    editor.commands.setNodeSelection(breakPos);
    expect(editor.state.selection.constructor.name).toBe("NodeSelection");

    const view = editor.view;
    const first = new KeyboardEvent("keydown", { key: "S", bubbles: true });
    const handled = view.someProp("handleKeyDown", (handler) => handler(view, first));
    expect(handled).toBe(true);
    editor.commands.insertContent("ection two text.");

    const json = editor.getJSON() as DocNode;
    const breakIndex = json.content?.findIndex((node) => node.type === "sectionBreak") ?? -1;
    expect(breakIndex).toBeGreaterThanOrEqual(0);
    expect(json.content?.[breakIndex + 1]?.content?.[0]?.text).toBe("Section two text.");
    editor.destroy();
  });

  test("a selected page break is removable without changing surrounding text", () => {
    const editor = new Editor({ extensions: createDocumentStudioExtensions(), content: breakDocument() });
    let position: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "pageBreak") position = pos;
    });
    if (position === null) throw new Error("Expected a page break node.");
    editor.commands.setNodeSelection(position);
    expect(editor.commands.deleteSelection()).toBe(true);
    const json = editor.getJSON() as DocNode;
    expect(json.content?.some((node) => node.type === "pageBreak")).toBe(false);
    expect(extractPlainText(json, "rtl")).toContain("Page one");
    expect(extractPlainText(json, "rtl")).toContain("صفحہ دو");
    editor.destroy();
  });

  test("Document Library persistence preserves both break instructions without a side channel", async () => {
    const library = createMemoryDocumentLibrary();
    const created = await library.createDocument({ content: breakDocument() });
    const restored = await library.getDocument(created.id);
    expect(restored?.content.content?.filter((node) => node.type === "pageBreak")).toHaveLength(1);
    expect(restored?.content.content?.filter((node) => node.type === "sectionBreak").map((node) => node.attrs?.type)).toEqual(["nextPage", "continuous"]);
  });

  test("print CSS keeps authored breaks but hides editor marker labels", () => {
    const css = documentPrintCss(210, 297);
    expect(css).toContain('[data-document-page-break="true"]');
    expect(css).toContain('[data-document-section-break="true"][data-section-break-type="nextPage"]');
    expect(css).toContain('[data-document-section-break="true"][data-section-break-type="continuous"]');
    expect(css).toContain("break-before: page");
    expect(css).toContain("page-break-before: always");
    expect(css).toContain("break-before: auto");
    document.body.innerHTML = `
      <div data-studio-print-root data-print-page-width-mm="210" data-print-page-height-mm="297" data-print-dir="ltr">
        <div data-studio-print-surface>
          <div class="qalam-editor-content">
            <p>Page one</p>
            <div data-document-page-break="true">Page break</div>
            <p>Page two</p>
            <div data-document-section-break="true" data-section-break-type="nextPage">Section break (next page)</div>
            <p>Section two</p>
          </div>
        </div>
      </div>`;
    const portal = mountDocumentPrintPortal();
    expect(portal?.textContent).toContain("Page one");
    expect(portal?.textContent).toContain("Section two");
    expect(portal?.textContent).not.toMatch(/page break/i);
    expect(portal?.textContent).not.toMatch(/section break/i);
    expect(portal?.querySelector('[data-document-page-break="true"]')).toBeTruthy();
    expect(portal?.querySelector('[data-document-section-break="true"]')).toBeTruthy();
    unmountDocumentPrintPortal();
  });

  test("PDF HTML makes page and next-page section breaks forced print breaks while continuous stays non-forcing", () => {
    const html = buildPdfHtml(breakDocument(), "rtl", { faces: [] }).html;
    expect(html).toContain('class="qalam-page-break"');
    expect(html).toContain('class="qalam-section-break qalam-section-break-next-page"');
    expect(html).toContain('class="qalam-section-break qalam-section-break-continuous"');
    expect(html).toContain(".qalam-page-break, .qalam-section-break-next-page { break-before:page; page-break-before:always");
    expect(html).toContain(".qalam-section-break-continuous { height:0; margin:0; }");
  });

  test("DOCX emits a native page break and native next-page and continuous section boundaries", async () => {
    const xml = await docxXml(breakDocument());
    expect(xml).toContain('<w:br w:type="page"/>');
    expect(xml).toContain('<w:type w:val="nextPage"/>');
    expect(xml).toContain('<w:type w:val="continuous"/>');
    expect(xml).toContain("Page one");
    expect(xml).toContain("صفحہ دو");
    expect(xml).toContain("Next section");
    expect(xml).toContain("مسلسل حصہ");
  });

  test("LTR and RTL surrounding text remains available to text-only consumers", () => {
    const text = extractPlainText(breakDocument(), "rtl");
    expect(text).toContain("Page one");
    expect(text).toContain("صفحہ دو");
    expect(text).toContain("Next section");
    expect(text).toContain("مسلسل حصہ");
  });
});
