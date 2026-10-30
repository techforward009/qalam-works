/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DocumentLibraryDialog from "../app/tools/document-studio/components/DocumentLibraryDialog";

afterEach(() => {
  cleanup();
});

describe("DocumentLibraryDialog", () => {
  it("lists documents and exposes open/rename/delete/new", () => {
    const onOpen = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();
    const onNew = vi.fn();
    const onOpenInPage = vi.fn();
    render(
      <DocumentLibraryDialog
        isUr={false}
        documents={[
          { id: "1", title: "Alpha", createdAt: 1, updatedAt: 20 },
          { id: "2", title: "Beta", createdAt: 2, updatedAt: 10 },
        ]}
        activeId="1"
        onOpen={onOpen}
        onNew={onNew}
        onOpenInPage={onOpenInPage}
        onRename={onRename}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog",{name:"Open"})).toBeTruthy();
    expect(screen.getByText("Browser storage")).toBeTruthy();
    const rows=within(screen.getByRole("listbox",{name:"Saved documents"}));
    fireEvent.click(rows.getByRole("option",{name:/Beta/}));
    fireEvent.click(screen.getByRole("button", { name: /^Open$/ }));
    expect(onOpen).toHaveBeenCalledWith("2");
    fireEvent.click(rows.getByRole("option",{name:/Alpha/}));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(onRename).toHaveBeenCalledWith("1");
    fireEvent.click(screen.getByRole("button", { name: "New document" }));
    expect(onNew).toHaveBeenCalled();
    expect(screen.queryByRole("button", {name:"Open InPage file…"})).toBeNull();
    expect(screen.getByRole("option",{name:"InPage files (*.inp)"})).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox",{name:"Files of type"}),{target:{value:"inpage"}});
    fireEvent.click(screen.getByRole("button", { name: /^Open$/ }));
    expect(onOpenInPage).toHaveBeenCalled();
  });
});
