// tests/customKeyboardDialog.test.tsx
// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CustomKeyboardDialog } from "../app/tools/document-studio/components/CustomKeyboardDialog";
import type { KeyboardLayout } from "../app/tools/document-studio/utils/inpageKeyboard";

const dummyBaseLayouts: Record<
  "inpageMonotype" | "inpagePhonetic" | "arabic" | "persian",
  KeyboardLayout
> = {
  inpageMonotype: {
    KeyQ: { normal: "ق", shift: "ء" },
    KeyA: { normal: "م" },
  },
  inpagePhonetic: {
    KeyQ: { normal: "ق" },
  },
  arabic: {},
  persian: {},
};

describe("CustomKeyboardDialog Component", () => {
  it("renders when open and returns null when closed", () => {
    const { rerender } = render(
      <CustomKeyboardDialog
        open={false}
        initial={null}
        baseLayouts={dummyBaseLayouts}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog", { name: /custom keyboard/i })).toBeNull();

    rerender(
      <CustomKeyboardDialog
        open={true}
        initial={null}
        baseLayouts={dummyBaseLayouts}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole("dialog", { name: /custom keyboard/i })).not.toBeNull();
  });

  it('clicking key KeyQ and typing "ق" into the Normal char input then OK calls onSave with layout.KeyQ.normal === "ق"', () => {
    const handleSave = vi.fn();
    render(
      <CustomKeyboardDialog
        open={true}
        initial={{}}
        baseLayouts={dummyBaseLayouts}
        onSave={handleSave}
        onClose={vi.fn()}
      />
    );

    // Select KeyQ button
    const keyQBtn = document.querySelector('[data-key-code="KeyQ"]') as HTMLButtonElement;
    fireEvent.click(keyQBtn);

    // Type character "ق" into normal input
    const normalCharInput = document.querySelector('input[data-state-char="normal"]') as HTMLInputElement;

    expect(normalCharInput).not.toBeNull();
    fireEvent.change(normalCharInput!, { target: { value: "ق" } });

    // Click OK
    const okBtn = screen.getByRole("button", { name: /^ok$/i });
    fireEvent.click(okBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
    const savedLayout = handleSave.mock.calls[0][0];
    expect(savedLayout.KeyQ?.normal).toBe("ق");
  });

  it('typing decimal 1746 into the Shift code input sets "ے"', () => {
    const handleSave = vi.fn();
    render(
      <CustomKeyboardDialog
        open={true}
        initial={{}}
        baseLayouts={dummyBaseLayouts}
        onSave={handleSave}
        onClose={vi.fn()}
      />
    );

    // Select KeyQ
    const keyQBtn = document.querySelector('[data-key-code="KeyQ"]') as HTMLButtonElement;
    fireEvent.click(keyQBtn);

    // Enter 1746 (which is code point for 'ے') into Shift dec code input
    const shiftCodeInput = document.querySelector(
      'input[data-state-code="shift"]'
    ) as HTMLInputElement;
    expect(shiftCodeInput).not.toBeNull();
    fireEvent.change(shiftCodeInput, { target: { value: "1746" } });

    // Verify the character input updated accordingly
    const shiftCharInput = document.querySelector(
      'input[data-state-char="shift"]'
    ) as HTMLInputElement;
    expect(shiftCharInput.value).toBe("ے");
    fireEvent.click(screen.getByRole("button", { name: /^ok$/i }));
    expect(handleSave.mock.calls[0][0].KeyQ?.shift).toBe("ے");
  });

  it("never saves a Space mapping, even from the initial layout", () => {
    const handleSave = vi.fn();
    render(<CustomKeyboardDialog open initial={{ Space: { normal: "x" }, KeyA: { normal: "م" } }} baseLayouts={dummyBaseLayouts} onSave={handleSave} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^ok$/i }));
    const saved = handleSave.mock.calls[0][0];
    expect(saved.Space).toBeUndefined();
    expect(saved.KeyA?.normal).toBe("م");
  });

  it("Escape closes the dialog without reaching listeners underneath", () => {
    const onClose = vi.fn();
    const below = vi.fn();
    document.addEventListener("keydown", below);
    render(<CustomKeyboardDialog open initial={{}} baseLayouts={dummyBaseLayouts} onSave={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
    document.removeEventListener("keydown", below);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(below).not.toHaveBeenCalled();
  });

  it("a physical key press selects that key and is not passed on to the editor", () => {
    const below = vi.fn();
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.addEventListener("keydown", below);
    document.body.appendChild(editor);
    editor.focus();
    render(<CustomKeyboardDialog open initial={{}} baseLayouts={dummyBaseLayouts} onSave={vi.fn()} onClose={vi.fn()} />);
    const ev = new KeyboardEvent("keydown", { key: "a", code: "KeyA", bubbles: true, cancelable: true });
    act(() => { editor.dispatchEvent(ev); });
    editor.remove();
    expect(ev.defaultPrevented).toBe(true);
    expect(below).not.toHaveBeenCalled();
    const selected = document.querySelector('[data-key-code="KeyA"]') as HTMLElement;
    expect(selected.style.border).toContain("3px");
  });

  it("Enter commits via OK when focus is not in a field", () => {
    const handleSave = vi.fn();
    render(<CustomKeyboardDialog open initial={{ KeyA: { normal: "م" } }} baseLayouts={dummyBaseLayouts} onSave={handleSave} onClose={vi.fn()} />);
    fireEvent.keyDown(document.body, { key: "Enter", code: "Enter" });
    expect(handleSave).toHaveBeenCalledTimes(1);
  });
});
