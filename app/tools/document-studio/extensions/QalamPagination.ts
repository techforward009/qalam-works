/**
 * Qalam-owned Pages-mode pagination.
 *
 * VIEW-ONLY: decorations never write page nodes, hard breaks, or pagination
 * metadata into persisted document JSON.
 *
 * Mechanics ported (not the package) from RomikMakavana/tiptap-pagination-plus
 * v3.0.6 (MIT): a pos-0 decoration widget whose floated page/breaker elements
 * interrupt inline flow so one paragraph can span sheets. Qalam differences:
 * canonical pageLayout.ts geometry, logical start/end via resolvePhysicalMargins,
 * 12px gutter only (no header/footer chrome), unscaled offset measurements,
 * pointer-events:none on breakers, no hostile table CSS, empty meta
 * transactions with addToHistory:false.
 *
 * Copyright (c) Romik Makavana for the original float/widget approach.
 * See docs/THIRD-PARTY-NOTICES.md.
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import {
  layoutNaturalSizePx,
  mmToPx,
  resolvePhysicalMargins,
  type ResolvedPageLayout,
} from "../utils/pageLayout";
import { PAGE_STACK_GAP_PX } from "../utils/documentView";

export const QALAM_PAGINATION_PLUGIN = "qalamPagination";
export const QALAM_PAGINATION_GEOMETRY_META = "qalamPaginationGeometry";
export const QALAM_PAGINATION_COUNT_META = "qalamPaginationPageCount";
export const QALAM_PAGINATION_ATTR = "data-qalam-pagination";
export const QALAM_PAGINATION_CLASS = "qalam-pagination";
export const QALAM_PAGE_UNIT_ATTR = "data-studio-page-sheet";
export const QALAM_CANVAS_COLOR = "#E8E4DB";
export const qalamPaginationKey = new PluginKey<QalamPaginationPluginState>(QALAM_PAGINATION_PLUGIN);

export type QalamPaginationGeometry = {
  enabled: boolean;
  pageWidthPx: number;
  pageHeightPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  gapPx: number;
  canvasColor: string;
};

export type QalamPaginationPluginState = {
  geometry: QalamPaginationGeometry;
  pageCount: number;
  decorations: DecorationSet;
};

const DISABLED: QalamPaginationGeometry = {
  enabled: false,
  pageWidthPx: 0,
  pageHeightPx: 0,
  marginTopPx: 0,
  marginBottomPx: 0,
  marginLeftPx: 0,
  marginRightPx: 0,
  gapPx: PAGE_STACK_GAP_PX,
  canvasColor: QALAM_CANVAS_COLOR,
};

const STYLE_ATTR = "data-qalam-pagination-style";

export function contentAreaHeightPx(geometry: Pick<QalamPaginationGeometry, "pageHeightPx" | "marginTopPx" | "marginBottomPx">): number {
  return Math.max(1, geometry.pageHeightPx - geometry.marginTopPx - geometry.marginBottomPx);
}

export function pageStackHeightPx(pageCount: number, pageHeightPx: number, gapPx: number): number {
  const n = Math.max(1, Math.floor(pageCount) || 1);
  return n * pageHeightPx + Math.max(0, n - 1) * Math.max(0, gapPx);
}

export function extraPagesFromOverflow(overflowPx: number, contentAreaPx: number): number {
  if (!(overflowPx > 0) || !(contentAreaPx > 0)) return 0;
  return Math.ceil(overflowPx / contentAreaPx);
}

export function paginationGeometryFromLayout(
  layout: ResolvedPageLayout,
  dir: "rtl" | "ltr",
  enabled: boolean,
): QalamPaginationGeometry {
  const physical = resolvePhysicalMargins(layout.margins, dir);
  const size = layoutNaturalSizePx(layout);
  return {
    enabled,
    pageWidthPx: size.widthPx,
    pageHeightPx: size.heightPx,
    marginTopPx: mmToPx(physical.topMm),
    marginBottomPx: mmToPx(physical.bottomMm),
    marginLeftPx: mmToPx(physical.leftMm),
    marginRightPx: mmToPx(physical.rightMm),
    gapPx: PAGE_STACK_GAP_PX,
    canvasColor: QALAM_CANVAS_COLOR,
  };
}

export function getQalamPaginationState(editor: { state: { plugins: readonly unknown[] } } | null | undefined): QalamPaginationPluginState | undefined {
  if (!editor) return undefined;
  return qalamPaginationKey.getState((editor as { state: Parameters<typeof qalamPaginationKey.getState>[0] }).state);
}

export function applyQalamPagination(
  editor: { view: EditorView } | null | undefined,
  geometry: QalamPaginationGeometry,
): void {
  if (!editor?.view || editor.view.isDestroyed) return;
  const tr = editor.view.state.tr
    .setMeta(QALAM_PAGINATION_GEOMETRY_META, geometry)
    .setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

function ensurePaginationCss(): void {
  if (typeof document === "undefined") return;
  if (document.head.querySelector(`style[${STYLE_ATTR}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(STYLE_ATTR, "true");
  style.textContent = paginationCss();
  document.head.appendChild(style);
}

export function paginationCss(): string {
  return `
.ProseMirror.${QALAM_PAGINATION_CLASS} {
  box-sizing: border-box;
  width: var(--qalam-page-width);
  min-height: var(--qalam-page-height);
  padding-top: var(--qalam-margin-top);
  padding-bottom: 0;
  padding-left: var(--qalam-margin-left);
  padding-right: var(--qalam-margin-right);
  background: #fff;
  border: 1px solid rgba(26, 58, 42, 0.12);
  box-shadow: 0 8px 24px rgba(26, 58, 42, 0.10);
  outline: none;
}
.${QALAM_PAGINATION_CLASS}-pages {
  pointer-events: none;
  user-select: none;
}
.${QALAM_PAGINATION_CLASS}-unit {
  pointer-events: none;
  user-select: none;
}
.${QALAM_PAGINATION_CLASS}-page {
  float: left;
  clear: both;
  width: 0;
  height: 0;
  margin: 0;
  margin-top: var(--qalam-content-height);
  padding: 0;
  border: 0;
  pointer-events: none;
  user-select: none;
}
.${QALAM_PAGINATION_CLASS}-breaker {
  float: left;
  clear: both;
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  width: calc(100% + var(--qalam-margin-left) + var(--qalam-margin-right));
  margin-left: calc(-1 * var(--qalam-margin-left));
  margin-right: calc(-1 * var(--qalam-margin-right));
  pointer-events: none !important;
  user-select: none;
}
.${QALAM_PAGINATION_CLASS}-sheet-end,
.${QALAM_PAGINATION_CLASS}-sheet-start {
  width: 100%;
  background: #fff;
  pointer-events: none;
  user-select: none;
}
.${QALAM_PAGINATION_CLASS}-sheet-end {
  height: var(--qalam-margin-bottom);
  border-bottom: 1px solid rgba(26, 58, 42, 0.12);
}
.${QALAM_PAGINATION_CLASS}-sheet-start {
  height: var(--qalam-margin-top);
  border-top: 1px solid rgba(26, 58, 42, 0.12);
}
.${QALAM_PAGINATION_CLASS}-gutter {
  height: var(--qalam-page-gap);
  width: 100%;
  background: var(--qalam-canvas, ${QALAM_CANVAS_COLOR});
  pointer-events: none !important;
  user-select: none;
  box-shadow: none;
}
.${QALAM_PAGINATION_CLASS}-unit[data-last="true"] .${QALAM_PAGINATION_CLASS}-gutter,
.${QALAM_PAGINATION_CLASS}-unit[data-last="true"] .${QALAM_PAGINATION_CLASS}-sheet-start {
  display: none;
}
`.trim();
}

export function applyPaginationCssVars(dom: HTMLElement, geometry: QalamPaginationGeometry, pageCount: number): void {
  const content = contentAreaHeightPx(geometry);
  dom.style.setProperty("--qalam-page-width", `${geometry.pageWidthPx}px`);
  dom.style.setProperty("--qalam-page-height", `${geometry.pageHeightPx}px`);
  dom.style.setProperty("--qalam-margin-top", `${geometry.marginTopPx}px`);
  dom.style.setProperty("--qalam-margin-bottom", `${geometry.marginBottomPx}px`);
  dom.style.setProperty("--qalam-margin-left", `${geometry.marginLeftPx}px`);
  dom.style.setProperty("--qalam-margin-right", `${geometry.marginRightPx}px`);
  dom.style.setProperty("--qalam-page-gap", `${geometry.gapPx}px`);
  dom.style.setProperty("--qalam-content-height", `${content}px`);
  dom.style.setProperty("--qalam-canvas", geometry.canvasColor);
  dom.style.minHeight = `${pageStackHeightPx(pageCount, geometry.pageHeightPx, geometry.gapPx)}px`;
  if (geometry.enabled && geometry.pageWidthPx > 0) {
    dom.style.width = `${geometry.pageWidthPx}px`;
    dom.style.boxSizing = "border-box";
  }
}

function clearPaginationDom(dom: HTMLElement): void {
  dom.classList.remove(QALAM_PAGINATION_CLASS);
  [
    "--qalam-page-width",
    "--qalam-page-height",
    "--qalam-margin-top",
    "--qalam-margin-bottom",
    "--qalam-margin-left",
    "--qalam-margin-right",
    "--qalam-page-gap",
    "--qalam-content-height",
    "--qalam-canvas",
  ].forEach((name) => dom.style.removeProperty(name));
  dom.style.removeProperty("min-height");
  dom.style.removeProperty("width");
}

function el(tag: string, className: string, attrs?: Record<string, string>): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.setAttribute("aria-hidden", "true");
  node.setAttribute("contenteditable", "false");
  node.style.pointerEvents = "none";
  node.style.userSelect = "none";
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  }
  return node;
}

export function buildPaginationWidget(pageCount: number): HTMLElement {
  const count = Math.max(1, pageCount);
  const root = el("div", `${QALAM_PAGINATION_CLASS}-pages`, { [QALAM_PAGINATION_ATTR]: "true" });
  root.style.pointerEvents = "none";
  for (let i = 0; i < count; i++) {
    const last = i === count - 1;
    const unit = el("div", `${QALAM_PAGINATION_CLASS}-unit`, {
      [QALAM_PAGE_UNIT_ATTR]: String(i + 1),
      "data-last": last ? "true" : "false",
    });
    if (last) unit.setAttribute("data-print-sheet-last", "true");
    const page = el("div", `${QALAM_PAGINATION_CLASS}-page`);
    if (i === 0) page.setAttribute("data-first", "true");
    const breaker = el("div", `${QALAM_PAGINATION_CLASS}-breaker`);
    breaker.append(
      el("div", `${QALAM_PAGINATION_CLASS}-sheet-end`),
      el("div", `${QALAM_PAGINATION_CLASS}-gutter`),
      el("div", `${QALAM_PAGINATION_CLASS}-sheet-start`),
    );
    unit.append(page, breaker);
    root.append(unit);
  }
  return root;
}

function decorationSet(doc: EditorView["state"]["doc"], pageCount: number): DecorationSet {
  const count = Math.max(1, pageCount);
  return DecorationSet.create(doc, [
    Decoration.widget(0, () => buildPaginationWidget(count), {
      side: -1,
      ignoreSelection: true,
      key: `qalam-pagination-pages-${count}`,
    }),
  ]);
}

function offsetTopIn(el: HTMLElement, ancestor: HTMLElement): number | null {
  let top = 0;
  let node: HTMLElement | null = el;
  let hops = 0;
  while (node && hops < 24) {
    if (node === ancestor) return top;
    top += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    if (!parent || parent === node) break;
    node = parent;
    hops += 1;
  }
  return node === ancestor ? top : top;
}

function lastContentBottom(dom: HTMLElement): number {
  let bottom = 0;
  for (const child of Array.from(dom.children) as HTMLElement[]) {
    if (child.hasAttribute(QALAM_PAGINATION_ATTR) || child.classList.contains(`${QALAM_PAGINATION_CLASS}-pages`)) continue;
    const y = child.offsetTop + child.offsetHeight;
    if (y > bottom) bottom = y;
  }
  return bottom;
}

const MAX_PAGES = 80;

/**
 * Measure overflow using offsetTop/offsetHeight (unscaled), never
 * transform-affected getBoundingClientRect.
 */
export function measureUnscaledPageCount(dom: HTMLElement, geometry: QalamPaginationGeometry, _currentCount: number): number {
  if (!geometry.enabled || !(geometry.pageHeightPx > 0)) return 1;
  const contentH = contentAreaHeightPx(geometry);
  const contentBottom = lastContentBottom(dom);
  const pagination = dom.querySelector<HTMLElement>(`[${QALAM_PAGINATION_ATTR}]`);
  const breakers = pagination?.querySelectorAll<HTMLElement>(`.${QALAM_PAGINATION_CLASS}-breaker`);
  if (!breakers || breakers.length === 0) {
    const pages = Math.max(1, Math.ceil(Math.max(contentBottom, 1) / contentH));
    return Math.min(MAX_PAGES, pages);
  }
  const lastBreaker = breakers[breakers.length - 1];
  const breakerTop = offsetTopIn(lastBreaker, dom) ?? lastBreaker.offsetTop;
  const breakerBottom = breakerTop + lastBreaker.offsetHeight;
  const overflow = contentBottom - breakerBottom;
  const existing = breakers.length;
  if (overflow > 1) {
    return Math.min(MAX_PAGES, existing + extraPagesFromOverflow(overflow, contentH));
  }
  let extra = 0;
  for (let i = existing - 1; i >= 1; i--) {
    const breaker = breakers[i];
    const top = offsetTopIn(breaker, dom) ?? breaker.offsetTop;
    if (top > contentBottom + 1) extra += 1;
    else break;
  }
  // Require two extra sheets before shrinking so zoom/layout jitter cannot
  // drop a real page. Same stickiness as the MIT source's removePage > 1.
  if (extra > 1) return Math.max(1, existing - extra);
  return existing;
}

function geometryEqual(a: QalamPaginationGeometry, b: QalamPaginationGeometry): boolean {
  return (
    a.enabled === b.enabled &&
    a.pageWidthPx === b.pageWidthPx &&
    a.pageHeightPx === b.pageHeightPx &&
    a.marginTopPx === b.marginTopPx &&
    a.marginBottomPx === b.marginBottomPx &&
    a.marginLeftPx === b.marginLeftPx &&
    a.marginRightPx === b.marginRightPx &&
    a.gapPx === b.gapPx &&
    a.canvasColor === b.canvasColor
  );
}

function createPaginationPlugin() {
  return new Plugin<QalamPaginationPluginState>({
    key: qalamPaginationKey,
    state: {
      init: () => ({ geometry: DISABLED, pageCount: 1, decorations: DecorationSet.empty }),
      apply(tr, prev) {
        const nextGeometry = (tr.getMeta(QALAM_PAGINATION_GEOMETRY_META) as QalamPaginationGeometry | undefined) ?? prev.geometry;
        const countMeta = tr.getMeta(QALAM_PAGINATION_COUNT_META);
        const nextCount =
          typeof countMeta === "number" && Number.isFinite(countMeta)
            ? Math.max(1, Math.floor(countMeta))
            : prev.pageCount;
        const geoChanged = !geometryEqual(nextGeometry, prev.geometry);
        const countChanged = nextCount !== prev.pageCount;
        if (!nextGeometry.enabled) {
          return { geometry: nextGeometry, pageCount: 1, decorations: DecorationSet.empty };
        }
        if (geoChanged || countChanged) {
          return {
            geometry: nextGeometry,
            pageCount: nextCount,
            decorations: decorationSet(tr.doc, nextCount),
          };
        }
        return {
          geometry: nextGeometry,
          pageCount: nextCount,
          decorations: prev.decorations.map(tr.mapping, tr.doc),
        };
      },
    },
    props: {
      decorations(state) {
        return qalamPaginationKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
    view(view) {
      let scheduled = false;
      let destroyed = false;
      const syncDom = () => {
        const st = qalamPaginationKey.getState(view.state);
        if (!st) return;
        ensurePaginationCss();
        if (st.geometry.enabled) {
          view.dom.classList.add(QALAM_PAGINATION_CLASS);
          applyPaginationCssVars(view.dom as HTMLElement, st.geometry, st.pageCount);
        } else {
          clearPaginationDom(view.dom as HTMLElement);
        }
      };
      const recompute = () => {
        scheduled = false;
        if (destroyed || view.isDestroyed) return;
        const st = qalamPaginationKey.getState(view.state);
        if (!st) return;
        syncDom();
        if (!st.geometry.enabled) return;
        const measured = measureUnscaledPageCount(view.dom as HTMLElement, st.geometry, st.pageCount);
        if (measured !== st.pageCount) {
          const tr = view.state.tr
            .setMeta(QALAM_PAGINATION_COUNT_META, measured)
            .setMeta("addToHistory", false);
          view.dispatch(tr);
        }
      };
      const schedule = () => {
        if (scheduled || destroyed) return;
        scheduled = true;
        requestAnimationFrame(recompute);
      };
      syncDom();
      schedule();
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
      ro?.observe(view.dom);
      return {
        update(view, prevState) {
          const st = qalamPaginationKey.getState(view.state);
          const prev = qalamPaginationKey.getState(prevState);
          if (!st || !prev) return;
          const geoChanged = !geometryEqual(st.geometry, prev.geometry);
          if (view.state.doc !== prevState.doc || geoChanged || st.pageCount !== prev.pageCount) {
            syncDom();
            schedule();
          }
        },
        destroy() {
          destroyed = true;
          ro?.disconnect();
          if (!view.isDestroyed) clearPaginationDom(view.dom as HTMLElement);
        },
      };
    },
  });
}

export const QalamPagination = Extension.create({
  name: QALAM_PAGINATION_PLUGIN,
  addProseMirrorPlugins() {
    return [createPaginationPlugin()];
  },
});
