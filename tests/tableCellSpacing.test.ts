/** @vitest-environment happy-dom */
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { applyLineHeight, applyParagraphAttrs } from "../app/tools/document-studio/utils/documentCommands";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";

const URDU = ["اردو متن", "پاکستان", "لاہور", "کراچی"] as const;

const editors: Editor[] = [];

afterEach(() => {
  cleanup();
  editors.splice(0).forEach((editor) => editor.destroy());
});

function tableDoc() {
  return {
    type: "doc",
    content: [
      {
        type: "table",
        attrs: { dir: "rtl", tableFlow: "rtl" },
        content: [0, 1].map((row) => ({
          type: "tableRow",
          content: [0, 1].map((col) => ({
            type: "tableCell",
            attrs: { colwidth: [140] },
            content: [
              {
                type: "paragraph",
                attrs: { dir: "rtl" },
                content: [{ type: "text", text: URDU[row * 2 + col] }],
              },
            ],
          })),
        })),
      },
    ],
  };
}

function makeEditor() {
  const editor = new Editor({
    extensions: createDocumentStudioExtensions(),
    content: tableDoc(),
  });
  editors.push(editor);
  return editor;
}

function cellPositions(editor: Editor): number[] {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") positions.push(pos);
  });
  return positions;
}

function selectAllCells(editor: Editor) {
  const cells = cellPositions(editor);
  expect(cells).toHaveLength(4);
  act(() => {
    editor.view.dispatch(
      editor.state.tr.setSelection(CellSelection.create(editor.state.doc, cells[0], cells[3])),
    );
  });
  expect(editor.state.selection).toBeInstanceOf(CellSelection);
  expect(editor.state.selection.ranges).toHaveLength(4);
}

function cellParagraphs(editor: Editor) {
  const found: { text: string; attrs: Record<string, unknown>; style: string }[] = [];
  const dom = [...editor.view.dom.querySelectorAll("td p, th p")] as HTMLElement[];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "paragraph") return;
    const parent = editor.state.doc.resolve(pos).parent;
    if (parent.type.name !== "tableCell" && parent.type.name !== "tableHeader") return;
    found.push({
      text: node.textContent,
      attrs: { ...node.attrs },
      style: dom[found.length]?.getAttribute("style") ?? "",
    });
  });
  return found;
}

/** A real field click replaces the invisible CellSelection with a caret before commit. */
function collapseAfterPress(editor: Editor) {
  act(() => {
    editor.commands.setTextSelection(cellPositions(editor)[0] + 2);
  });
}

function mountToolbar(editor: Editor) {
  render(
    createElement(DocumentToolbar, {
      editor,
      dir: "rtl",
      setDir: () => {},
      isUr: false,
      documentSettings: defaultDocumentSettings(),
    }),
  );
}

describe("table cell line and paragraph spacing", () => {
  it("applies leading and space before/after to every paragraph in a 2x2 CellSelection", () => {
    const editor = makeEditor();
    selectAllCells(editor);
    act(() => {
      applyLineHeight(editor, 24);
      applyParagraphAttrs(editor, { spaceBeforePt: 6, spaceAfterPt: 6 });
    });
    const blocks = cellParagraphs(editor);
    expect(blocks.map((block) => block.text)).toEqual([...URDU]);
    for (const block of blocks) {
      expect(block.attrs.leading).toEqual({ mode: "points", value: 24 });
      expect(block.attrs.spaceBeforePt).toBe(6);
      expect(block.attrs.spaceAfterPt).toBe(6);
      expect(block.style).toContain("line-height: 24pt");
      expect(block.style).toContain("margin-block-start: 6pt");
      expect(block.style).toContain("margin-block-end: 6pt");
    }
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect((editor.state.selection as CellSelection).ranges).toHaveLength(4);
  });

  it("keeps the CellSelection when the line-spacing field takes focus before commit", () => {
    const editor = makeEditor();
    mountToolbar(editor);
    selectAllCells(editor);
    const input = document.querySelector("[data-studio-leading]") as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.mouseDown(input);
    collapseAfterPress(editor);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "24pt" } });
    fireEvent.keyDown(input, { key: "Enter" });
    const blocks = cellParagraphs(editor);
    expect(blocks.map((block) => block.text)).toEqual([...URDU]);
    for (const block of blocks) {
      expect(block.attrs.leading).toEqual({ mode: "points", value: 24 });
      expect(block.style).toContain("line-height: 24pt");
    }
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect((editor.state.selection as CellSelection).ranges).toHaveLength(4);
  });

  it("applies space before and after when the custom spacing fields take focus", () => {
    const editor = makeEditor();
    mountToolbar(editor);
    selectAllCells(editor);
    fireEvent.click(document.querySelector("[data-studio-spacing-button]")!);
    fireEvent.click(document.querySelector("[data-studio-custom-spacing]")!);
    const before = document.querySelector("[data-studio-spacing-field='spaceBeforePt']") as HTMLInputElement;
    const after = document.querySelector("[data-studio-spacing-field='spaceAfterPt']") as HTMLInputElement;
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
    fireEvent.mouseDown(before);
    fireEvent.mouseDown(after);
    collapseAfterPress(editor);
    fireEvent.change(before, { target: { value: "6" } });
    fireEvent.change(after, { target: { value: "6" } });
    fireEvent.pointerUp(document.querySelector("[data-studio-spacing-apply]")!);
    const blocks = cellParagraphs(editor);
    expect(blocks.map((block) => block.text)).toEqual([...URDU]);
    for (const block of blocks) {
      expect(block.attrs.spaceBeforePt).toBe(6);
      expect(block.attrs.spaceAfterPt).toBe(6);
      expect(block.style).toContain("margin-block-start: 6pt");
      expect(block.style).toContain("margin-block-end: 6pt");
    }
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect((editor.state.selection as CellSelection).ranges).toHaveLength(4);
  });
});
