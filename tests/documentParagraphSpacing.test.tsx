/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { Packer } from "docx";
import JSZip from "jszip";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import {
  addSpaceAfterParagraph,
  addSpaceBeforeParagraph,
  applyCustomParagraphSpacing,
  applyLineHeight,
  applyParagraphAttrs,
  applyTextColor,
  removeSpaceAfterParagraph,
  removeSpaceBeforeParagraph,
} from "../app/tools/document-studio/utils/documentCommands";
import { resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";
import { buildPdfHtml, type PdfFontFace } from "../app/tools/document-studio/utils/buildPdfHtml";
import { createDocxDocument } from "../app/tools/document-studio/utils/buildDocxDocument";
import {
  LINE_SPACING_PRESETS,
  defaultDocumentSettings,
  parseNumericField,
  resolveAddSpaceAfterPt,
  resolveAddSpaceBeforePt,
} from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

let editor: Editor | null = null;
afterEach(() => {
  cleanup();
  editor?.destroy();
  editor = null;
});

function make(doc: DocNode) {
  editor = new Editor({ extensions: createDocumentStudioExtensions(), content: doc });
  return editor;
}

function para(text: string, attrs: Record<string, unknown> = {}, marks?: DocNode["marks"]): DocNode {
  const textNode: DocNode = marks?.length ? { type: "text", text, marks } : { type: "text", text };
  return {
    type: "paragraph",
    attrs: { dir: "ltr", ...attrs },
    content: [textNode],
  };
}

function mount(ed: Editor) {
  return render(
    <DocumentToolbar editor={ed as never} dir="ltr" setDir={() => {}} isUr={false} documentSettings={defaultDocumentSettings()} />,
  );
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

describe("paragraph spacing presets and commands", () => {
  it("applies Single / 1.15 / 1.5 / Double presets", () => {
    const ed = make({ type: "doc", content: [para("Hello")] });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    for (const preset of LINE_SPACING_PRESETS) {
      applyLineHeight(ed, preset.value);
      expect((ed.getJSON() as DocNode).content?.[0]?.attrs?.lineHeight).toBe(preset.value);
    }
  });

  it("marks the active exact preset and not a custom value", () => {
    const ed = make({ type: "doc", content: [para("Hello", { lineHeight: 1.5 })] });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    mount(ed);
    fireEvent.click(document.querySelector("[data-studio-spacing-button]")!);
    expect(document.querySelector('[data-studio-spacing-preset="1.5"]')?.getAttribute("aria-checked")).toBe("true");
    expect(document.querySelector('[data-studio-spacing-preset="1"]')?.getAttribute("aria-checked")).toBe("false");
    cleanup();
    applyLineHeight(ed, 1.8);
    mount(ed);
    fireEvent.click(document.querySelector("[data-studio-spacing-button]")!);
    expect([...document.querySelectorAll("[data-studio-spacing-preset][aria-checked='true']")]).toHaveLength(0);
  });

  it("adds and removes space before paragraph", () => {
    const settings = defaultDocumentSettings();
    const ed = make({ type: "doc", content: [para("Hello")] });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    addSpaceBeforeParagraph(ed, settings);
    expect((ed.getJSON() as DocNode).content?.[0]?.attrs?.spaceBeforePt).toBe(resolveAddSpaceBeforePt(settings));
    removeSpaceBeforeParagraph(ed);
    expect((ed.getJSON() as DocNode).content?.[0]?.attrs?.spaceBeforePt).toBe(0);
  });

  it("adds and removes space after paragraph", () => {
    const settings = defaultDocumentSettings();
    const ed = make({ type: "doc", content: [para("Hello")] });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    addSpaceAfterParagraph(ed, settings);
    expect((ed.getJSON() as DocNode).content?.[0]?.attrs?.spaceAfterPt).toBe(resolveAddSpaceAfterPt(settings));
    removeSpaceAfterParagraph(ed);
    expect((ed.getJSON() as DocNode).content?.[0]?.attrs?.spaceAfterPt).toBe(0);
  });

  it("applies custom line spacing and before/after", () => {
    const ed = make({ type: "doc", content: [para("Hello")] });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    applyCustomParagraphSpacing(ed, { lineHeight: 1.8, spaceBeforePt: 10, spaceAfterPt: 14 });
    const attrs = (ed.getJSON() as DocNode).content?.[0]?.attrs;
    expect(attrs?.lineHeight).toBe(1.8);
    expect(attrs?.spaceBeforePt).toBe(10);
    expect(attrs?.spaceAfterPt).toBe(14);
  });

  it("applies first-line and start/end indents", () => {
    const ed = make({ type: "doc", content: [para("Hello")] });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    applyParagraphAttrs(ed, { firstLineIndentMm: 12, indentStartMm: 20, indentEndMm: 8 });
    const attrs = (ed.getJSON() as DocNode).content?.[0]?.attrs;
    expect(attrs?.firstLineIndentMm).toBe(12);
    expect(attrs?.indentStartMm).toBe(20);
    expect(attrs?.indentEndMm).toBe(8);
  });

  it("rejects invalid custom numeric values through canonical validators", () => {
    expect(parseNumericField("nope", "line")).toBeNull();
    expect(parseNumericField(-1, "pt")).toBeNull();
    expect(parseNumericField(500, "mm")).toBeNull();
    expect(parseNumericField(1.15, "line")).toBe(1.15);
    expect(parseNumericField("12", "pt")).toBe(12);
    const ed = make({ type: "doc", content: [para("Hello")] });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    mount(ed);
    fireEvent.click(document.querySelector("[data-studio-spacing-button]")!);
    fireEvent.click(document.querySelector("[data-studio-custom-spacing]")!);
    const line = document.querySelector('[data-studio-spacing-field="lineHeight"]') as HTMLInputElement;
    fireEvent.change(line, { target: { value: "999" } });
    fireEvent.click(document.querySelector("[data-studio-spacing-apply]")!);
    expect((ed.getJSON() as DocNode).content?.[0]?.attrs?.lineHeight ?? null).toBeNull();
  });

  it("applies across multiple paragraphs", () => {
    const ed = make({ type: "doc", content: [para("One"), para("Two")] });
    ed.commands.selectAll();
    applyLineHeight(ed, 2);
    applyParagraphAttrs(ed, { indentStartMm: 15 });
    const json = ed.getJSON() as DocNode;
    expect(json.content?.[0]?.attrs?.lineHeight).toBe(2);
    expect(json.content?.[1]?.attrs?.lineHeight).toBe(2);
    expect(json.content?.[0]?.attrs?.indentStartMm).toBe(15);
    expect(json.content?.[1]?.attrs?.indentStartMm).toBe(15);
  });

  it("reports mixed paragraph values", () => {
    const ed = make({
      type: "doc",
      content: [para("One", { lineHeight: 1 }), para("Two", { lineHeight: 2 })],
    });
    ed.commands.selectAll();
    const ui = resolveActiveToolbarFormatting(ed, defaultDocumentSettings(), "ltr");
    expect(ui.mixed.lineHeight).toBe(true);
    expect(ui.lineHeight).toBeNull();
  });

  it("keeps logical start/end indent in RTL and LTR JSON", () => {
    const ed = make({
      type: "doc",
      content: [
        para("English", { dir: "ltr", indentStartMm: 20, indentEndMm: 5 }),
        { type: "paragraph", attrs: { dir: "rtl", indentStartMm: 20, indentEndMm: 5 }, content: [{ type: "text", text: "اردو" }] },
      ],
    });
    const json = ed.getJSON() as DocNode;
    expect(json.content?.[0]?.attrs?.indentStartMm).toBe(20);
    expect(json.content?.[0]?.attrs?.indentEndMm).toBe(5);
    expect(json.content?.[1]?.attrs?.indentStartMm).toBe(20);
    expect(json.content?.[1]?.attrs?.indentEndMm).toBe(5);
    expect(json.content?.[1]?.attrs?.dir).toBe("rtl");
  });

  it("does not remove inline text marks", () => {
    const ed = make({
      type: "doc",
      content: [para("Hello", {}, [
        { type: "bold" },
        { type: "textStyle", attrs: { color: "#1A3A2A", fontFamily: "Inter", fontSize: "14pt" } },
        { type: "highlight", attrs: { color: "#FEF3C7" } },
      ])],
    });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    applyLineHeight(ed, 2);
    applyTextColor(ed, "#1A3A2A");
    const marks = (ed.getJSON() as DocNode).content?.[0]?.content?.[0]?.marks ?? [];
    expect(marks.some((m) => m.type === "bold")).toBe(true);
    expect(marks.some((m) => m.type === "highlight")).toBe(true);
    expect(marks.find((m) => m.type === "textStyle")?.attrs?.fontFamily).toBe("Inter");
    expect((ed.getJSON() as DocNode).content?.[0]?.attrs?.lineHeight).toBe(2);
  });

  it("persists paragraph attrs in editor JSON", () => {
    const ed = make({ type: "doc", content: [para("Hello")] });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    applyCustomParagraphSpacing(ed, {
      lineHeight: 1.15,
      spaceBeforePt: 8,
      spaceAfterPt: 10,
      firstLineIndentMm: 6,
      indentStartMm: 12,
      indentEndMm: 4,
    });
    const attrs = (ed.getJSON() as DocNode).content?.[0]?.attrs;
    expect(attrs).toMatchObject({
      lineHeight: 1.15,
      spaceBeforePt: 8,
      spaceAfterPt: 10,
      firstLineIndentMm: 6,
      indentStartMm: 12,
      indentEndMm: 4,
    });
  });
});

describe("spacing menu", () => {
  it("replaces the native line-height select", () => {
    const ed = make({ type: "doc", content: [para("Hello")] });
    mount(ed);
    expect(document.querySelector("select[data-studio-line-height]")).toBeNull();
    expect(document.querySelector("[data-studio-spacing-button]")).toBeTruthy();
    fireEvent.click(document.querySelector("[data-studio-spacing-button]")!);
    expect(document.querySelector("[data-studio-spacing-menu]")).toBeTruthy();
    expect(document.querySelector('[data-studio-spacing-preset="1"]')).toBeTruthy();
    expect(document.querySelector("[data-studio-add-space-before]")).toBeTruthy();
    expect(document.querySelector("[data-studio-add-space-after]")).toBeTruthy();
    fireEvent.click(document.querySelector("[data-studio-custom-spacing]")!);
    expect(document.querySelector("[data-studio-custom-spacing-dialog]")).toBeTruthy();
  });
});

describe("PDF and DOCX spacing export", () => {
  const spaced: DocNode = {
    type: "doc",
    content: [
      para("Hello", {
        dir: "ltr",
        lineHeight: 2,
        spaceBeforePt: 10,
        spaceAfterPt: 14,
        firstLineIndentMm: 8,
        indentStartMm: 20,
        indentEndMm: 5,
      }),
      {
        type: "paragraph",
        attrs: { dir: "rtl", lineHeight: 1.15, indentStartMm: 20, indentEndMm: 5, firstLineIndentMm: 8 },
        content: [{ type: "text", text: "اردو" }],
      },
    ],
  };

  it("emits PDF spacing and logical indents", () => {
    const html = buildPdfHtml(spaced, "ltr", { faces: [interFace] });
    expect(html.html).toContain("line-height:2");
    expect(html.html).toContain("margin-block-start:10pt");
    expect(html.html).toContain("margin-block-end:14pt");
    expect(html.html).toContain("text-indent:8mm");
    expect(html.html).toContain("margin-inline-start:20mm");
    expect(html.html).toContain("margin-inline-end:5mm");
    expect(html.html).toContain('dir="rtl"');
    expect(html.html).toContain("line-height:1.15");
  });

  it("emits DOCX spacing and indentation", async () => {
    const buffer = await Packer.toBuffer(createDocxDocument(spaced, "ltr"));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("text");
    expect(xml).toMatch(/w:line="480"/);
    expect(xml).toMatch(/w:before="200"/);
    expect(xml).toMatch(/w:after="280"/);
    expect(xml).toContain("w:start");
    expect(xml).toContain("w:end");
    expect(xml).toContain("w:firstLine");
    expect(xml).toContain('w:start="1134"');
    expect(xml).toContain('w:end="283"');
    expect(xml).toContain('w:firstLine="454"');
  });
});
