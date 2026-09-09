/**
 * Pages / Pageless is a VIEW preference only.
 * It must not live in the document JSON schema.
 */
import { scaleLayoutToWidth, type ResolvedPageLayout } from "./pageLayout";

export type DocumentViewMode = "pages" | "pageless";

export const DEFAULT_DOCUMENT_VIEW_MODE: DocumentViewMode = "pages";
export const VIEW_MODE_STORAGE_KEY = "qalam-document-studio-view-mode-v1";
/** Comfortable pageless reading width (~65–75ch), not a paper size. */
export const PAGELESS_MAX_WIDTH_PX = 720;
export const PAGE_STACK_GAP_PX = 12;
/** Browser-native spellcheck only. Not a Qalam grammar engine. */
export const EDITOR_SPELLCHECK_ATTR = "true";

export type DocumentZoom = 50 | 75 | 100 | 125 | 150 | "fit-width" | "fit-page";
export const DOCUMENT_ZOOM_PRESETS = [50, 75, 100, 125, 150] as const;
export const DEFAULT_DOCUMENT_ZOOM: DocumentZoom = 100;
export const ZOOM_STORAGE_KEY = "qalam-document-studio-zoom-v1";
export const RULER_STORAGE_KEY = "qalam-document-studio-ruler-v1";
export const DEFAULT_RULER_VISIBLE = true;

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
  if (typeof window === "undefined") return;
  window.print();
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

export function snapPageGapToLine(lineTop: number, pageStart: number, pageBottom: number): boolean {
  return lineTop > pageStart + 0.5 && lineTop < pageBottom;
}

export function pageGapWidgetHeight(lineTop: number, pageBottom: number, gapPx: number): number {
  return Math.max(0, pageBottom - lineTop) + gapPx;
}

export interface PageLineMetric {
  pos: number;
  top: number;
  bottom: number;
  /** Character pos at a Y inside the line; used when the line itself overflows a page. */
  splitPos?: number;
}

export interface PageGapBreak {
  pos: number;
  heightPx: number;
}

/**
 * Pack lines onto sheets. A spacer before a line is leftover (fill the
 * sheet) + gapPx (the empty gutter). Later pages use shifted visual Y.
 */
export function collectPageGapBreaksFromLines(
  lines: ReadonlyArray<PageLineMetric>,
  pageHeightPx: number,
  gapPx: number,
): PageGapBreak[] {
  if (!(pageHeightPx > 0) || lines.length === 0) return [];
  const sorted = [...lines].sort((a, b) => a.top - b.top || a.pos - b.pos);
  const breaks: PageGapBreak[] = [];
  const seen = new Set<number>();
  let shift = 0;
  let pageStart = 0;

  for (const line of sorted) {
    const height = Math.max(0, line.bottom - line.top);
    let visualTop = line.top + shift;
    let pageBottom = pageStart + pageHeightPx;

    while (visualTop >= pageBottom - 0.5) {
      pageStart = pageBottom + gapPx;
      pageBottom = pageStart + pageHeightPx;
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
      continue;
    }

    if (visualTop <= pageStart + 0.5 && visualBottom > pageBottom + 0.5) {
      const pos = Math.max(1, line.splitPos ?? line.pos);
      if (!seen.has(pos)) {
        seen.add(pos);
        breaks.push({ pos, heightPx: gapPx });
      }
      shift += gapPx;
      pageStart = pageBottom + gapPx;
    }
  }
  return breaks;
}
