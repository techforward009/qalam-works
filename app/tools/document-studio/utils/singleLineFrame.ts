import { blockLeadingPt } from "./autoLeading";
import type { DocumentStudioSettings } from "./documentSettings";
import { editorFontFamilyStack } from "./fontRegistry";

/** Screen chrome already used by text frames: 1px border and 2px padding on each edge. */
export const SINGLE_LINE_BORDER_PX = 1;
export const SINGLE_LINE_PADDING_PX = 2;
/** Soft wrap. Newlines are not stored; a long title breaks inside the width. */
export const SINGLE_LINE_WHITE_SPACE = "pre-wrap";
export const SINGLE_LINE_OVERFLOW_WRAP = "break-word";
/** Ignore this much extra border-box px before counting another line. */
const MEASURE_SLACK_PX = 2;

const PX_PER_PT = 96 / 72;
const PX_PER_MM = 96 / 25.4;

export type FrameTypography = DocumentStudioSettings["typography"];

/** Pasted and stored line breaks stay spaces. Title boxes wrap softly. */
export function normalizeSingleLineText(text: string): string {
  return text.replace(/\r\n|[\r\n\u2028\u2029]/g, " ");
}

/** Leading in points for one title-box line, using the frame font's existing Auto or point rule. */
export function singleLineLeadingPt(typography: FrameTypography): number {
  return blockLeadingPt({ type: "paragraph" }, editorFontFamilyStack(typography.defaultRtlFontId), typography, "rtl");
}

/** Outer border-box height in CSS pixels: both borders, both paddings, and one line. */
export function singleLineOuterHeightPx(leadingPt: number, paddingPx = SINGLE_LINE_PADDING_PX): number {
  return SINGLE_LINE_BORDER_PX * 2 + paddingPx * 2 + leadingPt * PX_PER_PT;
}

/** Outer border-box height for `lineCount` wrapped lines. At least one line. */
export function singleLineWrappedOuterHeightPx(leadingPt: number, lineCount: number, paddingPx = SINGLE_LINE_PADDING_PX): number {
  const lines = Number.isFinite(lineCount) ? Math.max(1, Math.round(lineCount)) : 1;
  const chrome = SINGLE_LINE_BORDER_PX * 2 + paddingPx * 2;
  return chrome + lines * leadingPt * PX_PER_PT;
}

/** Outer border-box height in millimetres for the frame's current typography. */
export function singleLineOuterHeightMm(typography: FrameTypography): number {
  return singleLineOuterHeightPx(singleLineLeadingPt(typography)) / PX_PER_MM;
}

/** Outer height in millimetres for `lineCount` wrapped lines. */
export function singleLineWrappedOuterHeightMm(typography: FrameTypography, lineCount: number): number {
  return singleLineWrappedOuterHeightPx(singleLineLeadingPt(typography), lineCount) / PX_PER_MM;
}

/**
 * Snap a measured border box onto the line grid.
 * Empty or failed measurements stay one line. A little extra px does not add a line.
 */
export function singleLineOuterHeightPxFromMeasured(leadingPt: number, measuredBorderPx: number, paddingPx = SINGLE_LINE_PADDING_PX): number {
  const min = singleLineOuterHeightPx(leadingPt, paddingPx);
  if (!(measuredBorderPx > 0) || !(leadingPt > 0)) return min;
  const chrome = SINGLE_LINE_BORDER_PX * 2 + paddingPx * 2;
  const linePx = leadingPt * PX_PER_PT;
  if (!(linePx > 0)) return min;
  const content = measuredBorderPx - chrome;
  const lines = Math.max(1, Math.ceil((content - MEASURE_SLACK_PX) / linePx));
  return Math.max(min, chrome + lines * linePx);
}

export interface SingleLineMeasureInput {
  text: string;
  typography: FrameTypography;
  /** Border-box width in CSS pixels. Pass the editor width and the print width; the taller fit wins. */
  outerWidthPx: number | readonly number[];
  /** Horizontal and vertical padding. The default is the 2px text-frame padding. */
  paddingPx?: number;
}

let measureProbe: HTMLDivElement | null = null;

function singleLineMeasureProbe(): HTMLDivElement | null {
  if (typeof document === "undefined" || !document.body) return null;
  if (measureProbe?.isConnected) return measureProbe;
  const probe = document.createElement("div");
  probe.setAttribute("data-studio-single-line-measure", "true");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "absolute";
  probe.style.left = "0";
  probe.style.top = "-100000px";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.boxSizing = "border-box";
  probe.style.margin = "0";
  probe.style.border = `${SINGLE_LINE_BORDER_PX}px solid transparent`;
  probe.style.padding = `${SINGLE_LINE_PADDING_PX}px`;
  probe.style.whiteSpace = SINGLE_LINE_WHITE_SPACE;
  probe.style.overflowWrap = SINGLE_LINE_OVERFLOW_WRAP;
  probe.style.direction = "rtl";
  probe.style.unicodeBidi = "plaintext";
  probe.style.fontKerning = "auto";
  probe.style.fontVariantLigatures = "normal";
  probe.style.fontFeatureSettings = "normal";
  probe.style.textIndent = "0";
  probe.style.tabSize = "8";
  probe.style.minHeight = "0";
  probe.style.maxHeight = "none";
  probe.style.height = "auto";
  document.body.appendChild(probe);
  measureProbe = probe;
  return probe;
}

function measureSingleLineOuterHeightPxAt(input: SingleLineMeasureInput, outerWidthPx: number): number {
  const leading = singleLineLeadingPt(input.typography);
  const paddingPx = input.paddingPx ?? SINGLE_LINE_PADDING_PX;
  const min = singleLineOuterHeightPx(leading, paddingPx);
  const text = normalizeSingleLineText(input.text);
  if (!text || !(outerWidthPx > 0)) return min;
  const probe = singleLineMeasureProbe();
  if (!probe) return min;
  probe.style.width = `${outerWidthPx}px`;
  probe.style.padding = `${paddingPx}px`;
  probe.style.fontFamily = editorFontFamilyStack(input.typography.defaultRtlFontId);
  probe.style.fontSize = `${input.typography.bodyFontSizePt}pt`;
  probe.style.lineHeight = `${leading}pt`;
  probe.textContent = text;
  const measured = probe.getBoundingClientRect().height;
  return singleLineOuterHeightPxFromMeasured(leading, measured, paddingPx);
}

/** Fitted border-box height in CSS pixels. One line when the text is empty or layout is unavailable. */
export function measureSingleLineOuterHeightPx(input: SingleLineMeasureInput): number {
  const widths = (Array.isArray(input.outerWidthPx) ? input.outerWidthPx : [input.outerWidthPx]).filter((width) => width > 0);
  if (!widths.length) return singleLineOuterHeightPx(singleLineLeadingPt(input.typography));
  let best = 0;
  let previous = Number.NaN;
  for (const outerWidthPx of widths) {
    if (Math.abs(outerWidthPx - previous) < 0.05) continue;
    previous = outerWidthPx;
    best = Math.max(best, measureSingleLineOuterHeightPxAt(input, outerWidthPx));
  }
  return best;
}

/** Fitted border-box height in millimetres for text, typography, and width. */
export function measureSingleLineOuterHeightMm(input: SingleLineMeasureInput): number {
  return measureSingleLineOuterHeightPx(input) / PX_PER_MM;
}

/**
 * Move the fixed vertical padding so the measured ink is centered inside the border.
 * The two padding values stay a pair: what one side gains, the other gives up.
 */
export function centerSingleLinePadding(
  current: { top: number; bottom: number },
  spaceAboveInk: number,
  spaceBelowInk: number,
): { top: number; bottom: number } {
  const error = (spaceBelowInk - spaceAboveInk) / 2;
  let top = current.top + error;
  let bottom = current.bottom - error;
  if (top < 0) {
    bottom += top;
    top = 0;
  }
  if (bottom < 0) {
    top += bottom;
    bottom = 0;
  }
  return { top, bottom };
}
