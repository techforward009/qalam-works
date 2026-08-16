/** Canonical page geometry for Document Studio editor + PDF + DOCX. */

export type PageSizeId = "a4" | "a5" | "letter";
export type PageOrientation = "portrait" | "landscape";
export type MarginPresetId = "normal" | "narrow" | "wide" | "custom";

export interface PageMarginsMm {
  topMm: number;
  bottomMm: number;
  startMm: number;
  endMm: number;
}

export interface ResolvedPageLayout {
  size: PageSizeId;
  orientation: PageOrientation;
  widthMm: number;
  heightMm: number;
  margins: PageMarginsMm;
  /** Content area width (page width minus start/end margins) */
  contentWidthMm: number;
}

/** ISO / US page sizes in millimetres (portrait). */
const PAGE_SIZE_MM: Record<PageSizeId, { widthMm: number; heightMm: number }> = {
  a4: { widthMm: 210, heightMm: 297 },
  a5: { widthMm: 148, heightMm: 210 },
  letter: { widthMm: 215.9, heightMm: 279.4 },
};

const MARGIN_PRESETS: Record<Exclude<MarginPresetId, "custom">, PageMarginsMm> = {
  normal: { topMm: 25.4, bottomMm: 25.4, startMm: 25.4, endMm: 25.4 },
  narrow: { topMm: 12.7, bottomMm: 12.7, startMm: 12.7, endMm: 12.7 },
  wide: { topMm: 25.4, bottomMm: 25.4, startMm: 50.8, endMm: 50.8 },
};

export const MARGIN_MIN_MM = 5;
export const MARGIN_MAX_MM = 50;

export function mmToTwips(mm: number): number {
  // 1 inch = 25.4 mm = 1440 twips
  return Math.round((mm / 25.4) * 1440);
}

export function ptToHalfPoints(pt: number): number {
  return Math.round(pt * 2);
}

export function mmToPx(mm: number, dpi = 96): number {
  return (mm / 25.4) * dpi;
}

export function clampMarginMm(value: number): number {
  if (!Number.isFinite(value)) return MARGIN_PRESETS.normal.topMm;
  return Math.min(MARGIN_MAX_MM, Math.max(MARGIN_MIN_MM, value));
}

export function resolveMargins(
  preset: MarginPresetId,
  custom?: Partial<PageMarginsMm>
): PageMarginsMm {
  if (preset !== "custom") {
    return { ...MARGIN_PRESETS[preset] };
  }
  const base = MARGIN_PRESETS.normal;
  return {
    topMm: clampMarginMm(custom?.topMm ?? base.topMm),
    bottomMm: clampMarginMm(custom?.bottomMm ?? base.bottomMm),
    startMm: clampMarginMm(custom?.startMm ?? base.startMm),
    endMm: clampMarginMm(custom?.endMm ?? base.endMm),
  };
}

export function resolvePageDimensions(
  size: PageSizeId,
  orientation: PageOrientation
): { widthMm: number; heightMm: number } {
  const base = PAGE_SIZE_MM[size] ?? PAGE_SIZE_MM.a4;
  if (orientation === "landscape") {
    return { widthMm: base.heightMm, heightMm: base.widthMm };
  }
  return { widthMm: base.widthMm, heightMm: base.heightMm };
}

export function resolvePageLayout(input: {
  size: PageSizeId;
  orientation: PageOrientation;
  marginPreset: MarginPresetId;
  customMargins?: Partial<PageMarginsMm>;
}): ResolvedPageLayout {
  const dims = resolvePageDimensions(input.size, input.orientation);
  const margins = resolveMargins(input.marginPreset, input.customMargins);
  return {
    size: input.size,
    orientation: input.orientation,
    widthMm: dims.widthMm,
    heightMm: dims.heightMm,
    margins,
    contentWidthMm: Math.max(0, dims.widthMm - margins.startMm - margins.endMm),
  };
}

export interface PhysicalMarginsMm {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

/** Logical start/end → physical left/right. Single source of truth: editor preview, ruler, PDF, DOCX all call this. */
export function resolvePhysicalMargins(margins: PageMarginsMm, dir: "rtl" | "ltr"): PhysicalMarginsMm {
  return {
    topMm: margins.topMm,
    bottomMm: margins.bottomMm,
    leftMm: dir === "rtl" ? margins.endMm : margins.startMm,
    rightMm: dir === "rtl" ? margins.startMm : margins.endMm,
  };
}

/** Puppeteer-compatible format string for common sizes (portrait only; landscape uses width/height). */
export function puppeteerPaperFormat(size: PageSizeId): "A4" | "A5" | "Letter" {
  if (size === "a5") return "A5";
  if (size === "letter") return "Letter";
  return "A4";
}
