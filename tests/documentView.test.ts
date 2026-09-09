import { describe, expect, it } from "vitest";
import { resolvePageLayout, mmToPx } from "../app/tools/document-studio/utils/pageLayout";
import {
  DEFAULT_DOCUMENT_VIEW_MODE,
  PAGELESS_MAX_WIDTH_PX,
  parseStoredViewMode,
  pagesSheetMetrics,
  visualPageCount,
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

  it("keeps Pageless as a max reading width, not a paper height", () => {
    expect(PAGELESS_MAX_WIDTH_PX).toBeGreaterThan(600);
    expect(PAGELESS_MAX_WIDTH_PX).toBeLessThan(900);
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
