/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";
import { STUDIO_HIGHLIGHT_COLORS, STUDIO_TEXT_COLORS, parseCustomColorInput } from "../app/tools/document-studio/utils/studioColors";
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

  it("expands text and highlight palettes with broad hue coverage", () => {
    const textHex = STUDIO_TEXT_COLORS.filter((c) => c.hex).map((c) => c.hex.toUpperCase());
    const hiHex = STUDIO_HIGHLIGHT_COLORS.filter((c) => c.hex).map((c) => c.hex.toUpperCase());
    expect(STUDIO_TEXT_COLORS[0]?.id).toBe("default");
    expect(STUDIO_HIGHLIGHT_COLORS[0]?.id).toBe("none");
    expect(textHex.length).toBeGreaterThanOrEqual(35);
    expect(textHex.length).toBeLessThanOrEqual(45);
    expect(hiHex.length).toBeGreaterThanOrEqual(15);
    expect(hiHex.length).toBeLessThanOrEqual(20);
    expect(textHex).toEqual(expect.arrayContaining(["#111111", "#1A3A2A", "#B45309", "#991B1B", "#1E3A8A", "#374151"]));
    expect(hiHex).toEqual(expect.arrayContaining(["#FEF3C7", "#D1FAE5", "#DBEAFE", "#FCE7F3", "#F3F4F6", "#FDE68A"]));
    expect(textHex.some((hex) => hex.startsWith("#99") || hex.startsWith("#7F") || hex.startsWith("#DC"))).toBe(true);
    expect(textHex.some((hex) => hex === "#1D4ED8" || hex === "#2563EB")).toBe(true);
    expect(textHex).toContain("#7C3AED");
    expect(hiHex).toContain("#E9D5FF");
  });

  it("accepts custom valid hex and rejects invalid custom values", () => {
    expect(parseCustomColorInput("#2F6B4F")).toBe("#2F6B4F");
    expect(parseCustomColorInput("2f6b4f")).toBe("#2F6B4F");
    expect(parseCustomColorInput("red")).toBeNull();
    expect(parseCustomColorInput("#fff")).toBeNull();
    expect(parseCustomColorInput("url(javascript:alert(1))")).toBeNull();
    const ed = make(helloDoc);
    ed.commands.setTextSelection({ from: 1, to: 6 });
    mount(ed);
    fireEvent.click(document.querySelector("[data-studio-text-color-button]")!);
    expect(document.querySelector("[data-studio-custom-color='text']")).toBeTruthy();
    expect(document.querySelector("[data-studio-custom-hex='text']")).toBeTruthy();
    fireEvent.change(document.querySelector("[data-studio-custom-hex='text']")!, { target: { value: "not-a-color" } });
    const before = (ed.getJSON() as DocNode).content?.[0]?.content?.[0]?.marks ?? [];
    expect(before.some((m) => m.type === "textStyle" && m.attrs?.color)).toBe(false);
    fireEvent.change(document.querySelector("[data-studio-custom-hex='text']")!, { target: { value: "#2F6B4F" } });
    const style = (ed.getJSON() as DocNode).content?.[0]?.content?.[0]?.marks?.find((m) => m.type === "textStyle");
    expect(style?.attrs?.color).toBe("#2F6B4F");
    fireEvent.click(document.querySelector("[data-studio-highlight-button]")!);
    fireEvent.change(document.querySelector("[data-studio-custom-hex='highlight']")!, { target: { value: "#CFFAFE" } });
    const hi = (ed.getJSON() as DocNode).content?.[0]?.content?.[0]?.marks?.find((m) => m.type === "highlight");
    expect(hi?.attrs?.color).toBe("#CFFAFE");
  });
});
