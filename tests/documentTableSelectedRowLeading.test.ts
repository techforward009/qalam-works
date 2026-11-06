/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { applyLineHeight, applyParagraphAttrs } from "../app/tools/document-studio/utils/documentCommands";
import { resolveActiveToolbarFormatting } from "../app/tools/document-studio/utils/activeToolbarFormatting";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";

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
function paragraphPositions(editor: Editor): number[] {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "paragraph") positions.push(pos);
  });
  return positions;
}

function paragraphAttrs(editor: Editor): Record<string, unknown>[] {
  const attrs: Record<string, unknown>[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "paragraph") attrs.push(node.attrs as Record<string, unknown>);
  });
  return attrs;
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


  it("applies line gap and paragraph before/after to every cell in a selected row only", () => {
    const editor = createTableEditor();
    const cells = cellPositions(editor);
    editor.view.dispatch(
      editor.state.tr.setSelection(CellSelection.create(editor.state.doc, cells[0], cells[2])),
    );

    applyLineHeight(editor, 12);
    applyParagraphAttrs(editor, { lineGapPt: 3, spaceBeforePt: 6, spaceAfterPt: 9 });

    const paragraphs = paragraphAttrs(editor);
    for (const attrs of paragraphs.slice(0, 3)) {
      expect(attrs.leading).toEqual({ mode: "points", value: 12 });
      expect(attrs.lineGapPt).toBe(3);
      expect(attrs.spaceBeforePt).toBe(6);
      expect(attrs.spaceAfterPt).toBe(9);
    }
    for (const attrs of paragraphs.slice(3)) {
      expect(attrs.leading ?? null).toBeNull();
      expect(attrs.lineGapPt ?? null).toBeNull();
      expect(attrs.spaceBeforePt ?? null).toBeNull();
      expect(attrs.spaceAfterPt ?? null).toBeNull();
    }
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(3);
  });

  it("applies all paragraph spacing controls to a single selected cell only", () => {
    const editor = createTableEditor();
    const cells = cellPositions(editor);
    editor.view.dispatch(
      editor.state.tr.setSelection(CellSelection.create(editor.state.doc, cells[4], cells[4])),
    );

    applyParagraphAttrs(editor, {
      leading: { mode: "points", value: 8 },
      lineGapPt: 2,
      spaceBeforePt: 5,
      spaceAfterPt: 7,
    });

    const paragraphs = paragraphAttrs(editor);
    paragraphs.forEach((attrs, index) => {
      if (index === 4) {
        expect(attrs.leading).toEqual({ mode: "points", value: 8 });
        expect(attrs.lineGapPt).toBe(2);
        expect(attrs.spaceBeforePt).toBe(5);
        expect(attrs.spaceAfterPt).toBe(7);
      } else {
        expect(attrs.leading ?? null).toBeNull();
        expect(attrs.lineGapPt ?? null).toBeNull();
        expect(attrs.spaceBeforePt ?? null).toBeNull();
        expect(attrs.spaceAfterPt ?? null).toBeNull();
      }
    });
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(1);
  });

  it("applies paragraph spacing to every paragraph inside one selected cell only", () => {
    const editor = new Editor({
      extensions: createDocumentStudioExtensions(),
      content: {
        type: "doc",
        content: [{
          type: "table",
          content: [{
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [
                  { type: "paragraph", content: [{ type: "text", text: "پہلا پیراگراف" }] },
                  { type: "paragraph", content: [{ type: "text", text: "دوسرا پیراگراف" }] },
                ],
              },
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "text", text: "دوسرا سیل" }] }],
              },
            ],
          }],
        }],
      },
    });
    editors.push(editor);
    const cells = cellPositions(editor);
    editor.view.dispatch(
      editor.state.tr.setSelection(CellSelection.create(editor.state.doc, cells[0], cells[0])),
    );

    applyParagraphAttrs(editor, {
      leading: { mode: "points", value: 9 },
      lineGapPt: 2,
      spaceBeforePt: 4,
      spaceAfterPt: 6,
    });

    const paragraphs: { cellPos: number | null; attrs: Record<string, unknown> }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "paragraph") return;
      const $pos = editor.state.doc.resolve(pos + 1);
      let cellPos: number | null = null;
      for (let depth = $pos.depth; depth > 0; depth -= 1) {
        if ($pos.node(depth).type.name === "tableCell") {
          cellPos = $pos.before(depth);
          break;
        }
      }
      paragraphs.push({ cellPos, attrs: node.attrs as Record<string, unknown> });
    });
    const selectedCellParagraphs = paragraphs.filter((item) => item.cellPos === cells[0]);
    const otherCellParagraphs = paragraphs.filter((item) => item.cellPos !== cells[0]);
    expect(selectedCellParagraphs).toHaveLength(2);
    expect(otherCellParagraphs.length).toBeGreaterThanOrEqual(1);
    for (const { attrs } of selectedCellParagraphs) {
      expect(attrs.leading).toEqual({ mode: "points", value: 9 });
      expect(attrs.lineGapPt).toBe(2);
      expect(attrs.spaceBeforePt).toBe(4);
      expect(attrs.spaceAfterPt).toBe(6);
    }
    for (const { attrs } of otherCellParagraphs) {
      expect(attrs.leading ?? null).toBeNull();
      expect(attrs.lineGapPt ?? null).toBeNull();
      expect(attrs.spaceBeforePt ?? null).toBeNull();
      expect(attrs.spaceAfterPt ?? null).toBeNull();
    }
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(1);
  });

  it("reads paragraph spacing only from cells included in a rectangular CellSelection", () => {
    const editor = createTableEditor();
    const cells = cellPositions(editor);
    const paragraphs = paragraphPositions(editor);
    let tr = editor.state.tr;
    for (const index of [0, 1, 3, 4]) {
      const node = tr.doc.nodeAt(paragraphs[index]);
      if (!node) throw new Error("Missing paragraph " + index);
      tr = tr.setNodeMarkup(paragraphs[index], undefined, {
        ...node.attrs,
        spaceBeforePt: 6,
        spaceAfterPt: 8,
      });
    }
    const unselected = tr.doc.nodeAt(paragraphs[2]);
    if (!unselected) throw new Error("Missing unselected paragraph");
    tr = tr.setNodeMarkup(paragraphs[2], undefined, {
      ...unselected.attrs,
      spaceBeforePt: 40,
      spaceAfterPt: 50,
    });
    tr = tr.setSelection(CellSelection.create(tr.doc, cells[0], cells[4]));
    editor.view.dispatch(tr);

    const ui = resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl");
    expect(ui.spaceBeforePt).toBe(6);
    expect(ui.spaceAfterPt).toBe(8);
    expect(ui.mixed.spaceBefore).toBe(false);
    expect(ui.mixed.spaceAfter).toBe(false);
  });
});
