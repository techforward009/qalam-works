/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DocumentMenuBar from "../app/tools/document-studio/components/DocumentMenuBar";

afterEach(() => {
  cleanup();
});

describe("DocumentMenuBar", () => {
  it("keeps only one top-level menu open", () => {
    render(<DocumentMenuBar isUr={false} onAction={vi.fn()} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "File" }));
    expect(document.querySelector('[data-menu-dropdown="file"]')).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(document.querySelector('[data-menu-dropdown="file"]')).toBeNull();
    expect(document.querySelector('[data-menu-dropdown="edit"]')).toBeTruthy();
  });

  it("closes on Escape and outside click", () => {
    render(<DocumentMenuBar isUr={false} onAction={vi.fn()} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "File" }));
    expect(document.querySelector('[data-menu-dropdown="file"]')).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector('[data-menu-dropdown="file"]')).toBeNull();

    fireEvent.click(screen.getByRole("menuitem", { name: "View" }));
    expect(document.querySelector('[data-menu-dropdown="view"]')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(document.querySelector('[data-menu-dropdown="view"]')).toBeNull();
  });

  it("runs a File action and closes", () => {
    const onAction = vi.fn();
    render(<DocumentMenuBar isUr={false} onAction={onAction} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "File" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^New…/ }));
    expect(onAction).toHaveBeenCalledWith("file.new");
    expect(document.querySelector('[data-menu-dropdown="file"]')).toBeNull();
  });

  it("wires Open document in the File menu", () => {
    const onAction = vi.fn();
    render(<DocumentMenuBar isUr={false} onAction={onAction} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "File" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Open…/ }));
    expect(onAction).toHaveBeenCalledWith("file.open");
  });

  it("dispatches File Close for the active window", () => {
    const onAction = vi.fn();
    render(<DocumentMenuBar isUr={false} onAction={onAction} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "File" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Close/ }));
    expect(onAction).toHaveBeenCalledWith("file.close");
  });

  it('dispatches the now-working File Exit command',()=>{
    const onAction=vi.fn();render(<DocumentMenuBar isUr={false} onAction={onAction}/>);
    fireEvent.click(screen.getByRole('menuitem',{name:'File'}));fireEvent.click(screen.getByRole('menuitem',{name:/^Exit/}));expect(onAction).toHaveBeenCalledWith('file.exit');
  });

  it("exposes menubar accessibility basics", () => {
    render(<DocumentMenuBar isUr={false} onAction={vi.fn()} />);
    const bar = screen.getByRole("menubar", { name: "Document menu" });
    expect(bar).toBeTruthy();
    const file = screen.getByRole("menuitem", { name: "File" });
    expect(file.getAttribute("aria-haspopup")).toBe("true");
    expect(file.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(file);
    expect(file.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("portals the dropdown so overflow parents cannot clip it", () => {
    const { container } = render(
      <div style={{ overflow: "hidden", height: 32 }}>
        <DocumentMenuBar isUr={false} onAction={vi.fn()} />
      </div>,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "File" }));
    const dropdown = document.querySelector('[data-menu-dropdown="file"]');
    expect(dropdown).toBeTruthy();
    expect(dropdown?.getAttribute("data-menu-portaled")).toBe("true");
    expect(container.contains(dropdown)).toBe(false);
    expect(document.body.contains(dropdown)).toBe(true);
  });

  it("portals nested Download actions outside the parent menu", () => {
    const onAction = vi.fn();
    render(<DocumentMenuBar isUr={false} onAction={onAction} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "File" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Download" }));
    const parent = document.querySelector('[data-menu-dropdown="file"]');
    const flyout = document.querySelector('[data-menu-flyout="file.download"]');
    expect(parent).toBeTruthy();
    expect(flyout).toBeTruthy();
    expect(flyout?.getAttribute("data-menu-portaled")).toBe("true");
    expect(parent?.contains(flyout)).toBe(false);
    fireEvent.click(screen.getByRole("menuitem", { name: "DOCX" }));
    expect(onAction).toHaveBeenCalledWith("file.downloadDocx");
    expect(document.querySelector('[data-menu-dropdown="file"]')).toBeNull();
  });
});

describe("Window session menu", () => {
  it("numbers actual open titles and marks only the active document", () => {
    const action = vi.fn();
    render(<DocumentMenuBar isUr={false} onAction={action} openDocuments={[{ id: "a", title: "First" }, { id: "b", title: "اردو مضمون" }]} activeDocumentId="b" />);
    fireEvent.click(screen.getByRole("menuitem", { name: /^Window$/ }));
    const first = screen.getByRole("menuitem", { name: "1 First" });
    const second = screen.getByRole("menuitem", { name: "2 اردو مضمون" });
    expect(first.getAttribute("aria-checked")).toBeNull();
    expect(second.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(first); expect(action).toHaveBeenCalledWith("window.document:a");
  });
  it("Alt+F12 activates Page only inside the studio, not in dialogs or elsewhere", () => {
    const action = vi.fn();
    render(<><div data-studio-shell><DocumentMenuBar isUr={false} onAction={action} /><input aria-label="Inside" /><div role="dialog"><input aria-label="Dialog field" /></div></div><input aria-label="Outside" /></>);
    fireEvent.keyDown(screen.getByLabelText("Outside"), { key: "F12", altKey: true });
    fireEvent.keyDown(screen.getByLabelText("Dialog field"), { key: "F12", altKey: true });
    expect(action).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByLabelText("Inside"), { key: "F12", altKey: true });
    expect(action).toHaveBeenCalledExactlyOnceWith("window.page");
  });
});

describe("Keyboard menu", () => {
  it("sits immediately before Window and selects layouts", () => {
    const onSelectLayout = vi.fn();
    const onEditCustom = vi.fn();
    render(<DocumentMenuBar isUr={false} onAction={vi.fn()} keyboard={{ layoutId: "off", hasCustom: false, onSelectLayout, onEditCustom }} />);
    const roots = [...document.querySelectorAll("[data-menu-root]")].map((el) => el.getAttribute("data-menu-root"));
    expect(roots.indexOf("keyboard")).toBe(roots.indexOf("window") - 1);
    fireEvent.click(screen.getByRole("menuitem", { name: /^Keyboard$/ }));
    expect(document.querySelector('[data-menu-dropdown="keyboard"] [aria-checked="true"]')?.textContent).toContain("System Keyboard");
    fireEvent.click(screen.getByRole("menuitem", { name: /^Phonetic Keyboard/ }));
    expect(onSelectLayout).toHaveBeenCalledWith("inpagePhonetic");
    fireEvent.click(screen.getByRole("menuitem", { name: /^Keyboard$/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Custom Keyboard/ }));
    expect(onEditCustom).toHaveBeenCalledTimes(1);
    expect(onSelectLayout).toHaveBeenCalledTimes(1);
  });

  it("is absent without the keyboard prop", () => {
    render(<DocumentMenuBar isUr={false} onAction={vi.fn()} />);
    expect(document.querySelector('[data-menu-root="keyboard"]')).toBeNull();
  });
});

describe("DocumentMenuBar InPage 2009 styling, RTL alignment, and keyboard navigation", () => {
  it("tracks data-menu-state open/closed transitions and renders shared classic bevel + gutter styling on dropdown and flyout", () => {
    render(<DocumentMenuBar isUr={false} onAction={vi.fn()} />);
    const editBtn = document.querySelector<HTMLButtonElement>('[data-menu-root="edit"]')!;
    expect(editBtn.getAttribute("data-menu-state")).toBe("closed");

    fireEvent.click(editBtn);
    expect(editBtn.getAttribute("data-menu-state")).toBe("open");

    const dropdown = document.querySelector<HTMLElement>('[data-menu-dropdown="edit"]')!;
    expect(dropdown.getAttribute("dir")).toBe("ltr");
    expect(["#f0f0f0", "rgb(240, 240, 240)"]).toContain(dropdown.style.backgroundColor);
    expect(dropdown.style.backgroundImage).toContain("linear-gradient(to right");
    expect(dropdown.style.boxShadow).toContain("1px 1px 0");
    expect(dropdown.style.borderStyle).toBe("solid");

    // Open submenu flyout via mouse/click
    const prefRow = dropdown.querySelector<HTMLElement>('[data-menu-submenu="edit.preferences"]')!;
    fireEvent.pointerEnter(prefRow, { pointerType: "mouse" });
    const flyout = document.querySelector<HTMLElement>('[data-menu-flyout="edit.preferences"]')!;
    expect(flyout).toBeTruthy();
    expect(flyout.style.backgroundImage).toContain("linear-gradient(to right");

    fireEvent.click(editBtn);
    expect(editBtn.getAttribute("data-menu-state")).toBe("closed");
  });

  it("supports LTR ArrowRight/ArrowLeft submenu entry/exit, top-menu switching, and Tab dismissal", () => {
    render(<DocumentMenuBar isUr={false} onAction={vi.fn()} />);
    const editBtn = document.querySelector<HTMLButtonElement>('[data-menu-root="edit"]')!;
    editBtn.focus();
    fireEvent.click(editBtn);

    const dropdown = document.querySelector<HTMLElement>('[data-menu-dropdown="edit"]')!;
    const prefTrigger = dropdown.querySelector<HTMLElement>('[data-menu-submenu="edit.preferences"]')!;
    prefTrigger.focus();

    // ArrowRight on submenu trigger opens flyout and moves focus to its first enabled item
    fireEvent.keyDown(dropdown, { key: "ArrowRight" });
    const flyout = document.querySelector<HTMLElement>('[data-menu-flyout="edit.preferences"]')!;
    expect(flyout).toBeTruthy();
    expect(flyout.contains(document.activeElement)).toBe(true);

    // ArrowLeft inside flyout closes flyout and restores focus to parent submenu trigger
    fireEvent.keyDown(flyout, { key: "ArrowLeft" });
    expect(document.querySelector('[data-menu-flyout="edit.preferences"]')).toBeNull();
    expect(document.activeElement).toBe(prefTrigger);

    // ArrowRight on a normal (non-submenu) dropdown item moves to next top-level menu (View)
    const undoBtn = dropdown.querySelector<HTMLElement>('[data-menu-action="edit.undo"], [data-menu-action="edit.paste"]')!;
    undoBtn.focus();
    fireEvent.keyDown(dropdown, { key: "ArrowRight" });
    expect(document.querySelector('[data-menu-dropdown="view"]')).toBeTruthy();

    // ArrowLeft from View moves back to Edit
    const viewDropdown = document.querySelector<HTMLElement>('[data-menu-dropdown="view"]')!;
    fireEvent.keyDown(viewDropdown, { key: "ArrowLeft" });
    const reopenedEdit = document.querySelector<HTMLElement>('[data-menu-dropdown="edit"]')!;
    expect(reopenedEdit).toBeTruthy();

    // Tab dismisses open menu
    fireEvent.keyDown(reopenedEdit, { key: "Tab" });
    expect(document.querySelector('[data-menu-dropdown]')).toBeNull();
  });

  it("unpins Urdu RTL menubar for RTL flow, applies RTL dropdown gutter, and reverses ArrowLeft/ArrowRight navigation", () => {
    // Even if desktop viewport matches (min-width: 721px), isUr disables hardcoded English x-offsets
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 721px)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    try {
      render(<DocumentMenuBar isUr={true} onAction={vi.fn()} />);
      const menubar = document.querySelector<HTMLElement>('[data-studio-menubar]')!;
      expect(menubar.getAttribute("dir")).toBe("rtl");
      expect(menubar.getAttribute("data-studio-menu-dir")).toBe("rtl");
      expect(menubar.getAttribute("data-studio-menu-pinned")).toBe("false");

      const editBtn = document.querySelector<HTMLButtonElement>('[data-menu-root="edit"]')!;
      fireEvent.click(editBtn);

      const dropdown = document.querySelector<HTMLElement>('[data-menu-dropdown="edit"]')!;
      expect(dropdown.getAttribute("dir")).toBe("rtl");
      expect(dropdown.style.backgroundImage).toContain("linear-gradient(to left");

      const prefTrigger = dropdown.querySelector<HTMLElement>('[data-menu-submenu="edit.preferences"]')!;
      prefTrigger.focus();

      // In RTL, ArrowLeft opens the submenu and focuses inside flyout
      fireEvent.keyDown(dropdown, { key: "ArrowLeft" });
      const flyout = document.querySelector<HTMLElement>('[data-menu-flyout="edit.preferences"]')!;
      expect(flyout).toBeTruthy();
      expect(flyout.getAttribute("dir")).toBe("rtl");
      expect(flyout.style.backgroundImage).toContain("linear-gradient(to left");
      expect(flyout.contains(document.activeElement)).toBe(true);

      // In RTL, ArrowRight closes flyout and returns focus to parent submenu trigger
      fireEvent.keyDown(flyout, { key: "ArrowRight" });
      expect(document.querySelector('[data-menu-flyout="edit.preferences"]')).toBeNull();
      expect(document.activeElement).toBe(prefTrigger);

      // In RTL, ArrowLeft on a regular dropdown item advances to View (forward in RTL menubar)
      const firstRow = dropdown.querySelector<HTMLElement>('[data-menu-action]')!;
      firstRow.focus();
      fireEvent.keyDown(dropdown, { key: "ArrowLeft" });
      expect(document.querySelector('[data-menu-dropdown="view"]')).toBeTruthy();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
