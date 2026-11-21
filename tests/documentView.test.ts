/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import { resolvePageLayout, mmToPx } from "../app/tools/document-studio/utils/pageLayout";
import {
  DEFAULT_DOCUMENT_VIEW_MODE,
  DEFAULT_DOCUMENT_ZOOM,
  NARROW_STUDIO_PX,
  openingDocumentZoom,
  PAGELESS_MAX_WIDTH_PX,
  parseStoredViewMode,
  parseStoredZoom,
  pagesSheetMetrics,
  resolveZoomFactor,
  visualPageCount,
  visualPageCountWithGaps,
  documentPrintCss,
  mountDocumentPrintPortal,
  printDocumentStudioAsync,
  unmountDocumentPrintPortal,
} from "../app/tools/document-studio/utils/documentView";
import {
  DOCUMENT_MENU_BAR,
  allMenuActionIds,
} from "../app/tools/document-studio/utils/documentMenus";
import { dispatchDocumentMenuAction, type DocumentMenuHandlers } from "../app/tools/document-studio/utils/documentMenuActions";

describe("document view mode", () => {
  it("defaults to Pages", () => {
    expect(DEFAULT_DOCUMENT_VIEW_MODE).toBe("pages");
    expect(parseStoredViewMode(null)).toBe("pages");
    expect(parseStoredViewMode("nope")).toBe("pages");
  });

  it("parses persisted Pages and Pageless without touching document JSON", () => {
    const doc = { type: "doc", content: [{ type: "paragraph" }] };
    const snapshot = JSON.stringify(doc);
    expect(parseStoredViewMode("pageless")).toBe("pageless");
    expect(parseStoredViewMode("pages")).toBe("pages");
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it("uses canonical page geometry for Pages sheets", () => {
    const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
    const sheet = pagesSheetMetrics(layout, 2000);
    expect(sheet.scale).toBe(1);
    expect(sheet.widthPx).toBeCloseTo(mmToPx(layout.widthMm), 5);
    expect(sheet.heightPx).toBeCloseTo(mmToPx(layout.heightMm), 5);
    const fitted = pagesSheetMetrics(layout, 400);
    expect(fitted.scale).toBeLessThan(1);
    expect(fitted.widthPx).toBeCloseTo(400, 5);
    expect(fitted.heightPx / fitted.widthPx).toBeCloseTo(layout.heightMm / layout.widthMm, 5);
  });

  it("counts visual pages from content height", () => {
    expect(visualPageCount(10, 100)).toBe(1);
    expect(visualPageCount(100, 100)).toBe(1);
    expect(visualPageCount(101, 100)).toBe(2);
  });

  it("does not invent a trailing empty page in Pages mode", () => {
    expect(visualPageCountWithGaps(0, 100, 12)).toBe(1);
    expect(visualPageCountWithGaps(40, 100, 12)).toBe(1);
    expect(visualPageCountWithGaps(100, 100, 12)).toBe(1);
    expect(visualPageCountWithGaps(101, 100, 12)).toBe(2);
    expect(visualPageCountWithGaps(212, 100, 12)).toBe(2);
  });

  it("keeps Pageless as a max reading width, not a paper height", () => {
    expect(PAGELESS_MAX_WIDTH_PX).toBeGreaterThan(600);
    expect(PAGELESS_MAX_WIDTH_PX).toBeLessThan(900);
  });

  it("defaults zoom to 100% and scales without changing page geometry math", () => {
    expect(DEFAULT_DOCUMENT_ZOOM).toBe(100);
    expect(parseStoredZoom(null)).toBe(100);
    expect(parseStoredZoom("150")).toBe(150);
    expect(parseStoredZoom("fit-width")).toBe("fit-width");
    expect(resolveZoomFactor(100, 400, 600, 800, 900)).toBe(1);
    expect(resolveZoomFactor(50, 400, 600, 800, 900)).toBe(0.5);
    expect(resolveZoomFactor("fit-width", 400, 600, 800, 900)).toBe(2);
    expect(resolveZoomFactor("fit-page", 400, 800, 400, 400)).toBe(0.5);
  });

  it("opens a narrow window at fit width and a desktop window at 100%", () => {
    expect(NARROW_STUDIO_PX).toBe(900);
    expect(openingDocumentZoom(390)).toBe("fit-width");
    expect(openingDocumentZoom(899)).toBe("fit-width");
    expect(openingDocumentZoom(900)).toBe(100);
    expect(openingDocumentZoom(1366)).toBe(100);
  });
});

describe("View menu Pages/Pageless", () => {
  it("exposes Pages and Pageless with active wiring", () => {
    const ids = allMenuActionIds();
    expect(ids).toContain("view.pages");
    expect(ids).toContain("view.pageless");
    const view = DOCUMENT_MENU_BAR.find((m) => m.id === "view");
    const actions = (view?.items ?? []).filter((item) => item.type === "action").map((item) => item.id);
    expect(actions.slice(0, 4)).toEqual(["view.zoom.fit-page", "view.zoom.50", "view.zoom.100", "view.zoom.200"]);
    expect(actions).toContain("view.facing");
    expect(actions).toContain("view.pageless");

    const calls: string[] = [];
    const handlers = {
      setViewMode: (mode: "pages" | "pageless") => {
        calls.push(mode);
      },
    } as unknown as DocumentMenuHandlers;
    dispatchDocumentMenuAction("view.pageless", null, handlers);
    dispatchDocumentMenuAction("view.pages", null, handlers);
    expect(calls).toEqual(["pageless", "pages"]);
  });
});

describe("print portal strips view-only pagination", () => {
  afterEach(() => {
    unmountDocumentPrintPortal();
    document.body.innerHTML = "";
  });

  function mountPagedPrintPortal() {
    document.body.innerHTML = `
      <div data-studio-print-root data-print-page-width-mm="210" data-print-page-height-mm="297" data-print-dir="ltr">
        <div data-studio-print-surface>
          <div class="qalam-editor-content qalam-view-pages">
            <div class="ProseMirror qalam-pagination" style="min-height:1800px;width:794px;--qalam-page-height:1123px;--qalam-page-gap:12px;--qalam-content-height:937px;">
              <div data-qalam-pagination="true" class="qalam-pagination-pages">
                <div class="qalam-pagination-unit">
                  <div class="qalam-pagination-page"></div>
                  <div class="qalam-pagination-breaker">
                    <div class="qalam-pagination-sheet-end"></div>
                    <div class="qalam-pagination-gutter"></div>
                    <div class="qalam-pagination-sheet-start"></div>
                  </div>
                </div>
              </div>
              <p>Page one</p>
              <div data-resize-container data-image-float="right">
                <img data-wrap-mode="wrap" data-alignment="right" alt="wrap" />
              </div>
              <p class="qalam-image-wrap-beside" data-wrap-beside="right" style="--qalam-wrap-h:180px;margin-top:calc(-1 * var(--qalam-wrap-h, 0px))">
                <span data-image-wrap-spacer="right"></span>
                Wrapped beside
              </p>
              <div data-document-page-break="true">Page break</div>
              <p>Page two</p>
              <div data-document-section-break="true" data-section-break-type="nextPage">Section break (next page)</div>
              <p>Section two</p>
              <div data-document-section-break="true" data-section-break-type="continuous">Section break (continuous)</div>
              <p>Still continuous</p>
            </div>
          </div>
        </div>
      </div>`;
    return mountDocumentPrintPortal();
  }

  it("A: print portal clone contains no [data-qalam-pagination]", () => {
    const portal = mountPagedPrintPortal();
    expect(portal).toBeTruthy();
    expect(portal?.querySelector("[data-qalam-pagination]")).toBeNull();
  });

  it("B: print portal clone contains no .qalam-pagination-gutter", () => {
    const portal = mountPagedPrintPortal();
    expect(portal?.querySelector(".qalam-pagination-gutter")).toBeNull();
    expect(portal?.querySelector(".qalam-pagination-sheet-end")).toBeNull();
    expect(portal?.querySelector(".qalam-pagination-sheet-start")).toBeNull();
  });

  it("C: authored page/section break nodes remain in the print clone", () => {
    const portal = mountPagedPrintPortal();
    expect(portal?.querySelector('[data-document-page-break="true"]')).toBeTruthy();
    expect(portal?.querySelector('[data-document-section-break="true"][data-section-break-type="nextPage"]')).toBeTruthy();
    expect(portal?.querySelector('[data-document-section-break="true"][data-section-break-type="continuous"]')).toBeTruthy();
    expect(portal?.textContent).toContain("Page one");
    expect(portal?.textContent).toContain("Still continuous");
    expect(portal?.textContent).not.toMatch(/page break/i);
    expect(portal?.textContent).not.toMatch(/section break/i);
  });

  it("D: print clone does not retain pagination-only min-height/page-stack geometry", () => {
    const portal = mountPagedPrintPortal();
    const clone = portal?.querySelector(".ProseMirror") as HTMLElement | null;
    expect(clone).toBeTruthy();
    expect(clone?.classList.contains("qalam-pagination")).toBe(false);
    expect(clone?.style.minHeight).toBe("");
    expect(clone?.style.width).toBe("");
    expect(clone?.style.getPropertyValue("--qalam-page-gap")).toBe("");
    expect(clone?.style.getPropertyValue("--qalam-page-height")).toBe("");
    expect(clone?.style.getPropertyValue("--qalam-content-height")).toBe("");
    const page = portal?.querySelector("[data-studio-print-page]") as HTMLElement | null;
    expect(page?.style.minHeight === "0" || page?.style.minHeight === "0px").toBe(true);
    expect(page?.style.minHeight).not.toBe("1800px");
  });

  it("E: print clone converts Pages wrap to physical floats without negative pull-up", () => {
    const portal = mountPagedPrintPortal();
    const clone = portal?.querySelector(".ProseMirror") as HTMLElement | null;
    expect(clone).toBeTruthy();
    expect(clone?.querySelector(".qalam-image-wrap-beside")).toBeNull();
    expect(clone?.querySelector("[data-wrap-beside]")).toBeNull();
    expect(clone?.querySelector("[data-image-wrap-spacer]")).toBeNull();
    const wrapped = Array.from(clone?.querySelectorAll("p") ?? []).find((node) => node.textContent?.includes("Wrapped beside"));
    expect(wrapped).toBeTruthy();
    expect(wrapped?.classList.contains("qalam-image-wrap-beside")).toBe(false);
    expect(wrapped?.style.getPropertyValue("--qalam-wrap-h")).toBe("");
    expect(wrapped?.style.marginTop).toBe("");
    expect(clone?.querySelector("[data-image-float='right']")).toBeTruthy();
    expect(portal?.querySelector("[data-studio-print-page]")?.textContent).toContain("Wrapped beside");
  });

  it("F: print CSS zeros page-stack min-height and wrap-beside pull-up", () => {
    const css = documentPrintCss(210, 297);
    expect(css).toContain("[data-studio-print-page] .ProseMirror");
    expect(css).toContain("min-height: 0 !important");
    expect(css).toContain("p.qalam-image-wrap-beside");
    expect(css).toContain("[data-image-wrap-spacer]");
  });

  it("G: print CSS puts physical top/bottom margin on every sheet, not clone padding", () => {
    const css = documentPrintCss(210, 297, 25.4, 25.4);
    expect(css).toContain("@page { size: 210mm 297mm; margin: 25.4mm 0 25.4mm 0; }");
    expect(css).toContain("padding-top: 0 !important");
    expect(css).toContain("padding-bottom: 0 !important");
    document.body.innerHTML = `
      <div data-studio-print-root data-print-page-width-mm="210" data-print-page-height-mm="297" data-print-margin-top-mm="25.4" data-print-margin-bottom-mm="25.4" data-print-margin-left-mm="25.4" data-print-margin-right-mm="25.4" data-print-dir="ltr">
        <div data-studio-print-surface>
          <div class="qalam-editor-content">
            <div class="ProseMirror"><p>Hello</p></div>
          </div>
        </div>
      </div>`;
    const portal = mountDocumentPrintPortal();
    const page = portal?.querySelector("[data-studio-print-page]") as HTMLElement | null;
    expect(page?.style.paddingTop === "0" || page?.style.paddingTop === "0px").toBe(true);
    expect(page?.style.paddingBottom === "0" || page?.style.paddingBottom === "0px").toBe(true);
    expect(page?.style.paddingLeft).toContain("25.4");
    expect(page?.style.paddingRight).toContain("25.4");
    expect(portal?.querySelector("style")?.textContent).toContain("margin: 25.4mm 0 25.4mm 0");
  });

  it("H2: zeroes [data-studio-print-page] .ProseMirror padding in both screen measurement and print CSS", () => {
    const css = documentPrintCss(210, 297, 25.4, 25.4);
    const screenSection = css.slice(css.indexOf("@media screen"), css.indexOf("@media print"));
    const printSection = css.slice(css.indexOf("@media print"));
    expect(screenSection).toContain("[data-studio-print-page] .ProseMirror");
    expect(screenSection).toContain("padding: 0 !important");
    expect(printSection).toContain("[data-studio-print-page] .ProseMirror");
    expect(printSection).toContain("padding: 0 !important");
  });

  it("H1: clamps Page-2 top-margin Run Around frames so Page-1 Browser Print text receives no phantom hole", async () => {
    document.body.innerHTML = `
      <div data-studio-print-root data-print-page-width-mm="210" data-print-page-height-mm="297" data-print-margin-top-mm="25.4" data-print-margin-bottom-mm="25.4" data-print-margin-left-mm="25.4" data-print-margin-right-mm="25.4" data-print-dir="rtl">
        <div data-studio-print-surface>
          <div class="qalam-editor-content">
            <div class="ProseMirror"><p>${"اب ".repeat(60)}</p></div>
          </div>
        </div>
      </div>`;
    const originalPrint = window.print;
    window.print = vi.fn();
    const originalProto = HTMLElement.prototype.getBoundingClientRect;
    const originalRangeRects = Range.prototype.getClientRects;
    const contentH = (297 - 50.8) * (96 / 25.4);
    // Paragraph sits in the bottom band of Page 1 (within 60px of contentH) where an unclamped
    // Page-2 frame at yMm=10 would previously bleed -59.5px across the page boundary.
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.tagName === "P") {
        return { left: 0, right: 700, top: contentH - 70, bottom: contentH - 5, width: 700, height: 65, x: 0, y: contentH - 70, toJSON() { return {}; } } as DOMRect;
      }
      return { left: 0, right: 700, top: 0, bottom: contentH, width: 700, height: contentH, x: 0, y: 0, toJSON() { return {}; } } as DOMRect;
    };
    Range.prototype.getClientRects = () => [{ width: 14, height: 18, left: 0, right: 14, top: 10, bottom: 28 }] as unknown as DOMRectList;
    const page2TopMarginFrame: StudioFrame = {
      id: "p2-top-margin",
      kind: "picture-rect",
      page: 2,
      xMm: 60,
      yMm: 10,
      wMm: 45,
      hMm: 30,
      flip: false,
      text: "",
      runAround: true,
    };
    try {
      await printDocumentStudioAsync([page2TopMarginFrame]);
      const portal = document.querySelector("[data-studio-print-portal]");
      expect(portal?.querySelector('[data-print-frame-id="p2-top-margin"]')).toBeTruthy();
      expect(portal?.querySelectorAll(".ProseMirror p [data-print-run-around]").length).toBe(0);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalProto;
      Range.prototype.getClientRects = originalRangeRects;
      window.print = originalPrint;
      unmountDocumentPrintPortal();
    }
  });

  it("H: excludes dontPrint Run Around frames from both Browser Print rendering and text exclusions", async () => {
    document.body.innerHTML = `
      <div data-studio-print-root data-print-page-width-mm="210" data-print-page-height-mm="297" data-print-margin-top-mm="20" data-print-margin-bottom-mm="20" data-print-margin-left-mm="20" data-print-margin-right-mm="20" data-print-dir="rtl">
        <div data-studio-print-surface>
          <div class="qalam-editor-content">
            <div class="ProseMirror"><p>${"اب ".repeat(40)}</p></div>
          </div>
        </div>
      </div>`;
    const originalPrint = window.print;
    window.print = vi.fn();
    const originalProto = HTMLElement.prototype.getBoundingClientRect;
    const originalRangeRects = Range.prototype.getClientRects;
    const box = { left: 0, right: 700, top: 0, bottom: 200, width: 700, height: 200, x: 0, y: 0, toJSON() { return {}; } } as DOMRect;
    HTMLElement.prototype.getBoundingClientRect = () => box;
    Range.prototype.getClientRects = () => [{ width: 14, height: 18, left: 0, right: 14, top: 10, bottom: 28 }] as unknown as DOMRectList;
    const hiddenFrame: StudioFrame = {
      id: "hidden-ra",
      kind: "picture-rect",
      page: 1,
      xMm: 60,
      yMm: 22,
      wMm: 40,
      hMm: 24,
      flip: false,
      text: "",
      dontPrint: true,
      runAround: true,
    };
    const printableFrame: StudioFrame = {
      id: "shown-ra",
      kind: "rect",
      page: 1,
      xMm: 120,
      yMm: 22,
      wMm: 35,
      hMm: 24,
      flip: false,
      text: "",
      dontPrint: false,
      runAround: true,
    };
    try {
      await printDocumentStudioAsync([hiddenFrame]);
      let portal = document.querySelector("[data-studio-print-portal]");
      expect(portal?.querySelector("[data-print-frame]")).toBeNull();
      expect(portal?.querySelector("[data-print-run-around]")).toBeNull();
      expect(portal?.querySelector("style")?.textContent).not.toContain("@page{margin:0;}");

      await printDocumentStudioAsync([hiddenFrame, printableFrame]);
      portal = document.querySelector("[data-studio-print-portal]");
      expect(portal?.querySelector('[data-print-frame-id="hidden-ra"]')).toBeNull();
      expect(portal?.querySelector('[data-print-frame-id="shown-ra"]')).toBeTruthy();
      expect(portal?.querySelectorAll("[data-print-run-around='gap']").length).toBeGreaterThan(0);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalProto;
      Range.prototype.getClientRects = originalRangeRects;
      window.print = originalPrint;
      unmountDocumentPrintPortal();
    }
  });
});
