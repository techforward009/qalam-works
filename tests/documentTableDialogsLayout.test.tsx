/** @vitest-environment happy-dom */
/**
 * Render, layout-order, Win7 chrome, and Urdu handler tests for
 * StudioTableLayoutDialog and StudioTableFormatDialog (InPage 2009 on Windows 7).
 */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { QalamTableFormatAttributes } from "../app/tools/document-studio/utils/tableFormatAttributes";
import { QalamTableStableDirection } from "../app/tools/document-studio/utils/tableStableDirection";
import { StudioTableLayoutDialog } from "../app/tools/document-studio/components/StudioTableLayoutDialog";
import { StudioTableFormatDialog } from "../app/tools/document-studio/components/StudioTableFormatDialog";

let activeEditor: Editor | null = null;

function createUrduTableEditor(rows = 2, cols = 2): Editor {
  const sampleCells = [
    ["اردو متن", "پاکستان"],
    ["لاہور", "کراچی"],
    ["اسلام آباد", "ملتان"],
  ];
  const tableRows = Array.from({ length: rows }, (_, r) => ({
    type: "tableRow",
    content: Array.from({ length: cols }, (__, c) => ({
      type: "tableCell",
      attrs: {},
      content: [
        {
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [{ type: "text", text: sampleCells[r % sampleCells.length][c % 2] }],
        },
      ],
    })),
  }));
  const editor = new Editor({
    extensions: [
      ...createDocumentStudioExtensions(),
      QalamTableStableDirection,
      QalamTableFormatAttributes,
    ],
    content: {
      type: "doc",
      content: [{ type: "table", attrs: { dir: "rtl", tableFlow: "rtl" }, content: tableRows }],
    },
  });
  // Place caret inside the first cell ("اردو متن")
  editor.commands.setTextSelection(4);
  activeEditor = editor;
  return editor;
}

function cellPositions(editor: Editor): number[] {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "tableCell") positions.push(pos);
  });
  return positions;
}

afterEach(() => {
  cleanup();
  activeEditor?.destroy();
  activeEditor = null;
});

describe("Shared Windows 7 InPage dialog frame chrome", () => {
  it("gives both Table Layout and Table Format the shared Win7 blue title bar with left title and right red X", () => {
    const editor = createUrduTableEditor();
    const onCloseLayout = vi.fn();
    const { unmount } = render(<StudioTableLayoutDialog editor={editor} onClose={onCloseLayout} />);

    const layoutDlg = screen.getByRole("dialog", { name: "Table Layout" });
    expect(layoutDlg.getAttribute("data-inpage-win7-dialog")).toBe("true");
    const layoutTitle = layoutDlg.querySelector<HTMLElement>("[data-win7-title]");
    expect(layoutTitle).not.toBeNull();
    expect(layoutTitle!.textContent).toBe("Table Layout");
    expect(layoutTitle!.style.textAlign).toBe("left");
    expect(layoutTitle!.style.color).not.toBe("rgb(255, 255, 255)");
    expect(layoutTitle!.style.color).not.toBe("#fff");
    expect(layoutTitle!.style.color).not.toBe("white");

    const layoutHandle = layoutDlg.querySelector<HTMLElement>("[data-studio-dialog-drag-handle]");
    expect(layoutHandle).not.toBeNull();
    expect(layoutHandle!.style.cursor).toBe("default");
    expect(layoutHandle!.querySelector("svg")).toBeNull();
    expect(layoutDlg.querySelector('button[aria-label="Title bar help"]')).toBeNull();

    const layoutClose = within(layoutDlg).getByRole("button", { name: "Close" });
    expect(layoutClose.getAttribute("data-win7-close")).toBe("true");
    fireEvent.click(layoutClose);
    expect(onCloseLayout).toHaveBeenCalledTimes(1);
    unmount();

    const onCloseFormat = vi.fn();
    render(<StudioTableFormatDialog editor={editor} onClose={onCloseFormat} />);
    const formatDlg = screen.getByRole("dialog", { name: "Table Format" });
    expect(formatDlg.getAttribute("data-inpage-win7-dialog")).toBe("true");
    const formatTitle = formatDlg.querySelector<HTMLElement>("[data-win7-title]");
    expect(formatTitle).not.toBeNull();
    expect(formatTitle!.textContent).toBe("Table Format");
    expect(formatTitle!.style.textAlign).toBe("left");
    expect(formatTitle!.style.color).not.toBe("rgb(255, 255, 255)");
    expect(formatDlg.querySelector('button[aria-label="Title bar help"]')).toBeNull();

    const formatClose = within(formatDlg).getByRole("button", { name: "Close" });
    expect(formatClose.getAttribute("data-win7-close")).toBe("true");
    fireEvent.click(formatClose);
    expect(onCloseFormat).toHaveBeenCalledTimes(1);
  });
});

describe("StudioTableLayoutDialog – InPage 2009 Win7 compact layout & Urdu behaviour", () => {
  it("uses a compact ~75mm x 45mm box with stacked (Row/Column) above (Before/After), right Cancel/Help/Insert/Delete, and wide bottom Merge Selection", () => {
    const editor = createUrduTableEditor();
    render(<StudioTableLayoutDialog editor={editor} onClose={() => {}} />);

    const dlg = screen.getByRole("dialog", { name: "Table Layout" });
    const widthPx = parseFloat(dlg.style.width);
    const heightPx = parseFloat(dlg.style.height);
    // ~75mm x 45mm at 96dpi is ~283px x 170px
    expect(widthPx).toBeGreaterThanOrEqual(260);
    expect(widthPx).toBeLessThanOrEqual(300);
    expect(heightPx).toBeGreaterThanOrEqual(150);
    expect(heightPx).toBeLessThanOrEqual(185);

    // Radios in exact order: Row, Column, Before, After
    const radios = within(dlg).getAllByRole("radio");
    expect(radios.map((r) => r.closest("label")?.textContent?.trim())).toEqual([
      "Row",
      "Column",
      "Before",
      "After",
    ]);
    expect((within(dlg).getByRole("radio", { name: "Row" }) as HTMLInputElement).checked).toBe(true);
    expect((within(dlg).getByRole("radio", { name: "Before" }) as HTMLInputElement).checked).toBe(true);

    // Two left groups are stacked vertically (Before/After group below Row/Column group)
    const groups = within(dlg).getAllByRole("group");
    expect(groups).toHaveLength(2);
    const axisGroupTop = parseFloat((groups[0] as HTMLElement).style.top);
    const axisGroupHeight = parseFloat((groups[0] as HTMLElement).style.height);
    const placeGroupTop = parseFloat((groups[1] as HTMLElement).style.top);
    expect(placeGroupTop).toBeGreaterThanOrEqual(axisGroupTop + axisGroupHeight);
    expect(parseFloat((groups[0] as HTMLElement).style.left)).toBe(
      parseFloat((groups[1] as HTMLElement).style.left)
    );

    // Right column buttons in exact DOM and vertical order: Cancel, Help, Insert, Delete (same width)
    const actionNames = ["Cancel", "Help", "Insert", "Delete"] as const;
    const allButtons = within(dlg).getAllByRole("button");
    const indices = actionNames.map((name) =>
      allButtons.findIndex((b) => b.textContent?.trim() === name)
    );
    expect(indices[0]).toBeGreaterThanOrEqual(0);
    expect(indices[0]).toBeLessThan(indices[1]);
    expect(indices[1]).toBeLessThan(indices[2]);
    expect(indices[2]).toBeLessThan(indices[3]);

    const actionEls = actionNames.map((name) => within(dlg).getByRole("button", { name }));
    const widths = actionEls.map((b) => parseFloat((b as HTMLElement).style.width));
    const lefts = actionEls.map((b) => parseFloat((b as HTMLElement).style.left));
    const tops = actionEls.map((b) => parseFloat((b as HTMLElement).style.top));
    expect(new Set(widths).size).toBe(1);
    expect(new Set(lefts).size).toBe(1);
    expect(tops[0]).toBeLessThan(tops[1]);
    expect(tops[1]).toBeLessThan(tops[2]);
    expect(tops[2]).toBeLessThan(tops[3]);

    // Wide "Merge Selection" button across the bottom, after Delete
    const mergeBtn = within(dlg).getByRole("button", { name: "Merge Selection" });
    expect(allButtons.indexOf(mergeBtn)).toBeGreaterThan(indices[3]);
    expect(parseFloat((mergeBtn as HTMLElement).style.top)).toBeGreaterThan(tops[3]);
    expect(parseFloat((mergeBtn as HTMLElement).style.width)).toBeGreaterThan(widths[0] * 2);
  });

  it("inserts and deletes rows and columns while preserving Urdu text ('اردو متن', 'پاکستان')", () => {
    const editor = createUrduTableEditor(2, 2);
    const onClose = vi.fn();

    // Insert Column After
    const { unmount } = render(<StudioTableLayoutDialog editor={editor} onClose={onClose} />);
    const dlg = screen.getByRole("dialog", { name: "Table Layout" });
    fireEvent.click(within(dlg).getByRole("radio", { name: "Column" }));
    fireEvent.click(within(dlg).getByRole("radio", { name: "After" }));
    fireEvent.click(within(dlg).getByRole("button", { name: "Insert" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    let tableJson = (editor.getJSON() as any).content[0];
    expect(tableJson.content).toHaveLength(2);
    expect(tableJson.content[0].content).toHaveLength(3);
    expect(JSON.stringify(tableJson)).toContain("اردو متن");
    expect(JSON.stringify(tableJson)).toContain("پاکستان");
    unmount();

    // Delete Row
    editor.commands.setTextSelection(4);
    const onClose2 = vi.fn();
    const { unmount: unmount2 } = render(<StudioTableLayoutDialog editor={editor} onClose={onClose2} />);
    const dlg2 = screen.getByRole("dialog", { name: "Table Layout" });
    fireEvent.click(within(dlg2).getByRole("button", { name: "Delete" }));
    expect(onClose2).toHaveBeenCalledTimes(1);
    tableJson = (editor.getJSON() as any).content[0];
    expect(tableJson.content).toHaveLength(1);
    expect(JSON.stringify(tableJson)).toContain("لاہور");
    unmount2();
  });

  it("merges selected Urdu cells via Merge Selection and splits them back, while Cancel/Escape/Help preserve content", () => {
    const editor = createUrduTableEditor(2, 2);
    const positions = cellPositions(editor);
    editor.view.dispatch(
      editor.state.tr.setSelection(CellSelection.create(editor.state.doc, positions[0], positions[1]))
    );

    const onClose = vi.fn();
    const { unmount } = render(<StudioTableLayoutDialog editor={editor} onClose={onClose} />);
    const dlg = screen.getByRole("dialog", { name: "Table Layout" });

    // Help shows status without changing the table
    const beforeHelp = editor.getJSON();
    fireEvent.click(within(dlg).getByRole("button", { name: "Help" }));
    expect(within(dlg).getByRole("status")).toBeTruthy();
    expect(editor.getJSON()).toEqual(beforeHelp);

    const mergeBtn = within(dlg).getByRole("button", { name: "Merge Selection" }) as HTMLButtonElement;
    expect(mergeBtn.disabled).toBe(false);
    fireEvent.click(mergeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const mergedTable = (editor.getJSON() as any).content[0];
    expect(mergedTable.content[0].content).toHaveLength(1);
    expect(JSON.stringify(mergedTable)).toContain("اردو متن");
    expect(JSON.stringify(mergedTable)).toContain("پاکستان");
    unmount();

    // Place caret in merged cell -> bottom button offers Split Cell
    const afterMergePositions = cellPositions(editor);
    editor.commands.setTextSelection(afterMergePositions[0] + 2);
    const onCloseSplit = vi.fn();
    const { unmount: unmountSplit } = render(
      <StudioTableLayoutDialog editor={editor} onClose={onCloseSplit} />
    );
    const splitDlg = screen.getByRole("dialog", { name: "Table Layout" });
    const splitBtn = within(splitDlg).getByRole("button", { name: "Split Cell" }) as HTMLButtonElement;
    expect(splitBtn.disabled).toBe(false);
    fireEvent.click(splitBtn);
    expect(onCloseSplit).toHaveBeenCalledTimes(1);
    expect(((editor.getJSON() as any).content[0].content[0].content)).toHaveLength(2);
    unmountSplit();

    // Escape closes without altering JSON
    const snapshot = editor.getJSON();
    const onCloseEsc = vi.fn();
    render(<StudioTableLayoutDialog editor={editor} onClose={onCloseEsc} />);
    const escDlg = screen.getByRole("dialog", { name: "Table Layout" });
    fireEvent.keyDown(escDlg.closest("[data-studio-zoom-scope]") ?? escDlg, { key: "Escape" });
    expect(onCloseEsc).toHaveBeenCalledTimes(1);
    expect(editor.getJSON()).toEqual(snapshot);
  });
});

describe("StudioTableFormatDialog – ~1.5x smaller InPage 2009 Win7 layout & Urdu behaviour", () => {
  it("is ~1.5x smaller than the old 505x282 dialog and renders all InPage groups and controls in order", () => {
    const editor = createUrduTableEditor();
    render(<StudioTableFormatDialog editor={editor} onClose={() => {}} />);

    const dlg = screen.getByRole("dialog", { name: "Table Format" });
    const widthPx = parseFloat(dlg.style.width);
    const heightPx = parseFloat(dlg.style.height);
    // ~1.5x smaller than 505x282 (~336-360 x 175-195)
    expect(widthPx).toBeGreaterThanOrEqual(320);
    expect(widthPx).toBeLessThanOrEqual(365);
    expect(heightPx).toBeGreaterThanOrEqual(165);
    expect(heightPx).toBeLessThanOrEqual(198);

    // Groups exist in order: Cell, Border, Column, Table
    const groupNames = Array.from(dlg.querySelectorAll("fieldset[data-classic-group]")).map((el) =>
      el.getAttribute("data-classic-group")
    );
    expect(groupNames).toEqual(["Cell", "Border", "Column", "Table"]);

    // Controls exist and reflect defaults
    expect((within(dlg).getByLabelText("Fill Color") as HTMLSelectElement).value).toBe("None");
    expect((within(dlg).getByLabelText("Border Color") as HTMLSelectElement).value).toBe("#000000");
    expect((within(dlg).getByLabelText("Border Style") as HTMLSelectElement).value).toBe("solid");
    expect((within(dlg).getByLabelText("Border Width") as HTMLInputElement).value).toBe("0.5pt");
    expect((within(dlg).getByLabelText("Column Width") as HTMLInputElement).value).toMatch(/mm$/);
    expect((within(dlg).getByLabelText("Column Gap") as HTMLInputElement).value).toBe("1.41mm");
    expect((within(dlg).getByLabelText("Table Indent") as HTMLInputElement).value).toBe("0mm");
    expect((within(dlg).getByLabelText("Table Alignment") as HTMLSelectElement).value).toBe("right");
    expect((within(dlg).getByRole("checkbox", { name: "Split Table Row" }) as HTMLInputElement).checked).toBe(false);

    // Right buttons in order: OK, Cancel, Help
    const allButtons = within(dlg).getAllByRole("button");
    const okIdx = allButtons.findIndex((b) => b.textContent?.trim() === "OK");
    const cancelIdx = allButtons.findIndex((b) => b.textContent?.trim() === "Cancel");
    const helpIdx = allButtons.findIndex((b) => b.textContent?.trim() === "Help");
    expect(okIdx).toBeGreaterThanOrEqual(0);
    expect(okIdx).toBeLessThan(cancelIdx);
    expect(cancelIdx).toBeLessThan(helpIdx);
  });

  it("applies cell fill, border, column, table alignment, and Split Table Row on Urdu table while Cancel leaves JSON untouched", () => {
    const editor = createUrduTableEditor(2, 2);
    const original = editor.getJSON();

    // Cancel leaves Urdu table unchanged
    const onCancel = vi.fn();
    const { unmount } = render(<StudioTableFormatDialog editor={editor} onClose={onCancel} />);
    const cancelDlg = screen.getByRole("dialog", { name: "Table Format" });
    fireEvent.change(within(cancelDlg).getByLabelText("Fill Color"), { target: { value: "#FFFF00" } });
    fireEvent.click(within(cancelDlg).getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(editor.getJSON()).toEqual(original);
    unmount();

    // Apply formatting + Split Table Row
    const onOk = vi.fn();
    render(<StudioTableFormatDialog editor={editor} onClose={onOk} />);
    const dlg = screen.getByRole("dialog", { name: "Table Format" });
    fireEvent.change(within(dlg).getByLabelText("Fill Color"), { target: { value: "#FFFF00" } });
    fireEvent.change(within(dlg).getByLabelText("Border Color"), { target: { value: "#0000FF" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Increase line weight" }));
    fireEvent.change(within(dlg).getByLabelText("Table Indent"), { target: { value: "5mm" } });
    fireEvent.change(within(dlg).getByLabelText("Table Alignment"), { target: { value: "center" } });
    fireEvent.click(within(dlg).getByRole("checkbox", { name: "Split Table Row" }));
    fireEvent.click(within(dlg).getByRole("button", { name: "OK" }));

    expect(onOk).toHaveBeenCalledTimes(1);
    const updatedTable = (editor.getJSON() as any).content[0];
    expect(updatedTable.attrs.tableAlignment).toBe("center");
    expect(updatedTable.attrs.tableIndentMm).toBe(5);
    expect(updatedTable.content).toHaveLength(3);
    expect(updatedTable.content[0].content[0].attrs.tableFill).toBe("#ffff00");
    expect(updatedTable.content[0].content[0].attrs.tableBorderColor).toBe("#0000ff");
    expect(updatedTable.content[0].content[0].attrs.tableBorderWidthPt).toBe(1);
    expect(JSON.stringify(updatedTable)).toContain("اردو متن");
    expect(JSON.stringify(updatedTable)).toContain("پاکستان");
  });
});
