/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { Editor } from "@tiptap/core";
import { AllSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import { StudioCharacterDialog } from "../app/tools/document-studio/components/StudioCharacterDialog";
import { StudioParagraphDialog } from "../app/tools/document-studio/components/StudioParagraphDialog";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { QalamTableFormatAttributes } from "../app/tools/document-studio/utils/tableFormatAttributes";
import { QalamTableStableDirection } from "../app/tools/document-studio/utils/tableStableDirection";
import { QalamTableColumnResizing } from "../app/tools/document-studio/utils/tableColumnResizing";
import { LatinScriptRuns } from "../app/tools/document-studio/extensions/LatinScriptRuns";
import {
  addSpaceAfterParagraph,
  addSpaceBeforeParagraph,
  applyBlockStyle,
  applyEnglishFont,
  applyFontFamily,
  applyFontSize,
  applyHighlight,
  applyLineGap,
  applyLineHeight,
  applyParagraphDirection,
  applyScale,
  applyTextColor,
  applyTextEffect,
  applyTracking,
  selectAll,
  setAlign,
  toggleBold,
  toggleItalic,
  toggleTextOutline,
  toggleUnderline,
  undo,
} from "../app/tools/document-studio/utils/documentCommands";
import {
  MIXED_TOOLBAR_VALUE,
  resolveActiveToolbarFormatting,
} from "../app/tools/document-studio/utils/activeToolbarFormatting";
import {
  applyCharacterPreferences,
  characterPatchFromForm,
  readCharacterForm,
} from "../app/tools/document-studio/utils/characterPreferences";
import {
  applyParagraphPreferences,
  preferencesFromForm,
  readParagraphForm,
} from "../app/tools/document-studio/utils/paragraphPreferences";
import {
  dispatchDocumentMenuAction,
  type DocumentMenuHandlers,
} from "../app/tools/document-studio/utils/documentMenuActions";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { normalizeEditorFontFamily } from "../app/tools/document-studio/utils/fontRegistry";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";

const URDU_3X3_ROWS = [
  ["اردو متن", "پاکستان", "لاہور"],
  ["کراچی", "اسلام آباد", "پشاور"],
  ["کوئٹہ", "ملتان", "فیصل آباد"],
];

// Selected 2x2 block: (0,0), (0,1), (1,0), (1,1) -> flat indices [0, 1, 3, 4]
const SELECTED_4_INDICES = [0, 1, 3, 4] as const;
const UNSELECTED_5_INDICES = [2, 5, 6, 7, 8] as const;

const editors: Editor[] = [];

afterEach(() => {
  cleanup();
  editors.splice(0).forEach((ed) => ed.destroy());
});

function createTableNode(rows: string[][]) {
  return {
    type: "table",
    attrs: {
      dir: "rtl",
      tableFlow: "rtl",
      tableAlignment: "right",
      tableIndentMm: 0,
      tableFormatWidthPx: 420,
    },
    content: rows.map((row) => ({
      type: "tableRow",
      content: row.map((text) => ({
        type: "tableCell",
        attrs: { colwidth: [140] },
        content: [
          {
            type: "paragraph",
            attrs: { dir: "rtl" },
            ...(text ? { content: [{ type: "text", text }] } : {}),
          },
        ],
      })),
    })),
  };
}

function makeTableEditor(content: Record<string, unknown>) {
  const editor = new Editor({
    extensions: [
      ...createDocumentStudioExtensions(),
      QalamTableStableDirection,
      QalamTableFormatAttributes,
      QalamTableColumnResizing,
      LatinScriptRuns,
    ],
    content,
  });
  editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
  editors.push(editor);
  return editor;
}

function getCellPositions(editor: Editor): number[] {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "tableCell") positions.push(pos);
  });
  return positions;
}

function selectCellRect(editor: Editor, anchorIdx: number, headIdx: number) {
  const cells = getCellPositions(editor);
  act(() => {
    editor.view.dispatch(
      editor.state.tr.setSelection(
        CellSelection.create(editor.state.doc, cells[anchorIdx], cells[headIdx]),
      ),
    );
  });
  expect(editor.state.selection).toBeInstanceOf(CellSelection);
}

function runInAct(fn: () => void) {
  act(() => {
    fn();
  });
}

type CellSnapshot = {
  text: string;
  paragraphType: string;
  paragraphAttrs: Record<string, unknown>;
  runs: {
    text: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    highlight: string | null;
    textStyle: Record<string, unknown> | null;
  }[];
};

function readTableCells(editor: Editor, tableTopIndex = 0): CellSnapshot[] {
  const doc = editor.getJSON() as { content?: any[] };
  const table = doc.content?.[tableTopIndex];
  const snapshots: CellSnapshot[] = [];
  for (const row of table.content) {
    for (const cell of row.content) {
      const block = cell.content[0];
      const runs = (block.content ?? []).map((n: any) => {
        const marks: any[] = n.marks ?? [];
        const ts = marks.find((m) => m.type === "textStyle");
        const hi = marks.find((m) => m.type === "highlight");
        return {
          text: n.text ?? "",
          bold: marks.some((m) => m.type === "bold"),
          italic: marks.some((m) => m.type === "italic"),
          underline: marks.some((m) => m.type === "underline"),
          highlight: hi?.attrs?.color ?? null,
          textStyle: ts ? { ...(ts.attrs ?? {}) } : null,
        };
      });
      snapshots.push({
        text: runs.map((r: any) => r.text).join(""),
        paragraphType: block.type,
        paragraphAttrs: { ...(block.attrs ?? {}) },
        runs,
      });
    }
  }
  return snapshots;
}

function noopMenuHandlers(setDir = (_d: "rtl" | "ltr") => {}): DocumentMenuHandlers {
  return {
    newDocument: () => {},
    openLibrary: () => {},
    upload: () => {},
    downloadTxt: () => {},
    downloadDocx: () => {},
    downloadPdf: () => {},
    print: () => {},
    openPageSetup: () => {},
    find: () => {},
    toggleOutline: () => {},
    toggleQuality: () => {},
    toggleGlossary: () => {},
    toggleSettings: () => {},
    toggleFullscreen: () => {},
    setViewMode: () => {},
    setZoom: () => {},
    setRulerUnit: () => {},
    toggleRuler: () => {},
    loadExample: () => {},
    promptLink: () => {},
    setDir,
    standardize: () => {},
    audit: () => {},
    showStats: () => {},
    startDictation: () => {},
    openQalamAi: () => {},
    openHelp: () => {},
  };
}

describe("Qalam Page multi-cell table formatting (CellSelection & AllSelection)", () => {
  it("1. 3x3 Urdu table with 4 selected cells: toolbar font, size, colour, bold, italic, spacing/scale, alignment, and line spacing update all 4 selected cells, leave 5 unselected cells untouched, and undo in one step", () => {
    const editor = makeTableEditor({
      type: "doc",
      content: [createTableNode(URDU_3X3_ROWS)],
    });
    const initialJson = editor.getJSON();
    const baselineCells = readTableCells(editor);

    selectCellRect(editor, 0, 4);
    expect(editor.state.selection.ranges).toHaveLength(4);

    render(
      <DocumentToolbar
        editor={editor}
        dir="rtl"
        setDir={() => {}}
        isUr={false}
        documentSettings={defaultDocumentSettings()}
      />,
    );

    const assertUnselectedUntouched = (cells: CellSnapshot[]) => {
      for (const idx of UNSELECTED_5_INDICES) {
        expect(cells[idx]).toEqual(baselineCells[idx]);
      }
    };

    // (a) Font family from toolbar dropdown (#studio-font-family)
    const urduSelect = document.querySelector("#studio-font-family") as HTMLSelectElement;
    fireEvent.change(urduSelect, { target: { value: "Jameel Noori Nastaleeq" } });
    let cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(normalizeEditorFontFamily(cells[idx].runs[0].textStyle?.fontFamily)).toBe(
        "Jameel Noori Nastaleeq",
      );
    }
    assertUnselectedUntouched(cells);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(4);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);

    // (b) Font size from toolbar size input (#studio-font-size)
    selectCellRect(editor, 0, 4);
    const sizeInput = document.querySelector("#studio-font-size") as HTMLInputElement;
    fireEvent.change(sizeInput, { target: { value: "18" } });
    fireEvent.keyDown(sizeInput, { key: "Enter" });
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].runs[0].textStyle?.fontSize).toBe("18pt");
    }
    assertUnselectedUntouched(cells);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);

    // Clearing font size also cleans empty textStyle marks on all 4 selected cells
    selectCellRect(editor, 0, 4);
    runInAct(() => {
      applyFontSize(editor, "20");
      applyFontSize(editor, "");
    });
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].runs[0].textStyle).toBeNull();
    }

    // (c) Text colour from toolbar Colour dropdown
    selectCellRect(editor, 0, 4);
    const snapshotBeforeColour = editor.getJSON();
    fireEvent.click(document.querySelector("[aria-label='Colour']")!);
    fireEvent.click(document.querySelector("[data-studio-colour-option='Blue']")!);
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(String(cells[idx].runs[0].textStyle?.color).toLowerCase()).toBe("#0000ff");
    }
    assertUnselectedUntouched(cells);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeColour);

    // Also verify hidden ColorPaletteControl ("Text color") preserves CellSelection
    selectCellRect(editor, 0, 4);
    fireEvent.click(document.querySelector("[aria-label='Text color']")!);
    const swatch = document.querySelector("[data-studio-text-color-palette] [data-studio-color-swatch]") as HTMLButtonElement | null;
    if (swatch) {
      fireEvent.click(swatch);
      expect(editor.state.selection).toBeInstanceOf(CellSelection);
      expect(editor.state.selection.ranges).toHaveLength(4);
      runInAct(() => undo(editor));
    }

    // (d) Bold & Italic & Underline
    selectCellRect(editor, 0, 4);
    const snapshotBeforeBold = editor.getJSON();
    fireEvent.click(document.querySelector("[aria-label='Bold']")!);
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].runs[0].bold).toBe(true);
    }
    assertUnselectedUntouched(cells);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeBold);

    selectCellRect(editor, 0, 4);
    fireEvent.click(document.querySelector("[aria-label='Italic']")!);
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].runs[0].italic).toBe(true);
    }
    assertUnselectedUntouched(cells);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeBold);

    selectCellRect(editor, 0, 4);
    runInAct(() => toggleUnderline(editor));
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].runs[0].underline).toBe(true);
    }
    assertUnselectedUntouched(cells);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeBold);

    // (e) Character spacing (tracking) field in toolbar
    selectCellRect(editor, 0, 4);
    const trackingInput = document.querySelector("[data-studio-tracking]") as HTMLInputElement;
    fireEvent.change(trackingInput, { target: { value: "15" } });
    fireEvent.keyDown(trackingInput, { key: "Enter" });
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].runs[0].textStyle?.trackingPercent).toBe(15);
    }
    assertUnselectedUntouched(cells);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeBold);

    // (f) Outline & Text style
    selectCellRect(editor, 0, 4);
    fireEvent.click(document.querySelector("[aria-label='Outline']")!);
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].runs[0].textStyle?.textOutline).toBe(true);
    }
    assertUnselectedUntouched(cells);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeBold);

    selectCellRect(editor, 0, 4);
    runInAct(() => applyTextEffect(editor, "double"));
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].runs[0].textStyle?.textEffect).toBe("double");
    }
    assertUnselectedUntouched(cells);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeBold);

    // (g) Alignment from toolbar (Align center)
    selectCellRect(editor, 0, 4);
    fireEvent.click(document.querySelector("[aria-label='Align center']")!);
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].paragraphAttrs.textAlign).toBe("center");
    }
    assertUnselectedUntouched(cells);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeBold);

    // (h) Line spacing & Interline gap from toolbar (must keep CellSelection intact!)
    selectCellRect(editor, 0, 4);
    const leadingInput = document.querySelector("[data-studio-leading]") as HTMLInputElement;
    fireEvent.change(leadingInput, { target: { value: "24pt" } });
    fireEvent.keyDown(leadingInput, { key: "Enter" });
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].paragraphAttrs.leading).toEqual({ mode: "points", value: 24 });
    }
    assertUnselectedUntouched(cells);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(4);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeBold);

    selectCellRect(editor, 0, 4);
    const gapInput = document.querySelector("[data-studio-line-gap]") as HTMLInputElement;
    fireEvent.change(gapInput, { target: { value: "6pt" } });
    fireEvent.keyDown(gapInput, { key: "Enter" });
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].paragraphAttrs.lineGapPt).toBe(6);
    }
    assertUnselectedUntouched(cells);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    expect(editor.state.selection.ranges).toHaveLength(4);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(snapshotBeforeBold);

    // (i) Paragraph spacing & direction & block style
    selectCellRect(editor, 0, 4);
    runInAct(() => {
      addSpaceBeforeParagraph(editor);
      addSpaceAfterParagraph(editor);
    });
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].paragraphAttrs.spaceBeforePt).toBeGreaterThan(0);
      expect(cells[idx].paragraphAttrs.spaceAfterPt).toBeGreaterThan(0);
    }
    assertUnselectedUntouched(cells);
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    runInAct(() => {
      undo(editor);
      undo(editor);
    });

    selectCellRect(editor, 0, 4);
    fireEvent.click(document.querySelector("[aria-label='Left to right']")!);
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].paragraphAttrs.dir).toBe("ltr");
      expect(cells[idx].paragraphAttrs.directionMode).toBe("ltr");
    }
    assertUnselectedUntouched(cells);
    expect((document.querySelector("[aria-label='Left to right']") as HTMLElement).getAttribute("aria-pressed")).toBe("true");
    runInAct(() => undo(editor));

    selectCellRect(editor, 0, 4);
    runInAct(() => applyBlockStyle(editor, "heading-2"));
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].paragraphType).toBe("heading");
      expect(cells[idx].paragraphAttrs.level).toBe(2);
    }
    assertUnselectedUntouched(cells);
    runInAct(() => undo(editor));
  });

  it("2. mixed multi-cell selection reports mixed state in toolbar so selecting the head cell's font/size/alignment applies to all 4 cells", () => {
    const editor = makeTableEditor({
      type: "doc",
      content: [createTableNode(URDU_3X3_ROWS)],
    });
    const positions = getCellPositions(editor);

    // Pre-format ONLY cell 0 ("اردو متن") with Jameel Noori Nastaleeq, 18pt, Red, Outline, Center, 24pt leading
    editor.commands.setTextSelection({
      from: positions[0] + 2,
      to: positions[0] + 2 + URDU_3X3_ROWS[0][0].length,
    });
    applyFontFamily(editor, "Jameel Noori Nastaleeq");
    applyFontSize(editor, "18");
    applyTextColor(editor, "#FF0000");
    toggleTextOutline(editor);
    setAlign(editor, "center");
    applyLineHeight(editor, 24);
    applyLineGap(editor, 8);

    // Drag from cell 4 to cell 0 so $headCell (ranges[0]) is cell 0!
    selectCellRect(editor, 4, 0);
    const ui = resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl");
    expect(ui.mixed.fontFamily).toBe(true);
    expect(ui.fontFamily).toBe(MIXED_TOOLBAR_VALUE);
    expect(ui.mixed.fontSize).toBe(true);
    expect(ui.fontSizePt).toBeNull();
    expect(ui.mixed.color).toBe(true);
    expect(ui.mixed.lineHeight).toBe(true);
    expect(ui.textAlign).toBeNull();
    expect(ui.textOutline).toBe(false);

    render(
      <DocumentToolbar
        editor={editor}
        dir="rtl"
        setDir={() => {}}
        isUr={false}
        documentSettings={defaultDocumentSettings()}
      />,
    );

    // Mixed leading & interline gap show blank and do not overwrite cells on untouched blur
    const leadingInput = document.querySelector("[data-studio-leading]") as HTMLInputElement;
    const gapInput = document.querySelector("[data-studio-line-gap]") as HTMLInputElement;
    expect(leadingInput.value).toBe("");
    expect(gapInput.value).toBe("");
    fireEvent.focus(leadingInput);
    fireEvent.blur(leadingInput);
    fireEvent.focus(gapInput);
    fireEvent.blur(gapInput);
    expect(readTableCells(editor)[0].paragraphAttrs.leading).toEqual({ mode: "points", value: 24 });
    expect(readTableCells(editor)[1].paragraphAttrs.leading).toBeNull();
    expect(readTableCells(editor)[0].paragraphAttrs.lineGapPt).toBe(8);
    expect(readTableCells(editor)[1].paragraphAttrs.lineGapPt ?? null).toBeNull();

    // Choosing "Jameel Noori Nastaleeq" in the dropdown MUST fire onChange and update cells 1, 3, 4 too!
    const urduSelect = document.querySelector("#studio-font-family") as HTMLSelectElement;
    expect(urduSelect.value).toBe(MIXED_TOOLBAR_VALUE);
    fireEvent.change(urduSelect, { target: { value: "Jameel Noori Nastaleeq" } });

    // Toggling Outline when only 1 of 4 cells has outline turns it ON for all 4 cells
    fireEvent.click(document.querySelector("[aria-label='Outline']")!);

    const cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(normalizeEditorFontFamily(cells[idx].runs[0].textStyle?.fontFamily)).toBe(
        "Jameel Noori Nastaleeq",
      );
      expect(cells[idx].runs[0].textStyle?.textOutline).toBe(true);
    }
    for (const idx of UNSELECTED_5_INDICES) {
      expect(cells[idx].runs[0].textStyle).toBeNull();
    }
  });

  it("3. separates Urdu and English fonts and applies horizontal scale across 4 selected mixed-script cells, undoing each in one step", () => {
    const mixedRows = [
      ["اردو متن Qalam", "پاکستان PK 2026", "لاہور Guide"],
      ["کراچی Studio", "اسلام آباد Pro", "پشاور Notes"],
      ["کوئٹہ Page", "ملتان Book", "فیصل آباد Ink"],
    ];
    const editor = makeTableEditor({
      type: "doc",
      content: [createTableNode(mixedRows)],
    });
    const initialJson = editor.getJSON();

    render(
      <DocumentToolbar
        editor={editor}
        dir="rtl"
        setDir={() => {}}
        isUr={false}
        documentSettings={defaultDocumentSettings()}
      />,
    );

    selectCellRect(editor, 0, 4);
    runInAct(() => applyFontFamily(editor, "Gulzar"));
    const afterUrdu = editor.getJSON();
    runInAct(() => applyEnglishFont(editor, "Inter"));
    const afterEnglish = editor.getJSON();

    const scaleInput = document.querySelector("[data-studio-scale]") as HTMLInputElement;
    fireEvent.change(scaleInput, { target: { value: "85" } });
    fireEvent.keyDown(scaleInput, { key: "Enter" });

    const cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      const arabicRun = cells[idx].runs.find((r) => /\p{Script=Arabic}/u.test(r.text));
      const latinRun = cells[idx].runs.find((r) => /[A-Za-z]/.test(r.text));
      expect(normalizeEditorFontFamily(arabicRun?.textStyle?.fontFamily)).toBe("Gulzar");
      expect(String(arabicRun?.textStyle?.latinFontFamily ?? "")).not.toContain("Inter");
      expect(arabicRun?.textStyle?.scalePercent ?? null).toBeNull();
      expect(normalizeEditorFontFamily(latinRun?.textStyle?.latinFontFamily)).toBe("Inter");
      expect(String(latinRun?.textStyle?.fontFamily ?? "")).not.toContain("Gulzar");
      expect(latinRun?.textStyle?.scalePercent).toBe(85);
    }
    for (const idx of UNSELECTED_5_INDICES) {
      expect(cells[idx].runs.every((r) => r.textStyle === null)).toBe(true);
    }

    const ui = resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl");
    expect(ui.mixed.fontFamily).toBe(false);
    expect(ui.fontFamily).toBe("Gulzar");
    expect(ui.mixed.latinFontFamily).toBe(false);
    expect(ui.latinFontFamily).toBe("Inter");

    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(afterEnglish);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(afterUrdu);
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);
  });

  it("4. applies Format menu actions, Character dialog, and Paragraph dialog across all 4 selected cells with single-step undo", () => {
    const editor = makeTableEditor({
      type: "doc",
      content: [createTableNode(URDU_3X3_ROWS)],
    });
    const settings = defaultDocumentSettings();
    const initialJson = editor.getJSON();
    const baselineCells = readTableCells(editor);

    // (a) Format menu actions via dispatchDocumentMenuAction
    selectCellRect(editor, 0, 4);
    const handlers = noopMenuHandlers((d) => applyParagraphDirection(editor, d));

    dispatchDocumentMenuAction("format.bold", editor, handlers);
    for (const idx of SELECTED_4_INDICES) expect(readTableCells(editor)[idx].runs[0].bold).toBe(true);
    for (const idx of UNSELECTED_5_INDICES) expect(readTableCells(editor)[idx]).toEqual(baselineCells[idx]);
    undo(editor);
    expect(editor.getJSON()).toEqual(initialJson);

    selectCellRect(editor, 0, 4);
    dispatchDocumentMenuAction("format.alignCenter", editor, handlers);
    for (const idx of SELECTED_4_INDICES) expect(readTableCells(editor)[idx].paragraphAttrs.textAlign).toBe("center");
    for (const idx of UNSELECTED_5_INDICES) expect(readTableCells(editor)[idx]).toEqual(baselineCells[idx]);
    undo(editor);
    expect(editor.getJSON()).toEqual(initialJson);

    selectCellRect(editor, 0, 4);
    dispatchDocumentMenuAction("format.lh.24", editor, handlers);
    for (const idx of SELECTED_4_INDICES) {
      expect(readTableCells(editor)[idx].paragraphAttrs.leading).toEqual({ mode: "points", value: 24 });
    }
    for (const idx of UNSELECTED_5_INDICES) expect(readTableCells(editor)[idx]).toEqual(baselineCells[idx]);
    undo(editor);
    expect(editor.getJSON()).toEqual(initialJson);

    selectCellRect(editor, 0, 4);
    dispatchDocumentMenuAction("format.shade", editor, handlers);
    for (const idx of SELECTED_4_INDICES) expect(String(readTableCells(editor)[idx].runs[0].highlight).toLowerCase()).toBe("#fff2a8");
    for (const idx of UNSELECTED_5_INDICES) expect(readTableCells(editor)[idx]).toEqual(baselineCells[idx]);
    undo(editor);
    expect(editor.getJSON()).toEqual(initialJson);

    // (b) StudioCharacterDialog (readCharacterForm + UI submit + single-step undo)
    selectCellRect(editor, 0, 4);
    let closedChar = false;
    const charView = render(
      <StudioCharacterDialog editor={editor} settings={settings} onClose={() => { closedChar = true; }} />,
    );
    fireEvent.change(document.querySelector("[data-studio-character-dialog] input[name='size']")!, {
      target: { value: "16pt" },
    });
    fireEvent.change(document.querySelector("[data-studio-character-dialog] select[name='urduFont']")!, {
      target: { value: "Jameel Noori Nastaleeq" },
    });
    fireEvent.click(document.querySelector("[data-studio-character-dialog] input[name='bold']")!);
    fireEvent.click(document.querySelector("[data-studio-character-dialog] input[name='italics']")!);
    fireEvent.change(document.querySelector("[data-studio-character-dialog] input[name='spacing']")!, {
      target: { value: "12%" },
    });
    fireEvent.change(document.querySelector("[data-studio-character-dialog] input[name='scaling']")!, {
      target: { value: "90%" },
    });
    fireEvent.submit(document.querySelector("[data-studio-character-dialog]")!);
    expect(closedChar).toBe(true);
    charView.unmount();

    let cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(normalizeEditorFontFamily(cells[idx].runs[0].textStyle?.fontFamily)).toBe(
        "Jameel Noori Nastaleeq",
      );
      expect(cells[idx].runs[0].textStyle?.fontSize).toBe("16pt");
      expect(cells[idx].runs[0].textStyle?.trackingPercent).toBe(12);
      expect(cells[idx].runs[0].textStyle?.scalePercent).toBe(90);
      expect(cells[idx].runs[0].bold).toBe(true);
      expect(cells[idx].runs[0].italic).toBe(true);
    }
    for (const idx of UNSELECTED_5_INDICES) {
      expect(cells[idx]).toEqual(baselineCells[idx]);
    }
    // Single undo restores all 4 cells from the Character dialog transaction
    undo(editor);
    expect(editor.getJSON()).toEqual(initialJson);

    // Mixed detection in readCharacterForm across cells
    const positions = getCellPositions(editor);
    editor.commands.setTextSelection({
      from: positions[0] + 2,
      to: positions[0] + 2 + URDU_3X3_ROWS[0][0].length,
    });
    applyFontFamily(editor, "Gulzar");
    toggleBold(editor);
    selectCellRect(editor, 4, 0);
    const mixedCharForm = readCharacterForm(editor, settings);
    expect(mixedCharForm.urduFont).toBe("");
    expect(mixedCharForm.bold).toBeNull();
    const charPatch = characterPatchFromForm(
      { ...mixedCharForm, urduFont: "Gulzar", color: "#0000FF", bold: true },
      mixedCharForm,
    );
    expect(charPatch.ok).toBe(true);
    if (charPatch.ok) expect(applyCharacterPreferences(editor, charPatch.patch)).toBe(true);
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(normalizeEditorFontFamily(cells[idx].runs[0].textStyle?.fontFamily)).toBe("Gulzar");
      expect(String(cells[idx].runs[0].textStyle?.color).toLowerCase()).toBe("#0000ff");
      expect(cells[idx].runs[0].bold).toBe(true);
    }
    undo(editor);
    undo(editor);
    undo(editor);
    expect(editor.getJSON()).toEqual(initialJson);

    // (c) StudioParagraphDialog (readParagraphForm + UI submit + single-step undo)
    selectCellRect(editor, 0, 4);
    let closedPara = false;
    const paraView = render(
      <StudioParagraphDialog editor={editor} settings={settings} onClose={() => { closedPara = true; }} />,
    );
    fireEvent.change(document.querySelector("[data-studio-paragraph-dialog] select[name='alignment']")!, {
      target: { value: "center" },
    });
    fireEvent.change(document.querySelector("[data-studio-paragraph-dialog] input[name='lineHeight']")!, {
      target: { value: "22pt" },
    });
    fireEvent.change(document.querySelector("[data-studio-paragraph-dialog] input[name='interlineGap']")!, {
      target: { value: "5pt" },
    });
    fireEvent.change(document.querySelector("[data-studio-paragraph-dialog] input[name='beginning']")!, {
      target: { value: "4mm" },
    });
    fireEvent.submit(document.querySelector("[data-studio-paragraph-dialog]")!);
    expect(closedPara).toBe(true);
    paraView.unmount();

    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].paragraphAttrs.textAlign).toBe("center");
      expect(cells[idx].paragraphAttrs.leading).toEqual({ mode: "points", value: 22 });
      expect(cells[idx].paragraphAttrs.lineGapPt).toBe(5);
      expect(cells[idx].paragraphAttrs.indentStartMm).toBe(4);
    }
    for (const idx of UNSELECTED_5_INDICES) {
      expect(cells[idx]).toEqual(baselineCells[idx]);
    }
    undo(editor);
    expect(editor.getJSON()).toEqual(initialJson);

    // Mixed detection in readParagraphForm across cells
    editor.commands.setTextSelection(positions[0] + 2);
    setAlign(editor, "left");
    applyLineGap(editor, 7);
    selectCellRect(editor, 4, 0);
    const mixedParaForm = readParagraphForm(editor, settings);
    expect(mixedParaForm.alignment).toBe("");
    expect(mixedParaForm.interlineGap).toBe("");
    const paraPatch = preferencesFromForm(
      { ...mixedParaForm, alignment: "justify", interlineGap: "4pt" },
      mixedParaForm,
    );
    expect(paraPatch.ok).toBe(true);
    if (paraPatch.ok) expect(applyParagraphPreferences(editor, paraPatch.attrs)).toBe(true);
    cells = readTableCells(editor);
    for (const idx of SELECTED_4_INDICES) {
      expect(cells[idx].paragraphAttrs.textAlign).toBe("justify");
      expect(cells[idx].paragraphAttrs.lineGapPt).toBe(4);
    }
  });

  it("5. Ctrl+A (AllSelection) formats all story paragraphs and all 9 table cells, keeps AllSelection intact, and undoes in one step", () => {
    // Case A: Story paragraphs before and after a 3x3 Urdu table
    const docWithStoryAndTable = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "اردو متن کا آغاز" }] },
        createTableNode(URDU_3X3_ROWS),
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "پاکستان زندہ باد" }] },
      ],
    };
    const editor = makeTableEditor(docWithStoryAndTable);
    const initialJson = editor.getJSON();

    selectAll(editor);
    expect(editor.state.selection).toBeInstanceOf(AllSelection);

    render(
      <DocumentToolbar
        editor={editor}
        dir="rtl"
        setDir={() => {}}
        isUr={false}
        documentSettings={defaultDocumentSettings()}
      />,
    );

    const checkAllFormatted = (
      predicate: (run: any, paragraphAttrs: Record<string, unknown>) => void,
    ) => {
      const json = editor.getJSON() as any;
      const beforePara = json.content[0];
      const afterPara = json.content[2];
      predicate(beforePara.content[0], beforePara.attrs ?? {});
      predicate(afterPara.content[0], afterPara.attrs ?? {});
      for (const cell of readTableCells(editor, 1)) {
        predicate(cell.runs[0], cell.paragraphAttrs);
      }
    };

    // Font family via toolbar dropdown
    fireEvent.change(document.querySelector("#studio-font-family")!, {
      target: { value: "Jameel Noori Nastaleeq" },
    });
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
    checkAllFormatted((run) => {
      const style = run.textStyle ?? run.marks?.find((m: any) => m.type === "textStyle")?.attrs;
      expect(normalizeEditorFontFamily(style?.fontFamily)).toBe("Jameel Noori Nastaleeq");
    });
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);

    // Font size
    runInAct(() => selectAll(editor));
    const sizeInput = document.querySelector("#studio-font-size") as HTMLInputElement;
    fireEvent.change(sizeInput, { target: { value: "16" } });
    fireEvent.keyDown(sizeInput, { key: "Enter" });
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
    checkAllFormatted((run) => {
      const style = run.textStyle ?? run.marks?.find((m: any) => m.type === "textStyle")?.attrs;
      expect(style?.fontSize).toBe("16pt");
    });
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);

    // Colour
    runInAct(() => {
      selectAll(editor);
      applyTextColor(editor, "#0000FF");
    });
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
    checkAllFormatted((run) => {
      const style = run.textStyle ?? run.marks?.find((m: any) => m.type === "textStyle")?.attrs;
      expect(String(style?.color).toLowerCase()).toBe("#0000ff");
    });
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);

    // Bold
    runInAct(() => {
      selectAll(editor);
      toggleBold(editor);
    });
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
    checkAllFormatted((run) => {
      const isBold = run.bold ?? (run.marks ?? []).some((m: any) => m.type === "bold");
      expect(isBold).toBe(true);
    });
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);

    // Tracking & Scale
    runInAct(() => {
      selectAll(editor);
      applyTracking(editor, 10);
    });
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
    checkAllFormatted((run) => {
      const style = run.textStyle ?? run.marks?.find((m: any) => m.type === "textStyle")?.attrs;
      expect(style?.trackingPercent).toBe(10);
    });
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);

    // Alignment + active toolbar resolution on AllSelection with a table
    runInAct(() => {
      selectAll(editor);
      setAlign(editor, "center");
    });
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
    expect(resolveActiveToolbarFormatting(editor, defaultDocumentSettings(), "rtl").textAlign).toBe(
      "center",
    );
    checkAllFormatted((_run, pAttrs) => {
      expect(pAttrs.textAlign).toBe("center");
    });
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);

    // Line spacing (must NOT destroy AllSelection!)
    runInAct(() => {
      selectAll(editor);
      applyLineHeight(editor, 22);
    });
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
    checkAllFormatted((_run, pAttrs) => {
      expect(pAttrs.leading).toEqual({ mode: "points", value: 22 });
    });
    runInAct(() => undo(editor));
    expect(editor.getJSON()).toEqual(initialJson);

    // Case B: Table-only document with Ctrl+A (AllSelection)
    const tableOnly = makeTableEditor({
      type: "doc",
      content: [createTableNode(URDU_3X3_ROWS)],
    });
    const tableOnlyInitial = tableOnly.getJSON();
    selectAll(tableOnly);
    expect(tableOnly.state.selection).toBeInstanceOf(AllSelection);
    applyFontFamily(tableOnly, "Jameel Noori Nastaleeq");
    applyFontSize(tableOnly, "20");
    applyTextColor(tableOnly, "#FF0000");
    toggleBold(tableOnly);
    setAlign(tableOnly, "center");
    applyLineHeight(tableOnly, 26);
    expect(tableOnly.state.selection).toBeInstanceOf(AllSelection);

    for (const cell of readTableCells(tableOnly)) {
      expect(normalizeEditorFontFamily(cell.runs[0].textStyle?.fontFamily)).toBe(
        "Jameel Noori Nastaleeq",
      );
      expect(cell.runs[0].textStyle?.fontSize).toBe("20pt");
      expect(String(cell.runs[0].textStyle?.color).toLowerCase()).toBe("#ff0000");
      expect(cell.runs[0].bold).toBe(true);
      expect(cell.paragraphAttrs.textAlign).toBe("center");
      expect(cell.paragraphAttrs.leading).toEqual({ mode: "points", value: 26 });
    }
    for (let step = 0; step < 6; step += 1) undo(tableOnly);
    expect(tableOnly.getJSON()).toEqual(tableOnlyInitial);
  });

  it("6. verifies real PDF embedded fonts, glyph geometry/color, 0.5pt single-line SVG table borders, and screen 0.5pt cell borders after multi-cell text formatting", async () => {
    const editor = makeTableEditor({
      type: "doc",
      content: [createTableNode(URDU_3X3_ROWS)],
    });
    selectCellRect(editor, 0, 4);
    applyFontFamily(editor, "Nafees Nastaleeq");
    applyFontSize(editor, "18");
    applyTextColor(editor, "#0000FF");
    toggleBold(editor);
    setAlign(editor, "center");
    applyLineHeight(editor, 24);

    // Screen border check: all 9 cells retain 0.5pt solid #000000
    const domCells = [...editor.view.dom.querySelectorAll("td")] as HTMLElement[];
    expect(domCells).toHaveLength(9);
    for (const td of domCells) {
      expect(td.style.borderWidth).toBe("0.5pt");
      expect(td.style.borderStyle).toBe("solid");
      expect(td.style.borderColor).toBe("#000000");
    }

    // Load real bundled WOFF2 font binaries (raw base64 per PdfFontFace contract) for Nafees Nastaleeq (selected 4 cells) and Mehr Nastaliq Web (unselected 5 cells)
    const toBase64 = (relPath: string) =>
      readFileSync(join(process.cwd(), relPath)).toString("base64");
    const nafeesFace = {
      familyName: "Nafees Nastaleeq",
      regularSources: [toBase64("public/fonts/NafeesNastaleeq-v1.02.woff2")],
      complete: true,
      declaredRegular: 1,
      declaredBold: 0,
      loadedRegular: 1,
      loadedBold: 0,
    };
    const mehrFace = {
      familyName: "Mehr Nastaliq Web",
      regularSources: [toBase64("public/fonts/MehrNastaliqWeb.woff2")],
      complete: true,
      declaredRegular: 1,
      declaredBold: 0,
      loadedRegular: 1,
      loadedBold: 0,
    };
    const pdf = buildPdfHtml(
      editor.getJSON() as never,
      "rtl",
      { faces: [nafeesFace, mehrFace] },
      defaultDocumentSettings().typography,
    );
    expect(pdf.fontsUsed).toContain("Nafees Nastaleeq");
    expect(pdf.fontsUsed).toContain("Mehr Nastaliq Web");
    const pdfTable = pdf.html.match(/<table class="qalam-document-table"[\s\S]*?<\/table>/)?.[0] ?? "";
    const svgRects = [...pdfTable.matchAll(/<rect\b([^>]*)\/?>/g)].map((m) => m[1]);
    expect(svgRects).toHaveLength(24);
    const pdfTds = [...pdfTable.matchAll(/<td\b[\s\S]*?<\/td>/g)].map((m) => m[0]);
    expect(pdfTds).toHaveLength(9);
    for (const idx of SELECTED_4_INDICES) {
      expect(pdfTds[idx]).toContain('class="qf-blob-nafees-nastaleeq"');
      expect(pdfTds[idx]).toContain("font-size:18pt");
      expect(pdfTds[idx].toLowerCase()).toContain("color:#0000ff");
      expect(pdfTds[idx]).toContain("<strong>");
      expect(pdfTds[idx]).toContain("text-align:center");
      expect(pdfTds[idx]).toContain("line-height:24pt");
    }
    for (const idx of UNSELECTED_5_INDICES) {
      expect(pdfTds[idx]).not.toContain('class="qf-blob-nafees-nastaleeq"');
      expect(pdfTds[idx]).not.toContain("font-size:18pt");
      expect(pdfTds[idx]).not.toContain("text-align:center");
    }

    // Real Chromium PDF export + pdfplumber inspection of embedded fonts, glyph sizes/colors, and 0.5pt borders
    const chromePath = existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : "/usr/bin/chromium";
    if (existsSync(chromePath)) {
      const tmp = mkdtempSync(join(tmpdir(), "qalam-multicell-pdf-"));
      const browser = await puppeteer.launch({
        executablePath: chromePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(pdf.html, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        const pdfBytes = await page.pdf({ width: "210mm", height: "297mm", printBackground: true });
        const pdfPath = join(tmp, "out.pdf");
        const pyPath = join(tmp, "inspect_pdf.py");
        writeFileSync(pdfPath, pdfBytes);
        writeFileSync(
          pyPath,
          [
            "import json, pdfplumber",
            `with pdfplumber.open(${JSON.stringify(pdfPath)}) as pdf:`,
            "    p = pdf.pages[0]",
            "    rects = p.rects",
            "    verticals = [r for r in rects if round(r['width'], 2) == 0.5]",
            "    horizontals = [r for r in rects if round(r['height'], 2) == 0.5]",
            "    all_05 = [r for r in rects if round(r['width'], 2) == 0.5 or round(r['height'], 2) == 0.5]",
            "    v_xs = sorted(set(round(r['x0'], 2) for r in verticals))",
            "    chars = [c for c in p.chars if c.get('text', '').strip()]",
            "    fonts = sorted(set(c.get('fontname', '') for c in chars))",
            "    sizes = sorted(set(round(c.get('size', 0), 1) for c in chars))",
            "    blue_nafees = [c for c in chars if 'Nafees' in c.get('fontname', '') and round(c.get('size', 0)) == 18 and c.get('non_stroking_color') == (0.0, 0.0, 1.0)]",
            "    mehr_default = [c for c in chars if 'Mehr' in c.get('fontname', '') and round(c.get('size', 0)) == 12]",
            "    print(json.dumps({",
            "        'total_05': len(all_05),",
            "        'verticals': len(verticals),",
            "        'horizontals': len(horizontals),",
            "        'v_xs': len(v_xs),",
            "        'fonts': fonts,",
            "        'sizes': sizes,",
            "        'blue_nafees_count': len(blue_nafees),",
            "        'mehr_default_count': len(mehr_default),",
            "    }))",
          ].join("\n"),
        );
        const info = JSON.parse(execSync(`python3 ${JSON.stringify(pyPath)}`).toString().trim());
        expect(info.total_05).toBe(24);
        expect(info.verticals).toBe(12);
        expect(info.horizontals).toBe(12);
        expect(info.v_xs).toBe(4);
        expect(info.fonts.some((f: string) => f.includes("Nafees"))).toBe(true);
        expect(info.fonts.some((f: string) => f.includes("Mehr"))).toBe(true);
        expect(info.blue_nafees_count).toBeGreaterThan(10);
        expect(info.mehr_default_count).toBeGreaterThan(10);
      } finally {
        await browser.close();
        rmSync(tmp, { recursive: true, force: true });
      }
    }
  }, 30000);
});
