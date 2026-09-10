import { describe, expect, it } from "vitest";
import { resolvePageLayout, mmToPx } from "../app/tools/document-studio/utils/pageLayout";
import {
  DEFAULT_DOCUMENT_VIEW_MODE,
  DEFAULT_DOCUMENT_ZOOM,
  PAGELESS_MAX_WIDTH_PX,
  PAGE_STACK_GAP_PX,
  parseStoredViewMode,
  parseStoredZoom,
  pagesSheetMetrics,
  pageTransitionSpacerPx,
  resolvePageContentGeometry,
  resolveZoomFactor,
  visualPageCount,
  visualPageCountForContentGeometry,
  visualPageCountWithGaps,
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


  it("repeats top/bottom margins in page-transition geometry", () => {
    const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
    const sheet = pagesSheetMetrics(layout, 2000);
    const geo = resolvePageContentGeometry(layout, sheet, PAGE_STACK_GAP_PX);
    expect(geo.contentHeightPx).toBeCloseTo(geo.pageHeightPx - geo.topMarginPx - geo.bottomMarginPx, 5);
    expect(geo.topMarginPx).toBeGreaterThan(10);
    expect(geo.bottomMarginPx).toBeGreaterThan(10);
    expect(geo.pageTransitionPx).toBeCloseTo(geo.bottomMarginPx + PAGE_STACK_GAP_PX + geo.topMarginPx, 5);
    expect(pageTransitionSpacerPx(20, 12, 20)).toBe(52);
    expect(visualPageCountForContentGeometry(geo.contentHeightPx, geo)).toBe(1);
    expect(visualPageCountForContentGeometry(geo.contentHeightPx + 1 + geo.pageTransitionPx, geo)).toBe(2);
    const three = 2 * geo.contentHeightPx + 2 * geo.pageTransitionPx + 10;
    expect(visualPageCountForContentGeometry(three, geo)).toBe(3);
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
