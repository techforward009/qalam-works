/**
 * Pages / Pageless is a VIEW preference only.
 * It must not live in the document JSON schema.
 */
import { mmToPx, scaleLayoutToWidth, type ResolvedPageLayout } from "./pageLayout";
import type { RulerUnit } from "./rulerLayout";
import { studioJameelFontFaceCss } from "./fontRegistry";

export type { RulerUnit };

export type DocumentViewMode = "pages" | "pageless";

export const DEFAULT_DOCUMENT_VIEW_MODE: DocumentViewMode = "pages";
export const VIEW_MODE_STORAGE_KEY = "qalam-document-studio-view-mode-v1";
/** Comfortable pageless reading width (~65–75ch), not a paper size. */
export const PAGELESS_MAX_WIDTH_PX = 720;
export const PAGE_STACK_GAP_PX = 12;
export const RULER_PAGE_GUTTER_PX = 8;
/** Browser-native spellcheck only. Not a Qalam grammar engine. */
export const EDITOR_SPELLCHECK_ATTR = "true";

export type DocumentZoom = 50 | 75 | 100 | 125 | 150 | "fit-width" | "fit-page";
export const DOCUMENT_ZOOM_PRESETS = [50, 75, 100, 125, 150] as const;
export const DEFAULT_DOCUMENT_ZOOM: DocumentZoom = 100;
export const ZOOM_STORAGE_KEY = "qalam-document-studio-zoom-v1";
export const RULER_STORAGE_KEY = "qalam-document-studio-ruler-v1";
export const RULER_UNIT_STORAGE_KEY = "qalam-document-studio-ruler-unit-v1";
export const DEFAULT_RULER_VISIBLE = true;
export const DEFAULT_RULER_UNIT: RulerUnit = "cm";

export function isDocumentViewMode(value: unknown): value is DocumentViewMode {
  return value === "pages" || value === "pageless";
}

export function parseStoredViewMode(raw: string | null | undefined): DocumentViewMode {
  if (raw === "pageless" || raw === "pages") return raw;
  return DEFAULT_DOCUMENT_VIEW_MODE;
}

export function loadDocumentViewMode(): DocumentViewMode {
  if (typeof window === "undefined") return DEFAULT_DOCUMENT_VIEW_MODE;
  try {
    return parseStoredViewMode(window.localStorage.getItem(VIEW_MODE_STORAGE_KEY));
  } catch {
    return DEFAULT_DOCUMENT_VIEW_MODE;
  }
}

export function saveDocumentViewMode(mode: DocumentViewMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export function isDocumentZoom(value: unknown): value is DocumentZoom {
  return value === "fit-width" || value === "fit-page" || DOCUMENT_ZOOM_PRESETS.includes(value as 50);
}

export function parseStoredZoom(raw: string | null | undefined): DocumentZoom {
  if (raw === "fit-width" || raw === "fit-page") return raw;
  const numeric = Number(raw);
  if (DOCUMENT_ZOOM_PRESETS.includes(numeric as 50)) return numeric as DocumentZoom;
  return DEFAULT_DOCUMENT_ZOOM;
}

export function loadDocumentZoom(): DocumentZoom {
  if (typeof window === "undefined") return DEFAULT_DOCUMENT_ZOOM;
  try {
    return parseStoredZoom(window.localStorage.getItem(ZOOM_STORAGE_KEY));
  } catch {
    return DEFAULT_DOCUMENT_ZOOM;
  }
}

export function saveDocumentZoom(zoom: DocumentZoom): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
  } catch {
    /* ignore */
  }
}

export function loadRulerVisible(): boolean {
  if (typeof window === "undefined") return DEFAULT_RULER_VISIBLE;
  try {
    const raw = window.localStorage.getItem(RULER_STORAGE_KEY);
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
    return DEFAULT_RULER_VISIBLE;
  } catch {
    return DEFAULT_RULER_VISIBLE;
  }
}

export function saveRulerVisible(visible: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RULER_STORAGE_KEY, visible ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function parseStoredRulerUnit(raw: string | null | undefined): RulerUnit {
  return raw === "in" ? "in" : DEFAULT_RULER_UNIT;
}

export function loadRulerUnit(): RulerUnit {
  if (typeof window === "undefined") return DEFAULT_RULER_UNIT;
  try {
    return parseStoredRulerUnit(window.localStorage.getItem(RULER_UNIT_STORAGE_KEY));
  } catch {
    return DEFAULT_RULER_UNIT;
  }
}

export function saveRulerUnit(unit: RulerUnit): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RULER_UNIT_STORAGE_KEY, unit);
  } catch {
    /* ignore */
  }
}

export function resolveZoomFactor(
  zoom: DocumentZoom,
  sheetWidthPx: number,
  sheetHeightPx: number,
  availableWidthPx: number,
  availableHeightPx: number,
): number {
  if (zoom === "fit-width") {
    if (!(sheetWidthPx > 0) || !(availableWidthPx > 0)) return 1;
    return availableWidthPx / sheetWidthPx;
  }
  if (zoom === "fit-page") {
    if (!(sheetWidthPx > 0) || !(sheetHeightPx > 0)) return 1;
    const widthFactor = availableWidthPx > 0 ? availableWidthPx / sheetWidthPx : 1;
    const heightFactor = availableHeightPx > 0 ? availableHeightPx / sheetHeightPx : widthFactor;
    return Math.min(widthFactor, heightFactor);
  }
  return zoom / 100;
}

export function zoomMenuAction(zoom: DocumentZoom): `view.zoom.${50 | 75 | 100 | 125 | 150 | "fit-width" | "fit-page"}` {
  return `view.zoom.${zoom}`;
}

export function zoomFromMenuAction(id: string): DocumentZoom | null {
  if (!id.startsWith("view.zoom.")) return null;
  return parseStoredZoom(id.slice("view.zoom.".length));
}

export function printDocumentStudio(): void {
  void printDocumentStudioAsync();
}

export async function waitForPrintFonts(portal: HTMLElement | null): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const fonts = document.fonts;
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      /* continue */
    }
  }
  const needsJameel = Boolean(portal?.innerHTML.includes("Jameel Noori Nastaleeq"));
  if (needsJameel && fonts?.load) {
    try {
      await fonts.load('16px "Jameel Noori Nastaleeq"');
    } catch {
      /* fallback remains Noto */
    }
  }
  const jameelReady = needsJameel ? Boolean(fonts?.check?.('16px "Jameel Noori Nastaleeq"')) : true;
  portal?.setAttribute("data-print-waited-fonts", "true");
  portal?.setAttribute("data-print-jameel-ready", jameelReady ? "true" : "false");
  return jameelReady;
}

export async function printDocumentStudioAsync(): Promise<void> {
  if (typeof window === "undefined") return;
  const portal = mountDocumentPrintPortal();
  if (!portal) {
    window.print();
    return;
  }
  await waitForPrintFonts(portal);
  const cleanup = () => unmountDocumentPrintPortal();
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}

export function unmountDocumentPrintPortal(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-studio-print-portal]").forEach((node) => node.remove());
}

export function mountDocumentPrintPortal(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  unmountDocumentPrintPortal();
  const root = document.querySelector("[data-studio-print-root]");
  const surface = document.querySelector("[data-studio-print-surface]");
  if (!root || !surface) return null;
  const widthMm = Number(root.getAttribute("data-print-page-width-mm") || 210);
  const heightMm = Number(root.getAttribute("data-print-page-height-mm") || 297);
  const topMm = Number(root.getAttribute("data-print-margin-top-mm") || 0);
  const bottomMm = Number(root.getAttribute("data-print-margin-bottom-mm") || 0);
  const leftMm = Number(root.getAttribute("data-print-margin-left-mm") || 0);
  const rightMm = Number(root.getAttribute("data-print-margin-right-mm") || 0);
  const dir = root.getAttribute("data-print-dir") === "rtl" ? "rtl" : "ltr";
  const source = surface.querySelector(".qalam-editor-content") ?? surface;
  const portal = document.createElement("div");
  portal.setAttribute("data-studio-print-portal", "true");
  portal.setAttribute("data-print-page-width-mm", String(widthMm));
  portal.setAttribute("data-print-page-height-mm", String(heightMm));
  portal.setAttribute("data-print-ignores-zoom", "true");
  const page = document.createElement("div");
  page.setAttribute("data-studio-print-page", "true");
  page.setAttribute("dir", dir);
  page.className = source.className;
  page.innerHTML = source.innerHTML;
  page.style.cssText = `width:${widthMm}mm;box-sizing:border-box;padding:${topMm}mm ${rightMm}mm ${bottomMm}mm ${leftMm}mm;background:#fff;min-height:0;`;
  const style = document.createElement("style");
  style.textContent = `${studioJameelFontFaceCss()}\n${documentPrintCss(widthMm, heightMm)}`;
  portal.append(style, page);
  document.body.appendChild(portal);
  return portal;
}

/** Print CSS uses physical page mm and hides the whole app except the body-level portal. */
export function documentPrintCss(widthMm: number, heightMm: number): string {
  return `
@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
@media screen {
  [data-studio-print-portal] {
    position: absolute !important;
    left: -99999px !important;
    top: 0 !important;
    width: ${widthMm}mm !important;
  }
}
@media print {
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    width: ${widthMm}mm !important;
    height: auto !important;
    min-height: 0 !important;
  }
  body > *:not([data-studio-print-portal]) { display: none !important; }
  header, footer, nav, [data-studio-chrome], [data-studio-ruler], [data-studio-ruler-frame], [data-studio-vertical-ruler] {
    display: none !important;
  }
  [data-studio-print-portal] {
    display: block !important;
    position: static !important;
    left: auto !important;
    inset: auto !important;
    width: ${widthMm}mm !important;
    max-width: ${widthMm}mm !important;
    background: #fff !important;
    transform: none !important;
    scale: none !important;
  }
  [data-studio-print-page] {
    width: ${widthMm}mm !important;
    max-width: ${widthMm}mm !important;
    box-sizing: border-box !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    break-after: auto !important;
    min-height: 0 !important;
    transform: none !important;
  }
}
`.trim();
}

export function visualPageCount(contentHeightPx: number, pageHeightPx: number): number {
  if (!(pageHeightPx > 0)) return 1;
  return Math.max(1, Math.ceil(Math.max(0, contentHeightPx) / pageHeightPx));
}

/** Page count for measured editor content. Do not add a phantom extra page. */
export function visualPageCountWithGaps(
  spacedHeightPx: number,
  pageHeightPx: number,
  gapPx: number,
): number {
  if (!(pageHeightPx > 0)) return 1;
  const height = Math.max(0, spacedHeightPx);
  if (height <= pageHeightPx) return 1;
  const stride = pageHeightPx + Math.max(0, gapPx);
  return Math.max(2, Math.ceil((height + Math.max(0, gapPx)) / stride));
}

export function pagesSheetMetrics(layout: ResolvedPageLayout, availableWidthPx: number) {
  return scaleLayoutToWidth(layout, availableWidthPx);
}

export interface PageContentGeometry {
  pageHeightPx: number;
  topMarginPx: number;
  bottomMarginPx: number;
  contentHeightPx: number;
  gutterPx: number;
  pageTransitionPx: number;
}

/** Physical sheet metrics plus repeated per-page content area. */
export function resolvePageContentGeometry(
  layout: ResolvedPageLayout,
  sheet: { heightPx: number; scale: number },
  gutterPx = PAGE_STACK_GAP_PX,
): PageContentGeometry {
  const pageHeightPx = Math.max(0, sheet.heightPx);
  const topMarginPx = Math.max(0, mmToPx(layout.margins.topMm) * sheet.scale);
  const bottomMarginPx = Math.max(0, mmToPx(layout.margins.bottomMm) * sheet.scale);
  const contentHeightPx = Math.max(1, pageHeightPx - topMarginPx - bottomMarginPx);
  const pageTransitionPx = bottomMarginPx + Math.max(0, gutterPx) + topMarginPx;
  return { pageHeightPx, topMarginPx, bottomMarginPx, contentHeightPx, gutterPx: Math.max(0, gutterPx), pageTransitionPx };
}

export function pageTransitionSpacerPx(bottomMarginPx: number, gutterPx: number, topMarginPx: number): number {
  return Math.max(0, bottomMarginPx) + Math.max(0, gutterPx) + Math.max(0, topMarginPx);
}

/** Count sheets from spaced ProseMirror height using content-area + transition stride. */
export function visualPageCountForContentGeometry(spacedHeightPx: number, geo: PageContentGeometry): number {
  if (!(geo.contentHeightPx > 0)) return 1;
  const height = Math.max(0, spacedHeightPx);
  if (height <= geo.contentHeightPx + 0.5) return 1;
  const stride = geo.contentHeightPx + geo.pageTransitionPx;
  if (!(stride > 0)) return 1;
  return Math.max(2, Math.ceil(height / stride));
}


export function snapPageGapToLine(lineTop: number, pageStart: number, pageBottom: number): boolean {
  return lineTop > pageStart + 0.5 && lineTop < pageBottom;
}

export function pageGapWidgetHeight(lineTop: number, pageBottom: number, gapPx: number): number {
  return Math.max(0, pageBottom - lineTop) + gapPx;
}

export interface PageLineSplit {
  offsetY: number;
  pos: number;
}

export interface PageLineMetric {
  pos: number;
  top: number;
  bottom: number;
  /** Character pos at a Y inside the line; used when the line itself overflows a page. */
  splitPos?: number;
  /** Safe in-block document positions, offset from the block's unshifted top. */
  splitPositions?: PageLineSplit[];
}

export interface PageGapBreak {
  pos: number;
  heightPx: number;
}

export type ResolvePageGapSplitPos = (line: PageLineMetric, offsetY: number) => number | null | undefined;

const MAX_INTERNAL_PAGE_SPLITS = 40;

export function isOversizedPageBlock(heightPx: number, pageHeightPx: number): boolean {
  return heightPx > pageHeightPx + 0.5;
}

export function pickSplitPosForOffset(line: PageLineMetric, offsetY: number): number | null {
  const candidates = line.splitPositions?.filter((entry) => entry.pos > line.pos) ?? [];
  if (candidates.length > 0) {
    let best = candidates[0];
    let bestDist = Math.abs(best.offsetY - offsetY);
    for (const entry of candidates) {
      const dist = Math.abs(entry.offsetY - offsetY);
      if (dist < bestDist) {
        best = entry;
        bestDist = dist;
      }
    }
    return best.pos;
  }
  if (typeof line.splitPos === "number" && line.splitPos > line.pos) return line.splitPos;
  return null;
}

/**
 * Pack lines onto sheets. Short blocks that straddle a page bottom may move
 * wholesale to the next sheet. Oversized blocks (taller than one page) MUST
 * split internally and must never receive a spacer at the paragraph start.
 */
export function collectPageGapBreaksFromLines(
  lines: ReadonlyArray<PageLineMetric>,
  pageHeightPx: number,
  gapPx: number,
  resolveSplitPos?: ResolvePageGapSplitPos,
): PageGapBreak[] {
  if (!(pageHeightPx > 0) || lines.length === 0) return [];
  const sorted = [...lines].sort((a, b) => a.top - b.top || a.pos - b.pos);
  const breaks: PageGapBreak[] = [];
  const seen = new Set<number>();
  let shift = 0;
  let pageStart = 0;

  const resolve = (line: PageLineMetric, offsetY: number): number | null => {
    const resolved = resolveSplitPos?.(line, offsetY);
    if (typeof resolved === "number" && resolved > line.pos) return resolved;
    return pickSplitPosForOffset(line, offsetY);
  };

  for (const line of sorted) {
    const height = Math.max(0, line.bottom - line.top);
    let visualTop = line.top + shift;
    let pageBottom = pageStart + pageHeightPx;

    while (visualTop >= pageBottom - 0.5) {
      pageStart = pageBottom + gapPx;
      pageBottom = pageStart + pageHeightPx;
    }

    if (isOversizedPageBlock(height, pageHeightPx)) {
      let consumed = 0;
      let splits = 0;
      while (consumed < height - 0.5 && splits < MAX_INTERNAL_PAGE_SPLITS) {
        visualTop = line.top + consumed + shift;
        pageBottom = pageStart + pageHeightPx;
        while (visualTop >= pageBottom - 0.5) {
          pageStart = pageBottom + gapPx;
          pageBottom = pageStart + pageHeightPx;
        }
        const remainingInBlock = height - consumed;
        const remainingOnPage = pageBottom - visualTop;
        if (remainingInBlock <= remainingOnPage + 0.5) break;
        const offsetY = consumed + remainingOnPage;
        const pos = resolve(line, offsetY);
        if (pos == null || pos <= line.pos || seen.has(pos)) break;
        seen.add(pos);
        breaks.push({ pos, heightPx: gapPx });
        shift += gapPx;
        if (offsetY <= consumed + 0.5) break;
        consumed = offsetY;
        pageStart = pageBottom + gapPx;
        splits += 1;
      }
      continue;
    }

    const visualBottom = visualTop + height;
    const straddles = visualBottom > pageBottom + 0.5 && visualTop > pageStart + 0.5 && visualTop < pageBottom;
    if (straddles) {
      const heightPx = pageGapWidgetHeight(visualTop, pageBottom, gapPx);
      if (!seen.has(line.pos)) {
        seen.add(line.pos);
        breaks.push({ pos: Math.max(1, line.pos), heightPx });
      }
      shift += heightPx;
      pageStart = pageBottom + gapPx;
    }
  }
  return breaks;
}
