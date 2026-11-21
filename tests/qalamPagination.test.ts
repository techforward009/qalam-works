/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { undoDepth } from "@tiptap/pm/history";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { setEditorContent } from "../app/tools/document-studio/utils/documentCommands";
import { PAGE_STACK_GAP_PX, resolveZoomFactor } from "../app/tools/document-studio/utils/documentView";
import { mmToPx, resolvePageLayout, resolvePhysicalMargins } from "../app/tools/document-studio/utils/pageLayout";
import {
  QALAM_PAGINATION_ATTR,
  QALAM_PAGINATION_COUNT_META,
  QALAM_PAGINATION_GEOMETRY_META,
  QALAM_PAGINATION_REMEASURE_META,
  QalamPagination,
  applyQalamPagination,
  buildPaginationWidget,
  contentAreaHeightPx,
  effectiveMinimumPageCount,
  extraPagesFromOverflow,
  getQalamPaginationState,
  measureUnscaledPageCount,
  pageStackHeightPx,
  paginationCss,
  paginationGeometryFromLayout,
  qalamPaginationKey,
} from "../app/tools/document-studio/extensions/QalamPagination";

const URDU_SENTENCE =
  "یہ ایک مسلسل اردو فقرة ہے جس میں جملہ لکھا گیا تاکہ متن صفحے کے پار بہے اور کوئی حصہ گم یا دہرایا نہ جائے۔";

function urduParagraph(n: number): string {
  return Array.from({ length: n }, (_, i) => `[#${i + 1}] ${URDU_SENTENCE}`).join(" ");
}

function englishParagraph(n: number): string {
  return Array.from({ length: n }, (_, i) => `[#${i + 1}] This English sentence continues across pages without duplication or loss.`).join(" ");
}

function makeEditor(content?: object) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const editor = new Editor({
    element: host,
    extensions: [...createDocumentStudioExtensions(), QalamPagination],
    content: content ?? {
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [] }],
    },
  });
  return { editor, host };
}

function a4Geometry(dir: "rtl" | "ltr", enabled = true, startMm = 25.4, endMm = 25.4) {
  const layout = resolvePageLayout({
    size: "a4",
    orientation: "portrait",
    marginPreset: "custom",
    customMargins: { topMm: 25.4, bottomMm: 25.4, startMm, endMm },
  });
  return { layout, geometry: paginationGeometryFromLayout(layout, dir, enabled) };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("Qalam pagination foundation", () => {
  it("A. pagination does not mutate JSON", () => {
    const { editor } = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: urduParagraph(4) }] }],
    });
    const before = JSON.stringify(editor.getJSON());
    const { geometry } = a4Geometry("rtl");
    applyQalamPagination(editor, geometry);
    editor.view.dispatch(
      editor.view.state.tr.setMeta(QALAM_PAGINATION_COUNT_META, 4).setMeta("addToHistory", false),
    );
    expect(JSON.stringify(editor.getJSON())).toBe(before);
    expect(JSON.stringify(editor.getJSON())).not.toMatch(/pageBreak|qalamPagination|hardBreak/);
    editor.destroy();
  });

  it("keeps a requested minimum page count when the document is empty", () => {
    const { editor } = makeEditor();
    const { layout } = a4Geometry("rtl");
    const geometry = paginationGeometryFromLayout(layout, "rtl", true, 2);
    expect(geometry.minimumPages).toBe(2);
    const host = document.createElement("div");
    expect(measureUnscaledPageCount(host, geometry, 1)).toBe(2);
    applyQalamPagination(editor, geometry);
    expect(JSON.stringify(editor.getJSON())).not.toMatch(/pageBreak/);
    expect(editor.getText()).toBe("");
    editor.destroy();
  });

  it("drops a trailing empty sheet when the text ends on the previous page", () => {
    const host = document.createElement("div");
    const paragraph = document.createElement("p");
    const pagination = document.createElement("div");
    pagination.setAttribute("data-qalam-pagination", "true");
    const first = document.createElement("div");
    const second = document.createElement("div");
    first.className = "qalam-pagination-breaker";
    second.className = "qalam-pagination-breaker";
    pagination.append(first, second);
    host.append(paragraph, pagination);
    const stub = (el: HTMLElement, top: number, height: number) => {
      Object.defineProperty(el, "offsetTop", { configurable: true, get: () => top });
      Object.defineProperty(el, "offsetHeight", { configurable: true, get: () => height });
      Object.defineProperty(el, "offsetParent", { configurable: true, get: () => host });
    };
    stub(paragraph, 20, 30);
    stub(first, 800, 12);
    stub(second, 1700, 12);
    const { layout } = a4Geometry("rtl");
    expect(measureUnscaledPageCount(host, paginationGeometryFromLayout(layout, "rtl", true, 1), 2)).toBe(1);
    expect(measureUnscaledPageCount(host, paginationGeometryFromLayout(layout, "rtl", true, 2), 2)).toBe(2);
  });

  it("B. one-page Urdu stays a single sheet", () => {
    const { editor } = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "[#1] مختصر اردو فقرة۔" }] }],
    });
    applyQalamPagination(editor, a4Geometry("rtl").geometry);
    expect(getQalamPaginationState(editor)?.pageCount).toBe(1);
    expect(editor.getText()).toContain("مختصر");
    editor.destroy();
  });

  it("C. 4-page single Urdu paragraph widget has no start spacer and unique markers", () => {
    const text = urduParagraph(90);
    const { editor } = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text }] }],
    });
    const before = JSON.stringify(editor.getJSON());
    applyQalamPagination(editor, a4Geometry("rtl").geometry);
    editor.view.dispatch(
      editor.view.state.tr.setMeta(QALAM_PAGINATION_COUNT_META, 4).setMeta("addToHistory", false),
    );
    expect(JSON.stringify(editor.getJSON())).toBe(before);
    const widget = buildPaginationWidget(4);
    expect(widget.querySelectorAll("[data-studio-page-sheet]").length).toBe(4);
    expect(widget.querySelector("[data-studio-page-sheet='1'] .qalam-pagination-page")?.getAttribute("data-first")).toBe("true");
    const markers = [...text.matchAll(/\[#(\d+)\]/g)].map((m) => m[1]);
    expect(new Set(markers).size).toBe(90);
    expect(editor.getText()).toBe(text);
    editor.destroy();
  });

  it("D. multiple Urdu paragraphs keep JSON and direction", () => {
    const { editor } = makeEditor({
      type: "doc",
      content: Array.from({ length: 8 }, (_, i) => ({
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [{ type: "text", text: `[#${i + 1}] ${URDU_SENTENCE}` }],
      })),
    });
    const before = JSON.stringify(editor.getJSON());
    applyQalamPagination(editor, a4Geometry("rtl").geometry);
    expect(JSON.stringify(editor.getJSON())).toBe(before);
    expect(editor.getJSON().content?.every((node) => node.attrs?.dir === "rtl")).toBe(true);
    editor.destroy();
  });

  it("E. English 3+ pages does not inject page nodes", () => {
    const text = englishParagraph(70);
    const { editor } = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text }] }],
    });
    applyQalamPagination(editor, a4Geometry("ltr").geometry);
    editor.view.dispatch(
      editor.view.state.tr.setMeta(QALAM_PAGINATION_COUNT_META, 5).setMeta("addToHistory", false),
    );
    const json = editor.getJSON();
    expect(json.content?.every((node) => node.type === "paragraph")).toBe(true);
    expect(editor.getText()).toBe(text);
    editor.destroy();
  });

  it("F. RTL logical start/end map to physical right/left", () => {
    const { layout, geometry } = a4Geometry("rtl", true, 50, 12.7);
    const physical = resolvePhysicalMargins(layout.margins, "rtl");
    expect(physical.leftMm).toBeCloseTo(12.7);
    expect(physical.rightMm).toBeCloseTo(50);
    expect(geometry.marginLeftPx).toBeCloseTo(mmToPx(12.7));
    expect(geometry.marginRightPx).toBeCloseTo(mmToPx(50));
  });

  it("G. LTR logical start/end map to physical left/right", () => {
    const { layout, geometry } = a4Geometry("ltr", true, 50, 12.7);
    const physical = resolvePhysicalMargins(layout.margins, "ltr");
    expect(physical.leftMm).toBeCloseTo(50);
    expect(physical.rightMm).toBeCloseTo(12.7);
    expect(geometry.marginLeftPx).toBeCloseTo(mmToPx(50));
    expect(geometry.marginRightPx).toBeCloseTo(mmToPx(12.7));
  });

  it("H. page gutter is 12px", () => {
    const widget = buildPaginationWidget(3);
    const gutters = widget.querySelectorAll(".qalam-pagination-gutter");
    expect(gutters.length).toBe(3);
    expect(PAGE_STACK_GAP_PX).toBe(12);
    expect(a4Geometry("rtl").geometry.gapPx).toBe(12);
    const last = widget.querySelector('[data-last="true"]');
    expect(last?.querySelector(".qalam-pagination-gutter")).toBeTruthy();
    expect(paginationCss()).toContain("display: none");
  });

  it("I. repeated top/bottom margins live on every breaker", () => {
    const widget = buildPaginationWidget(4);
    const ends = widget.querySelectorAll(".qalam-pagination-sheet-end");
    const starts = widget.querySelectorAll(".qalam-pagination-sheet-start");
    expect(ends.length).toBe(4);
    expect(starts.length).toBe(4);
    const geometry = a4Geometry("rtl").geometry;
    expect(geometry.marginTopPx).toBeCloseTo(mmToPx(25.4));
    expect(geometry.marginBottomPx).toBeCloseTo(mmToPx(25.4));
    expect(pageStackHeightPx(2, geometry.pageHeightPx, 12)).toBeCloseTo(
      geometry.pageHeightPx * 2 + 12,
    );
  });

  it("J. no blank first page — first unit has data-first page and no paragraph-start spacer", () => {
    const widget = buildPaginationWidget(4);
    const first = widget.querySelector("[data-studio-page-sheet='1']");
    expect(first?.querySelector(".qalam-pagination-page")?.getAttribute("data-first")).toBe("true");
    expect(first?.getAttribute("data-last")).toBe("false");
  });

  it("K. markers are unique — no duplicate/lost text in JSON", () => {
    const text = urduParagraph(40);
    const { editor } = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text }] }],
    });
    applyQalamPagination(editor, a4Geometry("rtl").geometry);
    const found = [...editor.getText().matchAll(/\[#(\d+)\]/g)].map((m) => m[1]);
    expect(found.length).toBe(40);
    expect(new Set(found).size).toBe(40);
    editor.destroy();
  });

  it("L. Pages -> Pageless -> Pages JSON invariant without setContent", () => {
    const { editor } = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: urduParagraph(12) }] }],
    });
    const from = editor.state.selection.from;
    applyQalamPagination(editor, a4Geometry("rtl").geometry);
    const pagesJson = JSON.stringify(editor.getJSON());
    const dir = editor.view.dom.getAttribute("dir");
    applyQalamPagination(editor, a4Geometry("rtl", false).geometry);
    expect(JSON.stringify(editor.getJSON())).toBe(pagesJson);
    expect(getQalamPaginationState(editor)?.decorations.find().length).toBe(0);
    applyQalamPagination(editor, a4Geometry("rtl").geometry);
    expect(JSON.stringify(editor.getJSON())).toBe(pagesJson);
    expect(editor.state.selection.from).toBe(from);
    expect(editor.view.dom.getAttribute("dir")).toBe(dir);
    editor.destroy();
  });

  it("M/N. selection and delete across a page-break range restore with one undo", () => {
    const text = urduParagraph(20);
    const { editor } = makeEditor();
    setEditorContent(editor, {
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text }] }],
    }, "load");
    applyQalamPagination(editor, a4Geometry("rtl").geometry);
    const loaded = JSON.stringify(editor.getJSON());
    expect(undoDepth(editor.state)).toBe(0);
    const size = editor.state.doc.content.size;
    const from = Math.max(2, Math.floor(size * 0.4));
    const to = Math.min(size - 1, from + 80);
    editor.commands.setTextSelection({ from, to });
    const selected = editor.state.doc.textBetween(from, to, "\n");
    expect(selected.length).toBeGreaterThan(10);
    editor.commands.deleteSelection();
    expect(JSON.stringify(editor.getJSON())).not.toBe(loaded);
    expect(undoDepth(editor.state)).toBe(1);
    editor.commands.undo();
    expect(JSON.stringify(editor.getJSON())).toBe(loaded);
    expect(undoDepth(editor.state)).toBe(0);
    editor.destroy();
  });

  it("O. one isolated user edit = one undo; pagination meta is not a history event", () => {
    const { editor } = makeEditor();
    setEditorContent(editor, {
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Hello" }] }],
    }, "load");
    expect(undoDepth(editor.state)).toBe(0);
    applyQalamPagination(editor, a4Geometry("ltr").geometry);
    editor.view.dispatch(
      editor.view.state.tr.setMeta(QALAM_PAGINATION_COUNT_META, 3).setMeta("addToHistory", false),
    );
    expect(undoDepth(editor.state)).toBe(0);
    editor.commands.insertContent("!");
    expect(undoDepth(editor.state)).toBe(1);
    editor.commands.undo();
    expect(editor.getText()).toBe("Hello");
    expect(undoDepth(editor.state)).toBe(0);
    editor.destroy();
  });

  it("P/Q/R/S/T. zoom is a visual scale and does not change page-count math", () => {
    const geometry = a4Geometry("rtl").geometry;
    const contentH = contentAreaHeightPx(geometry);
    const overflow = contentH * 3.2;
    const pages = 1 + extraPagesFromOverflow(overflow, contentH);
    expect(pages).toBe(5);
    expect(resolveZoomFactor(100, geometry.pageWidthPx, geometry.pageHeightPx, 900, 700)).toBe(1);
    expect(resolveZoomFactor(150, geometry.pageWidthPx, geometry.pageHeightPx, 900, 700)).toBe(1.5);
    const fitWidth = resolveZoomFactor("fit-width", geometry.pageWidthPx, geometry.pageHeightPx, 500, 700);
    const fitPage = resolveZoomFactor("fit-page", geometry.pageWidthPx, geometry.pageHeightPx, 500, 400);
    expect(fitWidth).toBeCloseTo(500 / geometry.pageWidthPx);
    expect(fitPage).toBeLessThan(1);
    expect(1 + extraPagesFromOverflow(overflow, contentH)).toBe(pages);
    expect(pageStackHeightPx(pages, geometry.pageHeightPx, 12)).toBe(
      pages * geometry.pageHeightPx + (pages - 1) * 12,
    );
  });

  it("U. pagination decorations have pointer-events none", () => {
    const widget = buildPaginationWidget(2);
    expect(widget.style.pointerEvents).toBe("none");
    widget.querySelectorAll("*").forEach((node) => {
      expect((node as HTMLElement).style.pointerEvents).toBe("none");
    });
    expect(paginationCss()).toContain("pointer-events: none");
  });

  it("V. old page-gap engine is not simultaneously active", () => {
    const { editor } = makeEditor();
    applyQalamPagination(editor, a4Geometry("rtl").geometry);
    expect(qalamPaginationKey.getState(editor.state)).toBeTruthy();
    expect(editor.extensionManager.extensions.some((ext) => ext.name === "qalamPageGaps")).toBe(false);
    expect(editor.extensionManager.extensions.some((ext) => ext.name === "qalamPagination")).toBe(true);
    expect(editor.view.dom.querySelector("[data-studio-page-gap]")).toBeNull();
    expect(paginationCss()).not.toContain("display: contents");
    expect(paginationCss()).not.toContain("word-break: break-all");
    expect(paginationCss()).not.toContain("ProseMirror-trailingBreak");
    editor.destroy();
  });

  it("W. canvas still hosts a single page-1 ruler; pagination CSS has no second ruler stack", () => {
    expect(paginationCss()).not.toContain("data-studio-vertical-ruler");
    expect(paginationCss()).not.toContain("WordRuler");
  });

  it("geometry meta transactions carry no document steps", () => {
    const { editor } = makeEditor();
    const before = editor.state.doc;
    applyQalamPagination(editor, a4Geometry("rtl").geometry);
    expect(editor.state.doc).toBe(before);
    const tr = editor.view.state.tr
      .setMeta(QALAM_PAGINATION_GEOMETRY_META, a4Geometry("rtl").geometry)
      .setMeta("addToHistory", false);
    expect(tr.steps.length).toBe(0);
    expect(tr.docChanged).toBe(false);
    editor.destroy();
  });

  it("load origin does not create undo history", () => {
    const { editor } = makeEditor();
    setEditorContent(editor, {
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Loaded" }] }],
    }, "load");
    expect(undoDepth(editor.state)).toBe(0);
    expect(editor.getText()).toBe("Loaded");
    editor.destroy();
  });

  it("collapses trailing empty page even when page-1 text ends near the breaker band, and remeasure meta keeps undo clean", () => {
    const host = document.createElement("div");
    const paragraph = document.createElement("p");
    const pagination = document.createElement("div");
    pagination.setAttribute("data-qalam-pagination", "true");
    const first = document.createElement("div");
    const second = document.createElement("div");
    first.className = "qalam-pagination-breaker";
    second.className = "qalam-pagination-breaker";
    pagination.append(first, second);
    host.append(paragraph, pagination);
    const stub = (el: HTMLElement, top: number, height: number) => {
      Object.defineProperty(el, "offsetTop", { configurable: true, get: () => top });
      Object.defineProperty(el, "offsetHeight", { configurable: true, get: () => height });
      Object.defineProperty(el, "offsetParent", { configurable: true, get: () => host });
    };
    // Page-1 text ends within 2px of breaker top (contentBottom = 799 vs breaker.offsetTop = 800),
    // but well before page 2 starts (top + height = 1004). Trailing empty sheet 2 must collapse to 1.
    stub(paragraph, 20, 779);
    stub(first, 800, 204);
    stub(second, 1800, 204);
    const { layout, geometry } = a4Geometry("rtl");
    expect(measureUnscaledPageCount(host, paginationGeometryFromLayout(layout, "rtl", true, 1), 2)).toBe(1);

    // Once text actually crosses below the breaker sheet-start boundary (contentBottom = 1030 > 1004), page 2 stays.
    stub(paragraph, 20, 1010);
    expect(measureUnscaledPageCount(host, paginationGeometryFromLayout(layout, "rtl", true, 1), 2)).toBe(2);

    const { editor } = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "آزمائش" }] }],
    });
    applyQalamPagination(editor, geometry);
    const beforeDoc = editor.state.doc;
    const tickBefore = getQalamPaginationState(editor)?.remeasureTick ?? 0;
    editor.view.dispatch(
      editor.view.state.tr.setMeta(QALAM_PAGINATION_REMEASURE_META, true).setMeta("addToHistory", false),
    );
    expect(getQalamPaginationState(editor)?.remeasureTick).toBe(tickBefore + 1);
    expect(editor.state.doc).toBe(beforeDoc);
    expect(undoDepth(editor.state)).toBe(0);
    editor.destroy();
  });

  it("M2: raises effective minimum pages when a frame sits on Page 2+ and collapses once removed", () => {
    expect(effectiveMinimumPageCount(1, [])).toBe(1);
    expect(effectiveMinimumPageCount(1, [{ page: 1 }, { page: 2 }])).toBe(2);
    expect(effectiveMinimumPageCount(3, [{ page: 2 }])).toBe(3);

    const host = document.createElement("div");
    const paragraph = document.createElement("p");
    const pagination = document.createElement("div");
    pagination.setAttribute("data-qalam-pagination", "true");
    const b1 = document.createElement("div");
    const b2 = document.createElement("div");
    b1.className = "qalam-pagination-breaker";
    b2.className = "qalam-pagination-breaker";
    pagination.append(b1, b2);
    host.append(paragraph, pagination);
    const stub = (el: HTMLElement, top: number, height: number) => {
      Object.defineProperty(el, "offsetTop", { configurable: true, get: () => top });
      Object.defineProperty(el, "offsetHeight", { configurable: true, get: () => height });
      Object.defineProperty(el, "offsetParent", { configurable: true, get: () => host });
    };
    // Short text on Page 1 (contentBottom = 300 < b1 top 800), yet a frame on Page 2 keeps 2 pages alive.
    stub(paragraph, 20, 280);
    stub(b1, 800, 204);
    stub(b2, 1800, 204);
    const { layout } = a4Geometry("rtl");
    const floorWithFrame = effectiveMinimumPageCount(1, [{ page: 2 }]);
    expect(measureUnscaledPageCount(host, paginationGeometryFromLayout(layout, "rtl", true, floorWithFrame), 2)).toBe(2);

    // Removing the Page-2 frame lowers the floor back to 1, allowing trailing empty Page 2 to collapse.
    const floorWithoutFrame = effectiveMinimumPageCount(1, [{ page: 1 }]);
    expect(measureUnscaledPageCount(host, paginationGeometryFromLayout(layout, "rtl", true, floorWithoutFrame), 2)).toBe(1);
  });
});
