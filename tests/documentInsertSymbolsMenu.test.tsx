/** @vitest-environment happy-dom */
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { DOCUMENT_MENU_BAR, collectMenuActionIds } from "../app/tools/document-studio/utils/documentMenus";
import { dispatchDocumentMenuAction, type DocumentMenuHandlers } from "../app/tools/document-studio/utils/documentMenuActions";
import { SymbolsDialog, SYMBOL_GROUPS, insertSymbolIntoEditor, symbolInsertText } from "../app/tools/document-studio/components/SymbolsDialog";

describe("Insert > Symbols wiring", () => {
  it("Insert menu has an English Symbols... item that dispatches openSymbols", () => {
    const insert = DOCUMENT_MENU_BAR.find(menu => menu.id === "insert")!;
    expect(collectMenuActionIds(insert.items)).toContain("insert.symbols");
    expect(insert.items.find(item => "id" in item && item.id === "insert.symbols")).toMatchObject({ labelEn: "Symbols..." });
    const openSymbols = vi.fn();
    dispatchDocumentMenuAction("insert.symbols", null, { openSymbols } as unknown as DocumentMenuHandlers);
    expect(openSymbols).toHaveBeenCalledTimes(1);
  });

  it("opening the dialog and inserting text puts it at the editor selection and keeps the dialog open", () => {
    const editor = new Editor({ extensions: [StarterKit], content: "<p>AB</p>" });
    editor.commands.setTextSelection(2);
    function Harness() {
      const [open, setOpen] = useState(false);
      return <>
        <button type="button" onClick={() => dispatchDocumentMenuAction("insert.symbols", null, { openSymbols: () => setOpen(true) } as unknown as DocumentMenuHandlers)}>menu</button>
        <SymbolsDialog open={open} onInsert={item => insertSymbolIntoEditor(editor, item)} onClose={() => setOpen(false)} />
      </>;
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "menu" }));
    const item = SYMBOL_GROUPS[0].items[1];
    fireEvent.doubleClick(screen.getByRole("button", { name: item.label }));
    expect(editor.getText()).toBe(`A${item.text}B`);
    expect(screen.getByRole("dialog", { name: "Symbols" })).toBeTruthy();
    const circled = SYMBOL_GROUPS[3].items[9];
    expect(symbolInsertText(circled)).toBe("(۱۰)");
    editor.destroy();
  });
});
