/** Full-window InPage ruler. 0 sits on a page edge; numbers continue onto the pasteboard. */

export type WindowTickKind = "major" | "minor" | "micro";

export interface WindowRulerTick {
  offsetPx: number;
  kind: WindowTickKind;
  /** Millimetre value at this tick. Present only when a label is drawn. */
  label?: string;
  mm: number;
}

export const INPAGE_TOOLBOX_PX = 32;
export const INPAGE_RULER_BAR_PX = 18;
export const INPAGE_VRULER_PX = 16;
/** Classic scrollbar reserved so Fit width keeps the page edge on screen. */
export const INPAGE_VSCROLL_PX = 17;
export const INPAGE_HSCROLL_PX = 18;
/** Two pixels of pasteboard below the 18px horizontal ruler keep the page at y=108. */
export const PASTEBOARD_TOP_PX = 2;
/** Dashed guides sit 119px outside the page at 100% (measured on the 1920px screenshot). */
export const PASTEBOARD_GUIDE_PX = 119;

/**
 * Ticks across a ruler longer than the page.
 * Every 2mm is 2px, every 10mm is 4px, every 20mm is 9px and labelled.
 * `positiveDirection` -1 means millimetres increase toward the left.
 */
export function calculateWindowRulerTicks(args: {
  lengthPx: number;
  originPx: number;
  pxPerMm: number;
  positiveDirection: 1 | -1;
}): WindowRulerTick[] {
  const { lengthPx, originPx, pxPerMm, positiveDirection } = args;
  if (!(lengthPx > 0) || !(pxPerMm > 0.25)) return [];
  const mmAt = (x: number) => ((x - originPx) / pxPerMm) * positiveDirection;
  const lo = Math.min(mmAt(0), mmAt(lengthPx)) - 1;
  const hi = Math.max(mmAt(0), mmAt(lengthPx)) + 1;
  const ticks: WindowRulerTick[] = [];
  const start = Math.floor(lo / 2) * 2;
  const end = Math.ceil(hi / 2) * 2;
  for (let mm = start; mm <= end; mm += 2) {
    const offsetPx = originPx + (mm / positiveDirection) * pxPerMm;
    if (offsetPx < -0.5 || offsetPx > lengthPx + 0.5) continue;
    const labelled = mm % 20 === 0;
    const ten = mm % 10 === 0;
    ticks.push({
      offsetPx,
      mm,
      kind: labelled ? "major" : ten ? "minor" : "micro",
      label: labelled ? String(mm) : undefined,
    });
  }
  return ticks;
}
