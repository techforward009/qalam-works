/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";
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

function mount(ed: Editor, isUr = false) {
  return render(
    <DocumentToolbar
      editor={ed as never}
      dir="ltr"
      setDir={() => {}}
      isUr={isUr}
      documentSettings={defaultDocumentSettings()}
    />,
  );
}

const helloDoc: DocNode = {
  type: "doc",
  content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Hello" }] }],
};

describe("visual color palettes", () => {
  it("removes native text-color and highlight selects", () => {
    const ed = make(helloDoc);
    mount(ed);
    expect(document.querySelector("select[data-studio-text-color]")).toBeNull();
    expect(document.querySelector("select[data-studio-highlight]")).toBeNull();
    expect(document.querySelectorAll("select[data-studio-text-color], select[data-studio-highlight]").length).toBe(0);
  });

  it("shows visual palette buttons instead of dropdowns", () => {
    const ed = make(helloDoc);
    mount(ed);
    const textBtn = document.querySelector("[data-studio-text-color-button]") as HTMLButtonElement;
    const hiBtn = document.querySelector("[data-studio-highlight-button]") as HTMLButtonElement;
    expect(textBtn).toBeTruthy();
    expect(hiBtn).toBeTruthy();
    expect(textBtn.tagName).toBe("BUTTON");
    expect(hiBtn.tagName).toBe("BUTTON");
    expect(textBtn.getAttribute("aria-label")).toBe("Text color");
    expect(hiBtn.getAttribute("aria-label")).toBe("Highlight");
  });

  it("applies text color from a swatch using existing commands", () => {
    const ed = make(helloDoc);
    ed.commands.setTextSelection({ from: 1, to: 6 });
    mount(ed);
    fireEvent.click(document.querySelector("[data-studio-text-color-button]")!);
    expect(document.querySelector("[data-studio-text-color-palette]")).toBeTruthy();
    fireEvent.click(document.querySelector('[data-studio-color-swatch="qalam"]')!);
    const json = ed.getJSON() as DocNode;
    const style = json.content?.[0]?.content?.[0]?.marks?.find((m) => m.type === "textStyle");
    expect(style?.attrs?.color).toMatch(/#1A3A2A/i);
  });

  it("applies highlight from a swatch using existing commands", () => {
    const ed = make(helloDoc);
    ed.commands.setTextSelection({ from: 1, to: 6 });
    mount(ed);
    fireEvent.click(document.querySelector("[data-studio-highlight-button]")!);
    fireEvent.click(document.querySelector('[data-studio-highlight-palette] [data-studio-color-swatch="yellow"]')!);
    const json = ed.getJSON() as DocNode;
    const hi = json.content?.[0]?.content?.[0]?.marks?.find((m) => m.type === "highlight");
    expect(hi?.attrs?.color).toMatch(/#FEF3C7/i);
  });

  it("reset/none clears color and highlight", () => {
    const ed = make({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "ltr" },
        content: [{
          type: "text",
          text: "Hello",
          marks: [
            { type: "textStyle", attrs: { color: "#991B1B" } },
            { type: "highlight", attrs: { color: "#DBEAFE" } },
          ],
        }],
      }],
    });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    mount(ed);
    fireEvent.click(document.querySelector("[data-studio-text-color-button]")!);
    fireEvent.click(document.querySelector('[data-studio-text-color-palette] [data-studio-color-swatch="default"]')!);
    fireEvent.click(document.querySelector("[data-studio-highlight-button]")!);
    fireEvent.click(document.querySelector('[data-studio-highlight-palette] [data-studio-color-swatch="none"]')!);
    const marks = (ed.getJSON() as DocNode).content?.[0]?.content?.[0]?.marks ?? [];
    const style = marks.find((m) => m.type === "textStyle");
    expect(style?.attrs?.color == null || style?.attrs?.color === "").toBe(true);
    expect(marks.some((m) => m.type === "highlight")).toBe(false);
  });

  it("marks the active swatch", () => {
    const ed = make({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "ltr" },
        content: [{ type: "text", text: "Hello", marks: [{ type: "textStyle", attrs: { color: "#1A3A2A" } }] }],
      }],
    });
    ed.commands.setTextSelection({ from: 1, to: 6 });
    mount(ed);
    fireEvent.click(document.querySelector("[data-studio-text-color-button]")!);
    expect(document.querySelector('[data-studio-color-swatch="qalam"]')?.getAttribute("data-studio-color-swatch-active")).toBe("true");
    expect(document.querySelector('[data-studio-color-swatch="ink"]')?.getAttribute("data-studio-color-swatch-active")).toBe("false");
  });

  it("mixed selection does not force a single active swatch", () => {
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
    expect(resolveActiveToolbarFormatting(ed, defaultDocumentSettings(), "ltr").mixed.color).toBe(true);
    mount(ed);
    fireEvent.click(document.querySelector("[data-studio-text-color-button]")!);
    const actives = [...document.querySelectorAll("[data-studio-text-color-palette] [data-studio-color-swatch-active='true']")];
    expect(actives.length).toBe(0);
  });

  it("keeps the original editor selection when applying a swatch", () => {
    const ed = make(helloDoc);
    ed.commands.setTextSelection({ from: 1, to: 6 });
    const before = { from: ed.state.selection.from, to: ed.state.selection.to };
    mount(ed);
    fireEvent.mouseDown(document.querySelector("[data-studio-text-color-button]")!);
    fireEvent.click(document.querySelector("[data-studio-text-color-button]")!);
    const swatch = document.querySelector('[data-studio-color-swatch="navy"]')!;
    fireEvent.mouseDown(swatch);
    fireEvent.click(swatch);
    expect(ed.state.selection.from).toBe(before.from);
    expect(ed.state.selection.to).toBe(before.to);
    const style = (ed.getJSON() as DocNode).content?.[0]?.content?.[0]?.marks?.find((m) => m.type === "textStyle");
    expect(style?.attrs?.color).toMatch(/#1E3A8A/i);
  });
});
