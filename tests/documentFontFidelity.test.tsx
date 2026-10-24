/** @vitest-environment happy-dom */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { applyFontFamily, activeToolbarFontFamily } from "../app/tools/document-studio/utils/documentCommands";
import { createMemoryDocumentLibrary } from "../app/tools/document-studio/utils/documentLibrary";
import { normalizeEditorFontFamily, studioJameelFontFaceCss, studioOnDemandFontFaceCss, JAMEEL_EDITOR_FONT_URL, migrateAlviDocumentContent, resolveEditorFontFamily } from "../app/tools/document-studio/utils/fontRegistry";
import { fontsForDocument } from "../app/tools/document-studio/utils/pdfDocumentFonts";
import { requiredPdfEmbedFonts, buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import { mountDocumentPrintPortal, unmountDocumentPrintPortal, waitForPrintFonts } from "../app/tools/document-studio/utils/documentView";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";
import { buildDocxBlob } from "../app/tools/document-studio/utils/buildDocxDocument";
import JSZip from "jszip";
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
  it("groups font choices by Urdu, Arabic, Persian and English in both interface languages", () => {
    const editor = createEditor();
    const view = render(<DocumentToolbar editor={editor as never} dir="rtl" setDir={() => {}} isUr />);
    const select = document.querySelector("[data-studio-font-family]") as HTMLSelectElement;
    const groups = Array.from(select.querySelectorAll("optgroup"));
    expect(groups.map(group => group.label)).toEqual([
      "اردو فونٹس", "عربی فونٹس", "فارسی فونٹس", "انگریزی فونٹس",
    ]);
    const options = Array.from(select.options).map(option => option.value);
    expect(options).toContain("Gulzar");
    expect(options).not.toContain("Faiz Lahori Nastaleeq");
    for (const hidden of [
      "Nafees Nastaleeq",
      "Adobe Arabic",
      "Traditional Arabic",
      "Al Majeed Quranic",
      "Asif Quranic",
      "Muhammadi Quranic",
      "Al Qalam Quran Majeed",
    ]) {
      expect(options).not.toContain(hidden);
    }
    expect(options).not.toContain("Alvi Nastaleeq");
    expect(options).toContain("Jameel Noori Nastaleeq");
    expect(options).toContain("Sahel");
    expect(options).toContain("Vazirmatn");
    expect(options).toContain("AlFars 9 Badr");
    expect(options).toContain("B Nazanin");
    expect(options.indexOf("AlFars 9 Badr")).toBeLessThan(options.indexOf("Vazirmatn"));
    expect(options.indexOf("Vazirmatn")).toBeLessThan(options.indexOf("Sahel"));
    expect(options.indexOf("Sahel")).toBeLessThan(options.indexOf("B Nazanin"));
    view.rerender(<DocumentToolbar editor={editor as never} dir="ltr" setDir={() => {}} isUr={false} />);
    expect(Array.from(select.querySelectorAll("optgroup")).map(group => group.label)).toEqual([
      "Urdu fonts", "Arabic fonts", "Persian fonts", "English fonts",
    ]);
    editor.destroy();
  });

  it("shows Jameel at the Jameel cursor and Default in unformatted text", () => {
    const editor = createEditor();
    editor.commands.setTextSelection(2);
    expect(resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl").fontFamily).toBe("Jameel Noori Nastaleeq");
    render(<DocumentToolbar editor={editor as never} dir="rtl" setDir={() => {}} isUr documentSettings={defaultDocumentSettings()} />);
    expect((document.querySelector("[data-studio-font-family]") as HTMLSelectElement).value).toBe("Jameel Noori Nastaleeq");
    editor.commands.setTextSelection(editor.state.doc.content.size - 2);
    expect(activeToolbarFontFamily(editor)).toBe("");
    expect(resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl").fontFamily).toBe("Mehr Nastaliq Web");
    cleanup();
    render(<DocumentToolbar editor={editor as never} dir="rtl" setDir={() => {}} isUr documentSettings={defaultDocumentSettings()} />);
    expect((document.querySelector("[data-studio-font-family]") as HTMLSelectElement).value).toBe("Mehr Nastaliq Web");
    expect((document.querySelector("[data-studio-font-size]") as HTMLSelectElement).value).toBe("12");
    expect(document.querySelector("select[data-studio-line-height]")).toBeNull();
    expect(document.querySelector("[data-studio-spacing-button]")).toBeTruthy();
    expect(resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl").lineHeight).toBeNull();
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

  it("does not request the Jameel file when the printed document does not use it", () => {
    document.body.innerHTML = `
      <div data-studio-print-root data-print-page-width-mm="210" data-print-page-height-mm="297" data-print-dir="rtl">
        <div data-studio-print-surface>
          <div class="qalam-editor-content"><span>ڈیفالٹ</span></div>
        </div>
      </div>
    `;
    const portal = mountDocumentPrintPortal();
    expect(portal?.querySelector("style")?.textContent ?? "").not.toContain("jameel-noori-nastaleeq-400.woff2");
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

describe("picked Document Studio faces", () => {
  it.each([
    ["AlFars 9 Badr", "AlFars9Badr.woff2"],
    ["B Nazanin", "BNazanin.woff2"],
  ] as const)("quotes %s on the selected span and requests its font file", async (family, file) => {
    const editor = createEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "فارسی متن" }] }],
    });
    expect(studioOnDemandFontFaceCss("فارسی متن")).toBe("");
    editor.commands.selectAll();
    applyFontFamily(editor, family);
    const quoted = `"${family}"`;
    const json = editor.getJSON() as DocNode;
    expect(json.content?.[0]?.content?.[0]?.marks?.find((mark) => mark.type === "textStyle")?.attrs?.fontFamily).toBe(quoted);
    expect(normalizeEditorFontFamily(quoted)).toBe(family);
    const html = editor.getHTML();
    const encodedQuotes = "font-family: &" + "quot;" + family + "&" + "quot;";
    expect(html.includes(encodedQuotes) || html.includes(`font-family: ${quoted}`)).toBe(true);
    const span = document.createElement("div");
    span.innerHTML = html;
    const styled = span.querySelector("span");
    expect(styled?.getAttribute("style") ?? "").toContain(`font-family: ${quoted}`);
    const probe = document.createElement("span");
    probe.style.cssText = styled?.getAttribute("style") ?? "";
    expect(probe.style.fontFamily.replace(/["']/g, "")).toContain(family);
    const css = studioOnDemandFontFaceCss(html);
    expect(css).toContain(`font-family:"${family}"`);
    expect(css).toContain(file);
    expect(css).toContain("workers.dev/fonts/" + file);
    const loaded = migrateAlviDocumentContent({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "فارسی متن", marks: [{ type: "textStyle", attrs: { fontFamily: family } }] }],
      }],
    });
    expect(loaded.content?.[0]?.content?.[0]?.marks?.[0]?.attrs?.fontFamily).toBe(quoted);
    const pdf = buildPdfHtml(json, "rtl", { faces: [face(family), face("Noto Nastaliq Urdu")] });
    expect(pdf.fontsUsed).toContain(family);
    expect(pdf.html).toContain(`font-family: "${family}", serif`);
    expect(resolveEditorFontFamily(quoted, "rtl").docxFamily).toBe(family);
    const docx = await JSZip.loadAsync(await buildDocxBlob(json, "rtl"));
    const documentXml = await docx.file("word/document.xml")?.async("string");
    expect(documentXml).toContain(`w:ascii="${family}"`);
    expect(documentXml).toContain(`w:cs="${family}"`);
    expect(activeToolbarFontFamily(editor)).toBe(family);
    editor.destroy();
  });

  it("loads Jameel only after it is picked, and does not load the Persian faces", () => {
    const editor = createEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "اردو متن" }] }],
    });
    editor.commands.selectAll();
    applyFontFamily(editor, "Jameel Noori Nastaleeq");
    const json = editor.getJSON() as DocNode;
    expect(json.content?.[0]?.content?.[0]?.marks?.find((mark) => mark.type === "textStyle")?.attrs?.fontFamily).toBe("Jameel Noori Nastaleeq");
    expect(studioOnDemandFontFaceCss(JSON.stringify(json))).toBe("");
    expect(studioJameelFontFaceCss()).toContain("jameel-noori-nastaleeq-400.woff2");
    expect(JAMEEL_EDITOR_FONT_URL).toContain("jameel-noori-nastaleeq-400.woff2");
    editor.destroy();
  });
});

describe("Mehr document PDF", () => {
  it("embeds Mehr Nastaliq Web and keeps Noto Nastaliq Urdu as the fallback", async () => {
    const doc: DocNode = {
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "قلم ورکس" }] }],
    };
    const settings = defaultDocumentSettings();
    const loaded = await fontsForDocument(doc, "rtl", settings.typography);
    const mehr = loaded.fonts.faces.find((item) => item.familyName === "Mehr Nastaliq Web");
    expect(mehr?.complete).toBe(true);
    expect(Buffer.from(mehr?.regularSources[0] ?? "", "base64").subarray(0, 4).toString("ascii")).toBe("wOF2");
    const html = buildPdfHtml(doc, "rtl", loaded.fonts, settings.typography);
    expect(html.fontsUsed).toContain("Mehr Nastaliq Web");
    expect(html.fontsUsed).toContain("Noto Nastaliq Urdu");
    expect(html.fontFallbacks.some((item) => item.requested === "Mehr Nastaliq Web")).toBe(false);
    expect(html.html).toContain('font-family:"Mehr Nastaliq Web"');
    expect(html.html).toContain('"Mehr Nastaliq Web", "Noto Nastaliq Urdu", serif');
    expect(html.html).not.toContain("workers.dev/fonts/MehrNastaliqWeb.woff2");
  });
});
