/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { resolvePageLayout, mmToPx } from "../app/tools/document-studio/utils/pageLayout";
import {
  DEFAULT_DOCUMENT_VIEW_MODE,
  DEFAULT_DOCUMENT_ZOOM,
  PAGELESS_MAX_WIDTH_PX,
  parseStoredViewMode,
  parseStoredZoom,
  pagesSheetMetrics,
  resolveZoomFactor,
  visualPageCount,
  visualPageCountWithGaps,
  documentPrintCss,
  mountDocumentPrintPortal,
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
});

describe("View menu Pages/Pageless", () => {
  it("exposes Pages and Pageless with active wiring", () => {
    const ids = allMenuActionIds();
    expect(ids).toContain("view.pages");
    expect(ids).toContain("view.pageless");
    const view = DOCUMENT_MENU_BAR.find((m) => m.id === "view");
    const actions = (view?.items ?? []).filter((item) => item.type === "action").map((item) => item.id);
    expect(actions.slice(0, 2)).toEqual(["view.pages", "view.pageless"]);

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
});
