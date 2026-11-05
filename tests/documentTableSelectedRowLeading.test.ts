/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { applyLineHeight } from "../app/tools/document-studio/utils/documentCommands";

const ROWS = [
  ["ایک", "دو", "تین"],
  ["چار", "پانچ", "چھ"],
  ["سات", "آٹھ", "نو"],
];

const editors: Editor[] = [];

function createTableEditor(): Editor {
  const editor = new Editor({
    extensions: createDocumentStudioExtensions(),
    content: {
      type: "doc",
      content: [{
        type: "table",
        content: ROWS.map((row) => ({
          type: "tableRow",
          content: row.map((text) => ({
            type: "tableCell",
            content: [{
              type: "paragraph",
              content: [{ type: "text", text }],
            }],
          })),
        })),
      }],
    },
  });
  editors.push(editor);
  return editor;
}

function cellPositions(editor: Editor): number[] {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "tableCell") positions.push(pos);
  });
  return positions;
}

function leadingValues(editor: Editor): unknown[] {
  const values: unknown[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "paragraph") values.push(node.attrs.leading ?? null);
  });
  return values;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

describe("line spacing on selected table rows and cells", () => {
  it("reduces leading on every cell in a selected row and keeps the row selection", () => {
    const editor = createTableEditor();
    const cells = cellPositions(editor);
    editor.view.dispatch(
      editor.state.tr.setSelection(CellSelection.create(editor.state.doc, cells[0], cells[2])),
    );

    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(3);

    applyLineHeight(editor, 12);

    const leading = leadingValues(editor);
    expect(leading.slice(0, 3)).toEqual(
      Array.from({ length: 3 }, () => ({ mode: "points", value: 12 })),
    );
    expect(leading.slice(3).every((value) => value === null)).toBe(true);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(3);
  });

  it("does not change cells outside a rectangular CellSelection", () => {
    const editor = createTableEditor();
    const cells = cellPositions(editor);
    editor.view.dispatch(
      editor.state.tr.setSelection(CellSelection.create(editor.state.doc, cells[0], cells[4])),
    );

    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(4);

    applyLineHeight(editor, 10);

    const leading = leadingValues(editor);
    const formatted = new Set([0, 1, 3, 4]);
    leading.forEach((value, index) => {
      expect(value).toEqual(
        formatted.has(index) ? { mode: "points", value: 10 } : null,
      );
    });
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(4);
  });
});
