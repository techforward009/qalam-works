/** @vitest-environment happy-dom */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DocumentCanvas from "../app/tools/document-studio/components/DocumentCanvas";
import { resolvePageLayout } from "../app/tools/document-studio/utils/pageLayout";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";

afterEach(() => {
  cleanup();
});

function stubMeasuredRulerBox(width = 794, height = 1123) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => height });
}

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
    stubMeasuredRulerBox();
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
    expect(document.querySelector("[data-studio-ruler]")).toBeTruthy();
    expect(document.querySelector("[data-studio-ruler]")?.getAttribute("data-ruler-page-width-mm")).toBe(String(layout.widthMm));
    expect(document.querySelector("[data-studio-vertical-ruler]")).toBeTruthy();
    expect(document.querySelector("[data-studio-vertical-ruler]")?.getAttribute("data-ruler-page-height-mm")).toBe(String(layout.heightMm));
    expect(Number(document.querySelector("[data-studio-ruler]")?.getAttribute("data-ruler-major-ticks"))).toBeGreaterThan(1);
    expect(Number(document.querySelector("[data-studio-ruler]")?.getAttribute("data-ruler-minor-ticks"))).toBeGreaterThan(1);
    expect(document.querySelector("[data-ruler-margin='start']")).toBeTruthy();
    expect(root?.getAttribute("data-print-ignores-zoom")).toBe("true");
    expect(root?.getAttribute("data-print-page-width-mm")).toBe(String(layout.widthMm));
    expect(document.querySelector("[data-print-sheet-last='true']")).toBeTruthy();
    expect(root?.getAttribute("data-studio-zoom")).toBe("100");
    expect(root?.querySelector("[data-ruler-gutter]")?.getAttribute("data-ruler-gutter")).toBe("8");
    expect(document.querySelector("[data-ruler-page-gap='horizontal']")).toBeTruthy();
    expect(document.querySelector("[data-ruler-page-gap='vertical']")).toBeTruthy();
    expect(root?.getAttribute("data-print-dir")).toBe("ltr");
  });

  it("renders Pageless without fixed page sheets", () => {
    renderCanvas("pageless");
    expect(document.querySelector("[data-studio-view='pageless']")).toBeTruthy();
    expect(document.querySelector("[data-studio-pageless]")).toBeTruthy();
    expect(document.querySelector("[data-studio-pages-stack]")).toBeNull();
    expect(document.querySelector("[data-studio-page-sheet]")).toBeNull();
    expect(document.querySelector("[data-studio-ruler]")).toBeNull();
    expect(document.querySelector("[data-studio-vertical-ruler]")).toBeNull();
  });

  it("hides the ruler when toggled off in Pages mode", () => {
    render(
      <DocumentCanvas
        editor={null}
        dir="ltr"
        isUr={false}
        isEditorEmpty={false}
        documentSettings={settings}
        pageLayout={layout}
        viewMode="pages"
        rulerVisible={false}
        onLoadExample={vi.fn()}
        onWrapperClick={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-studio-ruler]")).toBeNull();
    expect(document.querySelector("[data-studio-vertical-ruler]")).toBeNull();
    expect(document.querySelector("[data-studio-page-sheet]")).toBeTruthy();
  });

  it("applies visual zoom without adding extra pages", () => {
    render(
      <DocumentCanvas
        editor={null}
        dir="ltr"
        isUr={false}
        isEditorEmpty={false}
        documentSettings={settings}
        pageLayout={layout}
        viewMode="pages"
        zoom={150}
        onLoadExample={vi.fn()}
        onWrapperClick={vi.fn()}
      />,
    );
    const root = document.querySelector("[data-studio-view='pages']");
    expect(root?.getAttribute("data-studio-zoom")).toBe("150");
    expect(root?.getAttribute("data-page-count")).toBe("1");
    const surface = document.querySelector("[data-studio-zoom-surface]") as HTMLElement | null;
    expect(surface?.style.transform).toContain("1.5");
    expect(document.querySelector("[data-studio-print-root]")?.getAttribute("data-print-page-width-mm")).toBe(
      String(layout.widthMm),
    );
    expect(document.querySelector("[data-studio-print-root]")?.getAttribute("data-print-page-height-mm")).toBe(
      String(layout.heightMm),
    );
  });

  it("updates ruler geometry when page size/orientation change", () => {
    stubMeasuredRulerBox();
    const landscape = resolvePageLayout({ size: "a5", orientation: "landscape", marginPreset: "narrow" });
    render(
      <DocumentCanvas
        editor={null}
        dir="ltr"
        isUr={false}
        isEditorEmpty={false}
        documentSettings={settings}
        pageLayout={landscape}
        viewMode="pages"
        onLoadExample={vi.fn()}
        onWrapperClick={vi.fn()}
      />,
    );
    const h = document.querySelector("[data-studio-ruler]");
    const v = document.querySelector("[data-studio-vertical-ruler]");
    expect(h?.getAttribute("data-ruler-orientation")).toBe("landscape");
    expect(h?.getAttribute("data-ruler-page-size")).toBe("a5");
    expect(h?.getAttribute("data-ruler-page-width-mm")).toBe(String(landscape.widthMm));
    expect(v?.getAttribute("data-ruler-page-height-mm")).toBe(String(landscape.heightMm));
    expect(Number(v?.getAttribute("data-ruler-major-ticks"))).toBeGreaterThan(1);
    expect(Number(v?.getAttribute("data-ruler-minor-ticks"))).toBeGreaterThan(1);
  });

  it("exposes repeated page-margin geometry and sticky/multi rulers", () => {
    stubMeasuredRulerBox();
    renderCanvas("pages");
    const root = document.querySelector("[data-studio-view='pages']") as HTMLElement;
    expect(Number(root.getAttribute("data-page-top-margin-px"))).toBeGreaterThan(10);
    expect(Number(root.getAttribute("data-page-bottom-margin-px"))).toBeGreaterThan(10);
    const contentH = Number(root.getAttribute("data-page-content-height-px"));
    const top = Number(root.getAttribute("data-page-top-margin-px"));
    const bottom = Number(root.getAttribute("data-page-bottom-margin-px"));
    const transition = Number(root.getAttribute("data-page-transition-px"));
    expect(contentH).toBeGreaterThan(100);
    expect(transition).toBe(bottom + 12 + top);
    expect(document.querySelectorAll("[data-studio-ruler][data-ruler-axis='horizontal']").length).toBe(1);
    expect(document.querySelector("[data-studio-horizontal-ruler-sticky]")?.className).toContain("sticky");
    expect(document.querySelector("[data-vertical-ruler-count]")?.getAttribute("data-vertical-ruler-count")).toBe(root.getAttribute("data-page-count"));
    const verticalPages = document.querySelectorAll("[data-studio-vertical-ruler-page]");
    expect(verticalPages.length).toBe(Number(root.getAttribute("data-page-count")));
    expect(document.querySelectorAll("[data-studio-vertical-ruler]").length).toBe(Number(root.getAttribute("data-page-count")));
  });

  it("keeps a single horizontal ruler in RTL Pages mode", () => {
    stubMeasuredRulerBox();
    render(
      <DocumentCanvas
        editor={null}
        dir="rtl"
        isUr
        isEditorEmpty={false}
        documentSettings={settings}
        pageLayout={layout}
        viewMode="pages"
        onLoadExample={vi.fn()}
        onWrapperClick={vi.fn()}
      />,
    );
    const root = document.querySelector("[data-studio-view='pages']") as HTMLElement;
    expect(root.getAttribute("data-print-dir")).toBe("rtl");
    expect(Number(root.getAttribute("data-page-top-margin-px"))).toBe(Number(root.getAttribute("data-page-bottom-margin-px")));
    expect(document.querySelectorAll("[data-studio-ruler][data-ruler-axis='horizontal']").length).toBe(1);
  });
});
