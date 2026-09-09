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
    fireEvent.click(screen.getByRole("menuitem", { name: "New document" }));
    expect(onAction).toHaveBeenCalledWith("file.new");
    expect(document.querySelector('[data-menu-dropdown="file"]')).toBeNull();
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
    fireEvent.click(screen.getByRole("menuitem", { name: "PDF" }));
    expect(onAction).toHaveBeenCalledWith("file.downloadPdf");
    expect(document.querySelector('[data-menu-dropdown="file"]')).toBeNull();
  });
});
