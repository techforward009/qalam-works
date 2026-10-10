/** @vitest-environment happy-dom */

import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import DocumentMenuBar from "../app/tools/document-studio/components/DocumentMenuBar";
import DocumentStatusBar from "../app/tools/document-studio/components/DocumentStatusBar";
import DocumentStudioShell from "../app/tools/document-studio/components/DocumentStudioShell";
import DocumentToolbar from "../app/tools/document-studio/components/DocumentToolbar";
import DocumentTopBar from "../app/tools/document-studio/components/DocumentTopBar";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";

afterEach(cleanup);

const shellSource = readFileSync("app/tools/document-studio/components/DocumentStudioShell.tsx", "utf8");

describe("Document Studio workspace chrome", () => {
  it("assigns Urdu interface fonts without restyling editor content", () => {
    expect(shellSource).toContain('"Noto Nastaliq Urdu"');
    expect(shellSource).toContain('"Nafees Nastaleeq"');
    expect(shellSource).toContain('"Jameel Noori Nastaleeq"');
    expect(shellSource).not.toContain(".qalam-editor-content");
    expect(shellSource).toContain("data-latin-control");
    expect(shellSource).toContain("[data-studio-dialog=\"ur\"]");
    expect(shellSource).toContain("[data-studio-empty-hint]");
  });

  it("keeps library and primary export in the document header", () => {
    const onOpenLibrary = () => undefined;
    render(
      <DocumentTopBar
        isUr
        title="مسودہ"
        onTitleChange={() => undefined}
        onTitleCommit={() => undefined}
        saveStatus="saved"
        storageDurability="persistent"
        online
        isImporting={false}
        onNewDocument={() => undefined}
        onUploadClick={() => undefined}
        onStandardize={() => undefined}
        onAudit={() => undefined}
        onOpenLibrary={onOpenLibrary}
        onDownloadDocx={() => undefined}
        onDownloadPdf={() => undefined}
        onPrint={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "ذخیرہ" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "درآمد" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "DOCX" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "پرنٹ" })).toBeTruthy();
  });

  it("closes a mobile panel from the backdrop without touching the canvas", () => {
    let closed = "";
    render(
      <DocumentStudioShell
        isUr
        topBar={<div>top</div>}
        menuBar={<div>menu</div>}
        toolbar={<div>tools</div>}
        statusBar={<div>status</div>}
        leftSidebar={<div>outline</div>}
        onDismissLeft={() => {
          closed = "left";
        }}
      >
        <div data-studio-canvas="true">page</div>
      </DocumentStudioShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "پینل بند کریں" }));
    expect(closed).toBe("left");
    expect(screen.getByText("page")).toBeTruthy();
  });

  it("moves the menubar with arrow keys and opens the focused menu", () => {
    render(<DocumentMenuBar isUr={false} onAction={() => undefined} />);
    const file = screen.getByRole("menuitem", { name: "File" });
    file.focus();
    fireEvent.keyDown(file, { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toBe("Edit");
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowDown" });
    expect(document.querySelector("[data-open-menu]")?.getAttribute("data-open-menu")).toBe("edit");
    expect(document.activeElement?.getAttribute("data-menu-action")).toBe("edit.undo");
  });

  it("keeps a long menu inside the viewport", () => {
    render(<DocumentMenuBar isUr onAction={() => undefined} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "فائل" }));
    const menu = document.querySelector("[data-menu-dropdown='file']") as HTMLElement;
    expect(menu.style.overflowY).toBe("auto");
    expect(Number.parseFloat(menu.style.maxHeight)).toBeGreaterThan(100);
    expect(screen.getByRole("menuitem", { name: "فائل درآمد" })).toBeTruthy();
  });

  it("shows page count only when the canvas reports pages", () => {
    const shared = {
      isUr: true,
      dir: "rtl" as const,
      stats: null,
      saveStatus: "saved" as const,
      storageDurability: "persistent" as const,
      online: true,
    };
    const { rerender } = render(<DocumentStatusBar {...shared} pageCount={4} />);
    expect(screen.getByText("صفحات")).toBeTruthy();
    expect(document.querySelector("[data-studio-page-count]")?.getAttribute("data-studio-page-count")).toBe("4");
    rerender(<DocumentStatusBar {...shared} pageCount={null} />);
    expect(screen.queryByText("صفحات")).toBeNull();
  });

  it("scrolls the formatting toolbar instead of widening the page and keeps editor selection", () => {
    const editor = new Editor({
      extensions: createDocumentStudioExtensions(),
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "سلام" }] }] },
    });
    render(<DocumentToolbar editor={editor as never} dir="rtl" setDir={() => undefined} isUr zoom={100} onZoomChange={() => undefined} />);
    const bar = document.querySelector("[data-studio-toolbar]");
    expect(bar?.className).toContain("overflow-x-auto");
    expect(bar?.className).toContain("flex-nowrap");
    expect(document.querySelector("[data-studio-toolbar-more]")).toBeTruthy();
    expect(document.querySelector("[data-studio-toolbar-secondary]")).toBeTruthy();
    const undo = screen.getByRole("button", { name: "کالعدم" });
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    undo.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    editor.destroy();
  });
});
