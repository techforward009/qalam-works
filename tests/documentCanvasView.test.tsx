/** @vitest-environment happy-dom */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DocumentCanvas from "../app/tools/document-studio/components/DocumentCanvas";
import { resolvePageLayout } from "../app/tools/document-studio/utils/pageLayout";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";

afterEach(() => {
  cleanup();
});

const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
const settings = defaultDocumentSettings();

function renderCanvas(viewMode: "pages" | "pageless") {
  return render(
    <DocumentCanvas
      editor={null}
      dir="ltr"
      isUr={false}
      isEditorEmpty={false}
      documentSettings={settings}
      pageLayout={layout}
      viewMode={viewMode}
      onLoadExample={vi.fn()}
      onWrapperClick={vi.fn()}
    />,
  );
}

describe("DocumentCanvas view modes", () => {
  it("renders Pages with canonical sheet geometry and no pageless column", () => {
    renderCanvas("pages");
    const root = document.querySelector("[data-studio-view='pages']");
    expect(root).toBeTruthy();
    expect(root?.getAttribute("data-page-width-mm")).toBe(String(layout.widthMm));
    expect(root?.getAttribute("data-page-height-mm")).toBe(String(layout.heightMm));
    expect(document.querySelector("[data-studio-pages-stack]")).toBeTruthy();
    expect(document.querySelector("[data-studio-pageless]")).toBeNull();
    expect(document.querySelector("[data-studio-page-sheet]")).toBeTruthy();
    expect(root?.getAttribute("data-page-count")).toBe("1");
    expect(document.querySelectorAll("[data-studio-page-sheet]").length).toBe(1);
  });

  it("renders Pageless without fixed page sheets", () => {
    renderCanvas("pageless");
    expect(document.querySelector("[data-studio-view='pageless']")).toBeTruthy();
    expect(document.querySelector("[data-studio-pageless]")).toBeTruthy();
    expect(document.querySelector("[data-studio-pages-stack]")).toBeNull();
    expect(document.querySelector("[data-studio-page-sheet]")).toBeNull();
  });
});
