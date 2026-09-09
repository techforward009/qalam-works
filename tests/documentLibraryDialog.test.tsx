/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
        onRename={onRename}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Document library")).toBeTruthy();
    expect(screen.getByText("Documents are stored in this browser.")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Open" })[1]);
    expect(onOpen).toHaveBeenCalledWith("2");
    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    expect(onRename).toHaveBeenCalledWith("1");
    fireEvent.click(screen.getByRole("button", { name: "New document" }));
    expect(onNew).toHaveBeenCalled();
  });
});
