/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { TextSelection } from "@tiptap/pm/state";
import { tableRowSelectionKey } from "../app/tools/document-studio/utils/tableRowSelection";
import { moveTableCell } from "../app/tools/document-studio/utils/tableCellNavigation";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";

let editor: Editor | null = null;
afterEach(() => { editor?.destroy(); editor = null; });

function make() {
  editor = new Editor({
    extensions: createDocumentStudioExtensions(),
    content: "<p>ABOVE</p><table><tbody><tr><td><p>11</p></td><td><p>12</p></td></tr><tr><td><p>21</p></td><td><p>22</p></td></tr><tr><td><p>31</p></td><td><p>32</p></td></tr></tbody></table><p>BELOW</p>",
  });
  return editor;
}

function key(ed: Editor, direction: "ArrowDown" | "ArrowUp") {
  const event = { key: direction, shiftKey: true, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} } as KeyboardEvent;
  let handled = false;
  ed.view.someProp("handleKeyDown", (handler) => {
    if (handler(ed.view, event)) { handled = true; return true; }
    return false;
  });
  return handled;
}

function paragraphPos(ed: Editor, text: string) {
  let found = -1;
  ed.state.doc.descendants((node, pos) => { if (node.isTextblock && node.textContent === text) found = pos; });
  return found;
}

describe("table row selection", () => {
  it("does not decorate a non-empty text selection inside one table cell", () => {
    const ed = make();
    const start = paragraphPos(ed, "21") + 1;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, start, start + 1)));
    const plugin = tableRowSelectionKey.get(ed.state);
    if (!plugin) throw new Error("Table row selection plugin is missing");
    const decorations = plugin.spec.props?.decorations?.call(plugin, ed.state);
    expect(decorations).toBeNull();
  });

  it("keeps a drag selection inside one cell as ordinary text and expands only after that cell is selected", () => {
    const ed = make();
    const start = paragraphPos(ed, "21") + 1;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, start, start + 1)));
    expect(ed.state.selection).toBeInstanceOf(TextSelection);
    expect(ed.state.selection.from).toBe(start);
    expect(ed.state.selection.to).toBe(start + 1);
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, paragraphPos(ed, "21") + 1, paragraphPos(ed, "21") + 3)));
    expect(ed.state.selection).toBeInstanceOf(TextSelection);
    expect(ed.state.selection.to).toBe(paragraphPos(ed, "21") + 3);
  });

  it("extends full rows on the press after a text selection reaches the complete cell", () => {
    const ed = make();
    const start = paragraphPos(ed, "21") + 1;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, start, start + 2)));
    expect(ed.state.selection).toBeInstanceOf(TextSelection);
    expect(key(ed, "ArrowDown")).toBe(true);
    expect(ed.state.selection).toBeInstanceOf(CellSelection);
    expect(ed.state.selection.to).toBeGreaterThan(paragraphPos(ed, "32"));
  });

  it("moves to adjacent cells with all destination text selected, or a caret for an empty cell", () => {
    const ed = make();
    const first = paragraphPos(ed, "11") + 2;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, first)));
    expect(moveTableCell(ed.view, 1)).toBe(true);
    expect(ed.state.doc.textBetween(ed.state.selection.from, ed.state.selection.to)).toBe("12");
    const empty = new Editor({ extensions: createDocumentStudioExtensions(), content: "<table><tbody><tr><td><p>A</p></td><td><p></p></td></tr></tbody></table>" });
    try {
      const p = paragraphPos(empty, "A") + 2;
      empty.view.dispatch(empty.state.tr.setSelection(TextSelection.create(empty.state.doc, p)));
      expect(moveTableCell(empty.view, 1)).toBe(true);
      expect(empty.state.selection.empty).toBe(true);
    } finally { empty.destroy(); }
  });

  it("adds a history-free paragraph after a final table and between adjacent tables", () => {
    const final = new Editor({ extensions: createDocumentStudioExtensions(), content: "<table><tbody><tr><td><p>A</p></td></tr></tbody></table>" });
    try {
      final.view.dispatch(final.state.tr.setMeta("test-trigger", true).setMeta("addToHistory", false));
      expect(final.state.doc.lastChild?.type.name).toBe("paragraph");
      expect(final.state.doc.lastChild?.textContent).toBe("");
      expect(final.can().undo()).toBe(false);
      const lastText = paragraphPos(final, "A") + 2;
      final.view.dispatch(final.state.tr.setSelection(TextSelection.create(final.state.doc, lastText + 1)));
      const table = final.state.doc.firstChild!;
      expect(key(final, "ArrowDown")).toBe(true);
      expect(final.state.selection.to).toBeGreaterThan(table.nodeSize);
    } finally { final.destroy(); }
    const adjacent = new Editor({ extensions: createDocumentStudioExtensions(), content: "<table><tbody><tr><td><p>A</p></td></tr></tbody></table><table><tbody><tr><td><p>B</p></td></tr></tbody></table>" });
    try {
      adjacent.view.dispatch(adjacent.state.tr.setMeta("test-trigger", true).setMeta("addToHistory", false));
      const names: string[] = [];
      adjacent.state.doc.forEach((node) => names.push(node.type.name));
      expect(names).toContain("paragraph");
      expect(names.some((name, index) => name === "table" && names[index + 1] === "table")).toBe(false);
    } finally { adjacent.destroy(); }
  });

  it("extends from above through every full row without losing the text anchor", () => {
    const ed = make();
    const anchor = paragraphPos(ed, "ABOVE") + ed.state.doc.nodeAt(paragraphPos(ed, "ABOVE"))!.nodeSize - 1;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, anchor)));
    expect(key(ed, "ArrowDown")).toBe(true); // remaining text and first row
    const fixedAnchor = ed.state.selection.anchor;
    expect(key(ed, "ArrowDown")).toBe(true);
    expect(ed.state.selection.anchor).toBe(fixedAnchor);
    expect(key(ed, "ArrowDown")).toBe(true);
    expect(ed.state.selection.anchor).toBe(fixedAnchor);
    expect(ed.state.selection.from).toBe(anchor);
    expect(ed.state.selection.to).toBeGreaterThan(paragraphPos(ed, "32"));
  });

  it("extends upward from below and keeps the original anchor", () => {
    const ed = make();
    const anchor = paragraphPos(ed, "BELOW") + 1;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, anchor)));
    for (let i = 0; i < 3; i++) expect(key(ed, "ArrowUp")).toBe(true);
    expect(ed.state.selection.anchor).toBe(anchor);
    expect(ed.state.selection.from).toBeLessThanOrEqual(paragraphPos(ed, "11") + 1);
  });

  it("selects complete rows from a cell caret and retains the last row at the table edge", () => {
    const ed = make();
    const cellPos = paragraphPos(ed, "21") + 2;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, cellPos)));
    expect(key(ed, "ArrowDown")).toBe(true);
    expect(ed.state.selection).toBeInstanceOf(CellSelection);
    expect(key(ed, "ArrowDown")).toBe(true);
    expect(ed.state.selection.empty).toBe(false);
    expect(ed.state.selection.to).toBeGreaterThan(paragraphPos(ed, "32"));
  });

  it("does not collapse when reaching the last table row", () => {
    const ed = make();
    const abovePos = paragraphPos(ed, "ABOVE");
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, abovePos + ed.state.doc.nodeAt(abovePos)!.nodeSize - 1)));
    for (let i = 0; i < 4; i++) key(ed, "ArrowDown");
    expect(ed.state.selection.empty).toBe(false);
    expect(ed.state.selection.from).toBe(abovePos + ed.state.doc.nodeAt(abovePos)!.nodeSize - 1);
  });
});
