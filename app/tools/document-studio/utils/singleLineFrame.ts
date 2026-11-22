import { blockLeadingPt } from "./autoLeading";
import type { DocumentStudioSettings } from "./documentSettings";
import { editorFontFamilyStack } from "./fontRegistry";

/** Screen chrome already used by text frames: 1px border and 2px padding on each edge. */
export const SINGLE_LINE_BORDER_PX = 1;
export const SINGLE_LINE_PADDING_PX = 2;

const PX_PER_PT = 96 / 72;
const PX_PER_MM = 96 / 25.4;

export type FrameTypography = DocumentStudioSettings["typography"];

/** Leading in points for one title-box line, using the frame font's existing Auto or point rule. */
export function singleLineLeadingPt(typography: FrameTypography): number {
  return blockLeadingPt({ type: "paragraph" }, editorFontFamilyStack(typography.defaultRtlFontId), typography, "rtl");
}

/** Outer border-box height in CSS pixels: both borders, both paddings, and one line. */
export function singleLineOuterHeightPx(leadingPt: number): number {
  return SINGLE_LINE_BORDER_PX * 2 + SINGLE_LINE_PADDING_PX * 2 + leadingPt * PX_PER_PT;
}

/** Outer border-box height in millimetres for the frame's current typography. */
export function singleLineOuterHeightMm(typography: FrameTypography): number {
  return singleLineOuterHeightPx(singleLineLeadingPt(typography)) / PX_PER_MM;
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

/**
 * Outer border-box width in CSS pixels needed so neither the editable input nor
 * the visible text layer overflows horizontally. Uses each element's measured
 * horizontal chrome (offsetWidth - clientWidth) to avoid double-counting padding.
 */
export function singleLineOuterWidthPx(
  input: { offsetWidth: number; clientWidth: number; scrollWidth: number },
  textNode: { offsetWidth: number; clientWidth: number; scrollWidth: number },
): number {
  const inputChrome = Math.max(0, input.offsetWidth - input.clientWidth);
  const nodeChrome = Math.max(0, textNode.offsetWidth - textNode.clientWidth);
  return Math.ceil(Math.max(input.scrollWidth + inputChrome, textNode.scrollWidth + nodeChrome));
}
