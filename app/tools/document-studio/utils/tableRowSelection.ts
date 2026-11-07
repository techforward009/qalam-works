import { Extension } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { Plugin, PluginKey, Selection, TextSelection } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Mappable } from "@tiptap/pm/transform";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

export const tableRowSelectionKey = new PluginKey("qalamTableRowSelection");

/** Text range crossing a table boundary; tableEditing rewrites boundary TextSelections. */
class MixedTableTextSelection extends Selection {
  visible = true;

  eq(other: Selection): boolean {
    return other instanceof MixedTableTextSelection
      && other.anchor === this.anchor && other.head === this.head;
  }

  map(doc: PMNode, mapping: Mappable): Selection {
    return new MixedTableTextSelection(
      doc.resolve(mapping.map(this.anchor)),
      doc.resolve(mapping.map(this.head)),
    );
  }

  toJSON() {
    return { type: "mixed-table-text", anchor: this.anchor, head: this.head };
  }

  static fromJSON(doc: PMNode, json: { anchor: number; head: number }) {
    return new MixedTableTextSelection(doc.resolve(json.anchor), doc.resolve(json.head));
  }
}

Selection.jsonID("mixed-table-text", MixedTableTextSelection);

function mixedTextSelection(doc: PMNode, anchor: number, head: number): Selection {
  return new MixedTableTextSelection(doc.resolve(anchor), doc.resolve(head));
}

type LocatedTable = { node: PMNode; pos: number; rows: Array<{ node: PMNode; pos: number }> };

function tablesIn(doc: PMNode): LocatedTable[] {
  const tables: LocatedTable[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "table") return;
    const rows: LocatedTable["rows"] = [];
    node.forEach((row, offset) => rows.push({ node: row, pos: pos + 1 + offset }));
    tables.push({ node, pos, rows });
  });
  return tables;
}

function rowForPosition(table: LocatedTable, pos: number): number {
  let result = -1;
  table.rows.forEach((row, index) => {
    if (pos >= row.pos && pos < row.pos + row.node.nodeSize) result = index;
  });
  return result;
}

function rowTextBoundary(row: PMNode, rowPos: number, down: boolean): number {
  const cells: Array<{ node: PMNode; pos: number }> = [];
  row.forEach((cell, offset) => cells.push({ node: cell, pos: rowPos + 1 + offset }));
  const cell = down ? cells[cells.length - 1] : cells[0];
  if (!cell) return down ? rowPos + row.nodeSize - 1 : rowPos + 1;
  let boundary = down ? cell.pos + cell.node.nodeSize - 1 : cell.pos + 1;
  cell.node.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const absolute = cell.pos + 1 + pos;
    boundary = down ? absolute + node.nodeSize - 1 : absolute + 1;
  });
  return boundary;
}

function firstCellPosition(row: PMNode, rowPos: number): number {
  let pos = rowPos + 1;
  row.forEach((_cell, offset) => { if (offset === 0) pos = rowPos + 1 + offset; });
  return pos;
}

function nearestTextPosition(view: EditorView, pos: number, bias: number): number {
  return TextSelection.near(view.state.doc.resolve(Math.max(0, Math.min(pos, view.state.doc.content.size))), bias).head;
}

function cellAt(doc: PMNode, pos: number): { from: number; to: number } | null {
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  for (let depth = $pos.depth; depth > 0; depth--) {
    const name = $pos.node(depth).type.name;
    if (name === "tableCell" || name === "tableHeader") return { from: $pos.before(depth), to: $pos.after(depth) };
  }
  return null;
}

function rangeIsInsideOneCell(doc: PMNode, from: number, to: number): boolean {
  let inside = false;
  doc.descendants((node, pos) => {
    if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") return true;
    if (from >= pos + 1 && to <= pos + node.nodeSize - 1) inside = true;
    return false;
  });
  return inside;
}

function cellTextBounds(doc: PMNode, cell: { from: number; to: number }) {
  const node = doc.nodeAt(cell.from);
  if (!node) return null;
  let start: number | null = null;
  let end: number | null = null;
  node.forEach((block, offset) => {
    if (!block.isTextblock) return;
    const blockPos = cell.from + 1 + offset;
    if (start === null) start = blockPos + 1;
    end = blockPos + block.nodeSize - 1;
  });
  return start === null || end === null ? null : { start, end };
}

function ensureTableParagraph(state: import("@tiptap/pm/state").EditorState) {
  const { doc, schema } = state;
  const paragraph = schema.nodes.paragraph;
  if (!paragraph) return null;
  let position = 0;
  let previous: PMNode | null = null;
  const insertions: number[] = [];
  doc.forEach((node, offset) => {
    if (previous?.type.name === "table" && node.type.name === "table") insertions.push(position);
    position = offset + node.nodeSize;
    previous = node;
  });
  if (doc.lastChild?.type.name === "table") insertions.push(doc.content.size);
  if (!insertions.length) return null;
  const tr = state.tr;
  for (const at of insertions.reverse()) tr.insert(at, paragraph.create());
  return tr.setMeta("addToHistory", false);
}

function selectByRow(view: EditorView, down: boolean): boolean {
  const { state } = view;
  const { selection, doc } = state;
  const tables = tablesIn(doc);
  if (!tables.length) return false;
  const head = selection.head;
  let table = tables.find((item) => head > item.pos && head < item.pos + item.node.nodeSize);
  let rowIndex = table ? rowForPosition(table, head) : -1;

  if (selection instanceof CellSelection) {
    const active = tables.find((item) => head >= item.pos && head <= item.pos + item.node.nodeSize);
    if (!active) return false;
    const anchorIndex = rowForPosition(active, selection.$anchorCell.pos);
    const current = rowForPosition(active, selection.$headCell.pos);
    const target = current + (down ? 1 : -1);
    if (target >= 0 && target < active.rows.length) {
      view.dispatch(state.tr.setSelection(CellSelection.rowSelection(
        doc.resolve(firstCellPosition(active.rows[anchorIndex].node, active.rows[anchorIndex].pos)),
        doc.resolve(firstCellPosition(active.rows[target].node, active.rows[target].pos)),
      )));
      return true;
    }
    const outside = down ? active.pos + active.node.nodeSize : active.pos;
    const nextText = down
      ? doc.childAfter(outside).node
      : doc.childBefore(outside).node;
    if (!nextText) return false;
    const targetPos = nearestTextPosition(view, down ? outside + 1 : outside - 1, down ? 1 : -1);
    const anchorPos = selection.$anchorCell.pos + 2;
    view.dispatch(state.tr.setSelection(mixedTextSelection(doc, anchorPos, targetPos)));
    return true;
  }

  if (table && rowIndex >= 0) {
    const anchorInTable = tables.some((item) => selection.anchor > item.pos && selection.anchor < item.pos + item.node.nodeSize);
    if (!anchorInTable) {
      const coveredRows = table.rows.map((row, index) => ({ row, index }))
        .filter(({ row }) => row.pos < selection.to && row.pos + row.node.nodeSize > selection.from)
        .map(({ index }) => index);
      const edgeRow = coveredRows.length
        ? (down ? Math.max(...coveredRows) : Math.min(...coveredRows))
        : rowIndex;
      const targetRow = edgeRow + (down ? 1 : -1);
      if (targetRow < 0 || targetRow >= table.rows.length) return false;
      const boundary = rowTextBoundary(table.rows[targetRow].node, table.rows[targetRow].pos, down);
      const target = nearestTextPosition(view, boundary, down ? -1 : 1);
      view.dispatch(state.tr.setSelection(mixedTextSelection(doc, selection.anchor, target)));
      return true;
    }
    const anchorRow = rowIndex;
    const targetRow = rowIndex + (down ? 1 : -1);
    if (targetRow < 0 || targetRow >= table.rows.length) {
      if (down && rowIndex === table.rows.length - 1) {
        const tableEnd = table.pos + table.node.nodeSize;
        const next = doc.childAfter(tableEnd).node;
        if (next?.type.name === "paragraph") {
          const target = nearestTextPosition(view, tableEnd + 1, 1);
          view.dispatch(state.tr.setSelection(mixedTextSelection(doc, selection.anchor, target)));
          return true;
        }
      }
      return false;
    }
    view.dispatch(state.tr.setSelection(CellSelection.rowSelection(
      doc.resolve(firstCellPosition(table.rows[anchorRow].node, table.rows[anchorRow].pos)),
      doc.resolve(firstCellPosition(table.rows[targetRow].node, table.rows[targetRow].pos)),
    )));
    return true;
  }

  if (!table) {
    const $head = doc.resolve(head);
    if ($head.parent.isTextblock) {
      const blockStart = $head.start();
      const blockEnd = $head.end();
      if (down ? head < blockEnd : head > blockStart) return false;
    }
    table = down
      ? tables.find((item) => item.pos > head)
      : [...tables].reverse().find((item) => item.pos + item.node.nodeSize < head);
    if (!table) return false;
    rowIndex = down ? 0 : table.rows.length - 1;
  } else {
    rowIndex += down ? 1 : -1;
  }

  if (rowIndex < 0 || rowIndex >= table.rows.length) return false;
  const boundary = rowTextBoundary(table.rows[rowIndex].node, table.rows[rowIndex].pos, down);
  const anchor = selection.anchor;
  const target = nearestTextPosition(view, boundary, down ? -1 : 1);
  if (target === anchor) return false;
  view.dispatch(state.tr.setSelection(mixedTextSelection(doc, anchor, target)));
  return true;
}


/** Expand a drag/select that crosses a table so every touched row is fully covered. */
function expandMixedRowSelection(state: import("@tiptap/pm/state").EditorState) {
  const { selection, doc } = state;
  if (selection.empty || selection instanceof CellSelection) return null;
  if (selection instanceof MixedTableTextSelection) {
    // Already a mixed selection; still ensure head sits on a row boundary if needed.
  }
  const tables = tablesIn(doc);
  if (!tables.length) return null;
  const from = selection.from;
  const to = selection.to;
  const anchor = selection.anchor;
  const head = selection.head;
  if (rangeIsInsideOneCell(doc, from, to)) return null;
  const forward = head >= anchor;

  let changed = false;
  let newFrom = from;
  let newTo = to;

  for (const table of tables) {
    const tableStart = table.pos;
    const tableEnd = table.pos + table.node.nodeSize;
    if (to <= tableStart || from >= tableEnd) continue;
    // Selection intersects this table.
    const covered = table.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.pos < to && row.pos + row.node.nodeSize > from);
    if (!covered.length) continue;
    const first = covered[0].row;
    const last = covered[covered.length - 1].row;
    const rowStart = first.pos;
    const rowEnd = last.pos + last.node.nodeSize;
    // Expand to full covered rows.
    if (from > rowStart && from < tableEnd) {
      newFrom = Math.min(newFrom, rowStart);
      changed = true;
    }
    if (to < rowEnd && to > tableStart) {
      newTo = Math.max(newTo, rowEnd);
      changed = true;
    }
    // If one end is outside the table, keep that outside end as-is (already in from/to).
  }

  if (!changed && !(selection instanceof MixedTableTextSelection)) {
    // Even without numeric expansion, promote crossing selections to Mixed so
    // tableEditing normalizeSelection cannot collapse them.
    const crosses = tables.some((table) => {
      const start = table.pos;
      const end = table.pos + table.node.nodeSize;
      const aOut = anchor <= start || anchor >= end;
      const hIn = head > start && head < end;
      const hOut = head <= start || head >= end;
      const aIn = anchor > start && anchor < end;
      return (aOut && hIn) || (hOut && aIn) || (from < start && to > end);
    });
    if (!crosses) return null;
  } else if (!changed && selection instanceof MixedTableTextSelection) {
    return null;
  }

  const newAnchor = forward ? newFrom : newTo;
  const newHead = forward ? newTo : newFrom;
  if (newAnchor === selection.anchor && newHead === selection.head && selection instanceof MixedTableTextSelection) {
    return null;
  }
  return state.tr.setSelection(mixedTextSelection(doc, newAnchor, newHead));
}

export const QalamTableRowSelection = Extension.create({
  name: "qalamTableRowSelection",
  priority: 1000,
  addProseMirrorPlugins() {
    return [new Plugin({
      key: tableRowSelectionKey,
      appendTransaction(_transactions, _oldState, state) {
        return ensureTableParagraph(state) ?? expandMixedRowSelection(state);
      },
      props: {
        decorations(state) {
          const selection = state.selection;
          if (selection.empty || selection instanceof CellSelection) return null;
          if (!(selection instanceof MixedTableTextSelection) && rangeIsInsideOneCell(state.doc, selection.from, selection.to)) return null;
          const decorations: Decoration[] = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name !== "tableRow") return;
            if (pos < selection.to && pos + node.nodeSize > selection.from) {
              node.forEach((cell, offset) => {
                const cellPos = pos + 1 + offset;
                decorations.push(Decoration.node(cellPos, cellPos + cell.nodeSize, { class: "qalam-row-selected" }));
              });
            }
          });
          return decorations.length ? DecorationSet.create(state.doc, decorations) : null;
        },
        handleKeyDown(view, event) {
          if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return false;
          const { selection, doc } = view.state;
          const anchorCell = cellAt(doc, selection.anchor);
          const headCell = cellAt(doc, selection.head);
          if (anchorCell && headCell && anchorCell.from === headCell.from && !selection.empty) {
            const bounds = cellTextBounds(doc, anchorCell);
            const fullCellSelected = Boolean(bounds && selection.from <= bounds.start && selection.to >= bounds.end);
            if (!fullCellSelected) return false;
          }
          const handled = selectByRow(view, event.key === "ArrowDown");
          if (handled) event.preventDefault();
          return handled;
        },
        handleDOMEvents: {
          mouseup(view, event) {
            const selection = view.state.selection;
            if (!(selection instanceof CellSelection)) return false;
            const native = view.dom.ownerDocument.getSelection();
            if (!native || native.isCollapsed || !native.anchorNode || !native.focusNode) return false;
            const cellFor = (node: Node) => (node instanceof Element ? node : node.parentElement)?.closest("td,th");
            const anchorCell = cellFor(native.anchorNode);
            if (!anchorCell || anchorCell !== cellFor(native.focusNode) || !view.dom.contains(anchorCell)) return false;
            try {
              const anchor = view.posAtDOM(native.anchorNode, native.anchorOffset);
              const head = view.posAtDOM(native.focusNode, native.focusOffset);
              const textSelection = TextSelection.between(view.state.doc.resolve(anchor), view.state.doc.resolve(head));
              view.dispatch(view.state.tr.setSelection(textSelection));
              event.preventDefault();
              return true;
            } catch {
              return false;
            }
          },
        },
      },
    })];
  },
});
