/** @vitest-environment happy-dom */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { applyFontFamily, activeToolbarFontFamily } from "../app/tools/document-studio/utils/documentCommands";
import { createMemoryDocumentLibrary } from "../app/tools/document-studio/utils/documentLibrary";
import { normalizeEditorFontFamily, studioJameelFontFaceCss, JAMEEL_EDITOR_FONT_URL } from "../app/tools/document-studio/utils/fontRegistry";
import { requiredPdfEmbedFonts, buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import { mountDocumentPrintPortal, unmountDocumentPrintPortal, waitForPrintFonts } from "../app/tools/document-studio/utils/documentView";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

afterEach(() => {
  cleanup();
  unmountDocumentPrintPortal();
});

const mixedDoc: DocNode = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { dir: "rtl" },
      content: [
        {
          type: "text",
          text: "اردو جمیل",
          marks: [{ type: "textStyle", attrs: { fontFamily: "Jameel Noori Nastaleeq", fontSize: "14pt" } }],
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { dir: "rtl" },
      content: [{ type: "text", text: "اردو ڈیفالٹ" }],
    },
  ],
};

function face(familyName: string, complete = true): PdfFontFace {
  return {
    familyName,
    regularSources: complete ? ["src"] : [],
    complete,
    declaredRegular: 1,
    declaredBold: 0,
    loadedRegular: complete ? 1 : 0,
    loadedBold: 0,
  };
}

function createEditor(doc: DocNode = mixedDoc) {
  return new Editor({
    extensions: createDocumentStudioExtensions(),
    content: doc,
  });
}

describe("Jameel font mark persistence", () => {
  it("keeps explicit Jameel fontFamily in editor JSON and leaves fontSize unchanged", () => {
    const editor = createEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "سلام", marks: [{ type: "textStyle", attrs: { fontSize: "16pt" } }] }] }],
    });
    editor.commands.selectAll();
    applyFontFamily(editor, "Jameel Noori Nastaleeq");
    const json = editor.getJSON() as DocNode;
    const marks = json.content?.[0]?.content?.[0]?.marks ?? [];
    const style = marks.find((mark) => mark.type === "textStyle");
    expect(style?.attrs?.fontFamily).toBe("Jameel Noori Nastaleeq");
    expect(style?.attrs?.fontSize).toBe("16pt");
    editor.destroy();
  });

  it("survives Document Library save/reload", async () => {
    const library = createMemoryDocumentLibrary();
    const saved = await library.createDocument({ content: mixedDoc });
    const loaded = await library.getDocument(saved.id);
    const before = JSON.stringify(mixedDoc.content?.[0]?.content?.[0]?.marks);
    const after = JSON.stringify(loaded?.content.content?.[0]?.content?.[0]?.marks);
    expect(after).toBe(before);
    expect(loaded?.content.content?.[0]?.content?.[0]?.marks?.find((m) => m.type === "textStyle")?.attrs?.fontFamily).toBe(
      "Jameel Noori Nastaleeq",
    );
  });
});

describe("toolbar font selection sync", () => {
  it("shows Jameel at the Jameel cursor and Default in unformatted text", () => {
    const editor = createEditor();
    editor.commands.setTextSelection(2);
    expect(resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl").fontFamily).toBe("Jameel Noori Nastaleeq");
    render(<DocumentToolbar editor={editor as never} dir="rtl" setDir={() => {}} isUr documentSettings={defaultDocumentSettings()} />);
    expect((document.querySelector("[data-studio-font-family]") as HTMLSelectElement).value).toBe("Jameel Noori Nastaleeq");
    editor.commands.setTextSelection(editor.state.doc.content.size - 2);
    expect(activeToolbarFontFamily(editor)).toBe("");
    expect(resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl").fontFamily).toBe("Noto Nastaliq Urdu");
    cleanup();
    render(<DocumentToolbar editor={editor as never} dir="rtl" setDir={() => {}} isUr documentSettings={defaultDocumentSettings()} />);
    expect((document.querySelector("[data-studio-font-family]") as HTMLSelectElement).value).toBe("Noto Nastaliq Urdu");
    expect((document.querySelector("[data-studio-font-size]") as HTMLSelectElement).value).toBe("12");
    expect(document.querySelector("select[data-studio-line-height]")).toBeNull();
    expect(document.querySelector("[data-studio-spacing-button]")).toBeTruthy();
    expect(resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl").lineHeight).toBe(1.5);
    editor.destroy();
  });

  it("reloaded Jameel JSON still reports Jameel at the cursor", () => {
    const editor = createEditor(mixedDoc);
    editor.commands.setTextSelection(2);
    expect(activeToolbarFontFamily(editor)).toBe("Jameel Noori Nastaleeq");
    expect(editor.isActive("bold")).toBe(false);
    editor.destroy();
  });
});

describe("print portal Jameel identity", () => {
  it("preserves Jameel inline style and shared font-face URL", async () => {
    document.body.innerHTML = `
      <div data-studio-print-root data-print-page-width-mm="210" data-print-page-height-mm="297" data-print-dir="rtl">
        <div data-studio-print-surface>
          <div class="qalam-editor-content"><span style="font-family: Jameel Noori Nastaleeq">اردو جمیل</span><span>ڈیفالٹ</span></div>
        </div>
      </div>
    `;
    const portal = mountDocumentPrintPortal();
    expect(portal?.innerHTML).toContain("Jameel Noori Nastaleeq");
    expect(portal?.querySelector("style")?.textContent).toContain(JAMEEL_EDITOR_FONT_URL);
    expect(studioJameelFontFaceCss()).toContain(JAMEEL_EDITOR_FONT_URL);
    await waitForPrintFonts(portal);
    expect(portal?.getAttribute("data-print-waited-fonts")).toBe("true");
    expect(normalizeEditorFontFamily('"Jameel Noori Nastaleeq", serif')).toBe("Jameel Noori Nastaleeq");
  });
});

describe("Download PDF Jameel contract", () => {
  it("requires Jameel embed and reports complete vs fallback metadata", () => {
    const names = requiredPdfEmbedFonts(mixedDoc, "rtl").map((def) => def.pdf.familyName);
    expect(names).toContain("Jameel Noori Nastaleeq");
    const complete = buildPdfHtml(mixedDoc, "rtl", {
      faces: [face("Jameel Noori Nastaleeq"), face("Noto Nastaliq Urdu")],
    });
    expect(complete.html).toContain("qf-jameel");
    expect(complete.fontsUsed).toContain("Jameel Noori Nastaleeq");
    expect(complete.fontFallbacks.some((item) => item.requested === "Jameel Noori Nastaleeq")).toBe(false);
    const fallback = buildPdfHtml(mixedDoc, "rtl", {
      faces: [face("Jameel Noori Nastaleeq", false), face("Noto Nastaliq Urdu")],
    });
    expect(fallback.html).toContain("qf-noto-nastaliq");
    expect(fallback.fontFallbacks).toContainEqual({
      requested: "Jameel Noori Nastaleeq",
      used: "Noto Nastaliq Urdu",
    });
  });
});
