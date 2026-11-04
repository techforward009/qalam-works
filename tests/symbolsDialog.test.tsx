/** @vitest-environment happy-dom */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
import { SymbolsDialog, SYMBOL_GROUPS } from "../app/tools/document-studio/components/SymbolsDialog";

describe("SymbolsDialog", () => {
  it("renders when open and does not render when closed", () => {
    const { rerender } = render(
      <SymbolsDialog open={false} onInsert={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.queryByRole("dialog", { name: /symbols/i })).toBeNull();

    rerender(<SymbolsDialog open={true} onInsert={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /symbols/i })).toBeDefined();
    expect(screen.getByTestId("studio-symbols-dialog")).toBeDefined();
  });

  it("has dir='ltr' and direction: ltr on the root dialog element", () => {
    render(<SymbolsDialog open={true} onInsert={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /symbols/i });
    expect(dialog.getAttribute("dir")).toBe("ltr");
    expect(dialog.style.direction).toBe("ltr");
  });

  it("clicking group 'Circled numbers' shows 10 tiles whose svg contains '<circle'", () => {
    render(<SymbolsDialog open={true} onInsert={vi.fn()} onClose={vi.fn()} />);
    const circledGroupBtn = screen.getByRole("button", { name: "Circled numbers" });
    fireEvent.click(circledGroupBtn);

    const circledGroup = SYMBOL_GROUPS.find((g) => g.title === "Circled numbers");
    expect(circledGroup).toBeDefined();
    expect(circledGroup?.items.length).toBe(10);

    circledGroup?.items.forEach((item) => {
      const tile = screen.getByRole("button", { name: item.label });
      expect(tile).toBeDefined();
      expect(tile.innerHTML).toContain("<circle");
      expect(tile.getAttribute("data-symbol-id")).toBe(item.id);
    });
  });

  it("double click calls onInsert with the item and keeps dialog open", () => {
    const onInsertMock = vi.fn();
    render(<SymbolsDialog open={true} onInsert={onInsertMock} onClose={vi.fn()} />);

    const firstItem = SYMBOL_GROUPS[0].items[0];
    const tile = screen.getByRole("button", { name: firstItem.label });
    fireEvent.doubleClick(tile);

    expect(onInsertMock).toHaveBeenCalledTimes(1);
    expect(onInsertMock).toHaveBeenCalledWith(firstItem);
    expect(screen.getByRole("dialog", { name: /symbols/i })).toBeDefined();
  });

  it("Insert button works after single click", () => {
    const onInsertMock = vi.fn();
    render(<SymbolsDialog open={true} onInsert={onInsertMock} onClose={vi.fn()} />);

    const secondItem = SYMBOL_GROUPS[0].items[1];
    const tile = screen.getByRole("button", { name: secondItem.label });
    fireEvent.click(tile);

    const insertBtn = screen.getByRole("button", { name: "Insert" });
    fireEvent.click(insertBtn);

    expect(onInsertMock).toHaveBeenCalledTimes(1);
    expect(onInsertMock).toHaveBeenCalledWith(secondItem);
  });

  it("Escape key calls onClose", () => {
    const onCloseMock = vi.fn();
    render(<SymbolsDialog open={true} onInsert={vi.fn()} onClose={onCloseMock} />);

    const dialog = screen.getByRole("dialog", { name: /symbols/i });
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("Enter key inserts selected item", () => {
    const onInsertMock = vi.fn();
    render(<SymbolsDialog open={true} onInsert={onInsertMock} onClose={vi.fn()} />);

    const thirdItem = SYMBOL_GROUPS[0].items[2];
    const tile = screen.getByRole("button", { name: thirdItem.label });
    fireEvent.click(tile);

    const dialog = screen.getByRole("dialog", { name: /symbols/i });
    fireEvent.keyDown(dialog, { key: "Enter" });

    expect(onInsertMock).toHaveBeenCalledTimes(1);
    expect(onInsertMock).toHaveBeenCalledWith(thirdItem);
  });

  it("SYMBOL_GROUPS has the 4 groups with 14, 10, 10, 10 items", () => {
    expect(SYMBOL_GROUPS).toHaveLength(4);
    expect(SYMBOL_GROUPS[0].title).toBe("Honorifics");
    expect(SYMBOL_GROUPS[0].items).toHaveLength(14);

    expect(SYMBOL_GROUPS[1].title).toBe("Brackets & marks");
    expect(SYMBOL_GROUPS[1].items).toHaveLength(10);

    expect(SYMBOL_GROUPS[2].title).toBe("Urdu numbers");
    expect(SYMBOL_GROUPS[2].items).toHaveLength(10);

    expect(SYMBOL_GROUPS[3].title).toBe("Circled numbers");
    expect(SYMBOL_GROUPS[3].items).toHaveLength(10);
  });
});
