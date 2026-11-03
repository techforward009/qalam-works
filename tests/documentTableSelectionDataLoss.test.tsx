/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { undoDepth } from "@tiptap/pm/history";
import { TextSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { QalamTableFormatAttributes } from "../app/tools/document-studio/utils/tableFormatAttributes";
import { QalamTableStableDirection } from "../app/tools/document-studio/utils/tableStableDirection";
import { QalamTableColumnResizing } from "../app/tools/document-studio/utils/tableColumnResizing";
import { LatinScriptRuns } from "../app/tools/document-studio/extensions/LatinScriptRuns";
import { AllahAutoMarks } from "../app/tools/document-studio/extensions/AllahAutoMarks";
import { undo } from "../app/tools/document-studio/utils/documentCommands";

/**
 * Cell-selection data-loss regression (Qalam Page tables).
 *
 * Live bug: drag-select 4 cells, click inside a different unselected cell and
 * press Space -> the 4 previously selected cells lost their text and Ctrl+Z did
 * not bring it back. Expected (InPage): the click clears the cell selection and
 * puts the caret in the clicked cell; Space inserts only a space there. Typing
 * over a *deliberately* active cell selection must be one undo step.
 */

const URDU_3X3_ROWS = [
  ["اردو متن", "پاکستان", "لاہور"],
  ["کراچی", "اسلام آباد", "پشاور"],
  ["کوئٹہ", "ملتان", "فیصل آباد"],
];
// Selected 2x2 block: (0,0), (0,1), (1,0), (1,1) -> flat indices [0, 1, 3, 4]
const SELECTED_4 = [0, 1, 3, 4] as const;
const UNSELECTED_5 = [2, 5, 6, 7, 8] as const;
const ORIGINAL = URDU_3X3_ROWS.flat();

const editors: Editor[] = [];
afterEach(() => {
  editors.splice(0).forEach((ed) => ed.destroy());
});

function makeTable(rows: string[][], boldFirstCell = false) {
  return {
    type: "doc",
    content: [{
      type: "table",
      attrs: { dir: "rtl", tableFlow: "rtl", tableAlignment: "right", tableIndentMm: 0, tableFormatWidthPx: 420 },
      content: rows.map((row, r) => ({
        type: "tableRow",
        content: row.map((text, c) => ({
          type: "tableCell",
          attrs: { colwidth: [140] },
          content: [{
            type: "paragraph",
            attrs: { dir: "rtl" },
            content: [{
              type: "text",
              text,
              ...(boldFirstCell && r === 0 && c === 0 ? { marks: [{ type: "bold" }] } : {}),
            }],
          }],
        })),
      })),
    }],
  };
}

function makeEditor(content: Record<string, unknown>) {
  // Same extension set the real Qalam Page editor mounts.
  const editor = new Editor({
    extensions: [
      ...createDocumentStudioExtensions(),
      QalamTableStableDirection,
      QalamTableFormatAttributes,
      QalamTableColumnResizing,
      LatinScriptRuns,
      AllahAutoMarks,
    ],
    content,
  });
  editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
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

function cellTexts(editor: Editor): string[] {
  const texts: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "tableCell") texts.push(node.textContent);
  });
  return texts;
}

function cellDom(editor: Editor, index: number): HTMLElement {
  const pos = cellPositions(editor)[index];
  const dom = editor.view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) throw new Error(`no DOM for cell ${index}`);
  return dom;
}

function selectCells(editor: Editor, anchorIdx: number, headIdx: number) {
  const cells = cellPositions(editor);
  editor.view.dispatch(
    editor.state.tr.setSelection(CellSelection.create(editor.state.doc, cells[anchorIdx], cells[headIdx])),
  );
  expect(editor.state.selection).toBeInstanceOf(CellSelection);
  expect(editor.state.selection.ranges).toHaveLength(4);
}

/** Index of the cell that holds the caret, or -1. */
function caretCellIndex(editor: Editor): number {
  const { selection } = editor.state;
  if (!(selection instanceof TextSelection)) return -1;
  const cells = cellPositions(editor);
  return cells.findIndex((pos) => selection.from > pos && selection.from < pos + editor.state.doc.nodeAt(pos)!.nodeSize);
}

/** A plain primary-button click on a cell, as the browser delivers it to the editor. */
function clickCell(editor: Editor, index: number, init: MouseEventInit = {}) {
  const target = cellDom(editor, index);
  const rect = target.getBoundingClientRect();
  const base = { bubbles: true, cancelable: true, button: 0, clientX: rect.left + 5, clientY: rect.top + 5, ...init };
  target.dispatchEvent(new MouseEvent("mousedown", { ...base, buttons: 1 }));
  target.dispatchEvent(new MouseEvent("mouseup", { ...base, buttons: 0 }));
  target.dispatchEvent(new MouseEvent("click", { ...base, buttons: 0 }));
}

function pressKey(editor: Editor, key: string) {
  const { view } = editor;
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  view.dom.dispatchEvent(event);
  if (event.defaultPrevented) return;
  view.someProp("handleKeyDown", (f) => f(view, event));
}

/**
 * Typing as ProseMirror receives it: a cancelable `beforeinput`, then (if the
 * app left it alone) the `handleTextInput` hook, then PM's own default of
 * replacing the selection range with the text.
 */
function typeText(editor: Editor, text: string) {
  const { view } = editor;
  const before = new InputEvent("beforeinput", { inputType: "insertText", data: text, bubbles: true, cancelable: true });
  view.dom.dispatchEvent(before);
  if (before.defaultPrevented) return;
  const { from, to } = view.state.selection;
  const handled = view.someProp("handleTextInput", (f) => f(view, from, to, text, () => view.state.tr.insertText(text, from, to)));
  if (!handled) view.dispatch(view.state.tr.insertText(text, from, to));
}

describe("Qalam Page table: clicking after a cell selection clears it; undo restores cell text", () => {
  it("1. CellSelection of 4 cells, click in another unselected cell, press Space -> only that cell gains a space; the 4 cells keep their text", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS));
    selectCells(editor, 0, 4);

    clickCell(editor, 8);

    // The click itself must already have cleared the cell selection and put the caret in cell 8.
    expect(editor.state.selection).not.toBeInstanceOf(CellSelection);
    expect(caretCellIndex(editor)).toBe(8);
    expect(cellTexts(editor)).toEqual(ORIGINAL);

    typeText(editor, " ");

    const texts = cellTexts(editor);
    for (const idx of SELECTED_4) expect(texts[idx]).toBe(ORIGINAL[idx]);
    for (const idx of UNSELECTED_5.filter((i) => i !== 8)) expect(texts[idx]).toBe(ORIGINAL[idx]);
    // The clicked cell gains exactly one space and nothing else.
    expect(texts[8]).toHaveLength(ORIGINAL[8].length + 1);
    expect(texts[8].replace(" ", "")).toBe(ORIGINAL[8]);
    // Table shape untouched.
    expect(cellPositions(editor)).toHaveLength(9);
    expect(editor.state.doc.firstChild!.childCount).toBe(3);
  });

  it("2. clicking a cell that is not in the selection but lies inside the selection's bounding range (row 0, col 2) also only adds a space there", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS));
    selectCells(editor, 0, 4);

    clickCell(editor, 2);
    expect(editor.state.selection).not.toBeInstanceOf(CellSelection);
    expect(caretCellIndex(editor)).toBe(2);

    typeText(editor, " ");
    const texts = cellTexts(editor);
    for (const idx of [0, 1, 3, 4, 5, 6, 7, 8]) expect(texts[idx]).toBe(ORIGINAL[idx]);
    expect(texts[2].replace(" ", "")).toBe(ORIGINAL[2]);
    expect(texts[2]).toHaveLength(ORIGINAL[2].length + 1);
  });

  it("3. a click inside one of the selected cells also collapses the cell selection to a caret without changing any text", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS));
    selectCells(editor, 0, 4);

    clickCell(editor, 1);
    expect(editor.state.selection).not.toBeInstanceOf(CellSelection);
    expect(caretCellIndex(editor)).toBe(1);
    expect(cellTexts(editor)).toEqual(ORIGINAL);
  });

  it("4. Shift+click still extends the cell selection and right-click keeps it (context menu needs it)", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS));
    selectCells(editor, 0, 4);

    clickCell(editor, 8, { button: 2, buttons: 2 });
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(4);

    clickCell(editor, 8, { shiftKey: true });
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(cellTexts(editor)).toEqual(ORIGINAL);
  });

  it("5. typing over an active CellSelection puts the text only in the drag-start cell, keeps the other selected cells, and one Ctrl+Z restores it", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS));
    selectCells(editor, 0, 4);
    expect(undoDepth(editor.state)).toBe(0);

    typeText(editor, " ");

    const typed = cellTexts(editor);
    expect(typed[SELECTED_4[0]]).toBe(" ");
    for (const idx of SELECTED_4.slice(1)) expect(typed[idx]).toBe(ORIGINAL[idx]);
    for (const idx of UNSELECTED_5) expect(typed[idx]).toBe(ORIGINAL[idx]);
    // The table keeps its 3x3 shape and the caret leaves cell-selection mode.
    expect(cellPositions(editor)).toHaveLength(9);
    expect(editor.state.doc.firstChild!.childCount).toBe(3);
    expect(editor.state.selection).not.toBeInstanceOf(CellSelection);
    // The whole overwrite is exactly one history event.
    expect(undoDepth(editor.state)).toBe(1);

    undo(editor);

    expect(cellTexts(editor)).toEqual(ORIGINAL);
    expect(undoDepth(editor.state)).toBe(0);
    expect(editor.getJSON()).toEqual(makeEditor(makeTable(URDU_3X3_ROWS)).getJSON());
  });

  it("6. typing Urdu text over a CellSelection keeps one undo step, and the typed text inherits the first cell's formatting", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS, true));
    const baseline = editor.getJSON();
    selectCells(editor, 0, 4);

    typeText(editor, "پ");

    expect(cellTexts(editor)[0]).toBe("پ");
    for (const idx of SELECTED_4.slice(1)) expect(cellTexts(editor)[idx]).toBe(ORIGINAL[idx]);
    const firstCell = (editor.getJSON() as any).content[0].content[0].content[0];
    expect(firstCell.content[0].content[0].marks).toEqual([{ type: "bold" }]);
    expect(undoDepth(editor.state)).toBe(1);

    undo(editor);
    expect(editor.getJSON()).toEqual(baseline);
  });

  it("7. a typing burst after the overwrite does not merge into the overwrite's undo step", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS));
    selectCells(editor, 0, 4);
    typeText(editor, "ا");
    typeText(editor, "ر");
    typeText(editor, "د");
    expect(cellTexts(editor)[0]).toBe("ارد");

    // First undo may peel the typing burst, but a bounded number of undos must bring every cell back.
    for (let i = 0; i < 3 && cellTexts(editor).join("|") !== ORIGINAL.join("|"); i++) undo(editor);
    expect(cellTexts(editor)).toEqual(ORIGINAL);
  });

  it("8. Backspace over an active CellSelection empties only the drag-start cell, keeps other cells, and one Ctrl+Z restores it", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS));
    selectCells(editor, 0, 4);
    expect(undoDepth(editor.state)).toBe(0);

    pressKey(editor, "Backspace");

    const after = cellTexts(editor);
    expect(after[0]).toBe("");
    for (const idx of [1, 2, 3, 4, 5, 6, 7, 8]) expect(after[idx]).toBe(ORIGINAL[idx]);
    expect(editor.state.selection).not.toBeInstanceOf(CellSelection);
    expect(undoDepth(editor.state)).toBe(1);

    undo(editor);
    expect(cellTexts(editor)).toEqual(ORIGINAL);
    expect(undoDepth(editor.state)).toBe(0);
  });

  it("9. drag selecting starting from bottom-right (cell 4 to 0) targets cell 4 on typing or Backspace", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS));
    selectCells(editor, 4, 0);

    pressKey(editor, "Backspace");

    const after = cellTexts(editor);
    expect(after[4]).toBe("");
    for (const idx of [0, 1, 2, 3, 5, 6, 7, 8]) expect(after[idx]).toBe(ORIGINAL[idx]);
    expect(editor.state.selection).not.toBeInstanceOf(CellSelection);

    undo(editor);
    expect(cellTexts(editor)).toEqual(ORIGINAL);
  });

  it("10. Delete over an active CellSelection empties ALL selected cells, and one Ctrl+Z restores and re-selects the block", () => {
    const editor = makeEditor(makeTable(URDU_3X3_ROWS));
    selectCells(editor, 0, 4);
    expect(undoDepth(editor.state)).toBe(0);

    pressKey(editor, "Delete");

    const after = cellTexts(editor);
    for (const idx of SELECTED_4) expect(after[idx]).toBe("");
    for (const idx of UNSELECTED_5) expect(after[idx]).toBe(ORIGINAL[idx]);
    expect(undoDepth(editor.state)).toBe(1);

    undo(editor);
    expect(cellTexts(editor)).toEqual(ORIGINAL);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(4);
    expect(undoDepth(editor.state)).toBe(0);
  });
});
