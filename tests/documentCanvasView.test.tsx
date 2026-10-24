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
    expect(root?.querySelector("[data-ruler-gutter]")?.getAttribute("data-ruler-gutter")).toBe("2");
    expect(document.querySelector("[data-ruler-page-gap='horizontal']")).toBeTruthy();
    expect(document.querySelector("[data-ruler-page-gap='vertical']")).toBeTruthy();
    expect(root?.getAttribute("data-print-dir")).toBe("ltr");
    expect(document.querySelector("[data-studio-tool-palette]")).toBeTruthy();
    expect(document.querySelector("[data-studio-ruler]")?.getAttribute("data-ruler-unit")).toBe("mm");
    expect(document.querySelector("[data-studio-pasteboard-guide='left']")).toBeTruthy();
    expect(document.querySelector("[data-studio-pasteboard-guide='right']")).toBeTruthy();
    const leftGuide = document.querySelector("[data-studio-pasteboard-guide='left']") as HTMLElement;
    expect(Number(leftGuide.getAttribute("data-guide-outset"))).toBeGreaterThanOrEqual(100);
    expect(Number.parseFloat(leftGuide.style.left)).toBeLessThanOrEqual(-36);
    expect(document.querySelector("[data-studio-zoom-surface]")?.querySelector("[data-studio-pasteboard-guide]")).toBeNull();
    expect(document.querySelector("[data-studio-page-column]")?.getAttribute("dir")).toBe("ltr");
    expect(document.querySelector("[data-studio-margin-guides]")?.className).toContain("studio-no-print");
    expect(document.querySelectorAll("[data-studio-margin-corner]").length).toBe(0);
    expect(document.querySelector("[data-margin-cross='page']")).toBeTruthy();
    const marginLine = document.querySelector("[data-studio-margin-line='left']") as HTMLElement;
    expect(marginLine.style.background.toLowerCase()).toMatch(/#000|rgb\(0,\s*0,\s*0\)|black/);
    const sheet = document.querySelector("[data-studio-page-sheet]") as HTMLElement;
    expect(sheet.className).not.toContain("rounded");
    expect(sheet.style.borderRadius).toBe("0px");
    expect(sheet.style.border.toLowerCase()).toMatch(/#000|rgb\(0,\s*0,\s*0\)|black/);
    expect(sheet.style.boxShadow.toLowerCase()).toMatch(/404040|64,\s*64,\s*64/);
  });

  it("margin guides follow custom physical margins and stay out of the print clone", () => {
    const custom = resolvePageLayout({
      size: "a4",
      orientation: "portrait",
      marginPreset: "custom",
      customMargins: { topMm: 20, bottomMm: 30, startMm: 15, endMm: 40 },
    });
    render(
      <DocumentCanvas
        editor={null}
        dir="rtl"
        isUr={false}
        isEditorEmpty={false}
        documentSettings={settings}
        pageLayout={custom}
        viewMode="pages"
        onLoadExample={vi.fn()}
        onWrapperClick={vi.fn()}
      />,
    );
    const guide = document.querySelector("[data-studio-margin-guide='1']") as HTMLElement;
    expect(guide.getAttribute("data-margin-top-px")).toBe("76");
    expect(guide.getAttribute("data-margin-left-px")).toBe("151");
    expect(guide.getAttribute("data-margin-right-px")).toBe("57");
    expect(document.querySelector("[data-studio-ruler]")?.getAttribute("data-ruler-origin")).toBe("right");
    const labels = [...document.querySelectorAll("[data-studio-ruler] [data-ruler-label]")].map((node) => node.getAttribute("data-ruler-label"));
    expect(labels).toContain("0");
    expect(labels.some((label) => label?.startsWith("-"))).toBe(true);
    expect(document.querySelector(".qalam-editor-content")?.querySelector("[data-studio-margin-guides]")).toBeNull();
  });

  it("renders Pageless without fixed page sheets", () => {
    renderCanvas("pageless");
    expect(document.querySelector("[data-studio-view='pageless']")).toBeTruthy();
    expect(document.querySelector("[data-studio-pageless]")).toBeTruthy();
    expect(document.querySelector("[data-studio-pages-stack]")).toBeNull();
    expect(document.querySelector("[data-studio-page-sheet]")).toBeNull();
    expect(document.querySelector("[data-studio-margin-guides]")).toBeNull();
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
});
