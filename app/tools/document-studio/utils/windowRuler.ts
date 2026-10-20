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
export const INPAGE_RULER_BAR_PX = 16;
export const INPAGE_VRULER_PX = 16;
/** White between the horizontal ruler and the page top. Measured at 4px on the InPage screenshot. */
export const PASTEBOARD_TOP_PX = 4;
/** Dashed guides sit 119px outside the page at 100% (measured on the 1920px screenshot). */
export const PASTEBOARD_GUIDE_PX = 119;

const TICK_MAJOR_MM = 10;
const TICK_MINOR_MM = 5;
const LABEL_EVERY_MM = 20;

/**
 * Ticks across a ruler longer than the page.
 * `originPx` is where 0 lies. `positiveDirection` -1 means millimetres increase
 * toward the left (InPage RTL: 0 on the page's right edge).
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
  const startMm = Math.floor(Math.min(mmAt(0), mmAt(lengthPx)) - 1);
  const endMm = Math.ceil(Math.max(mmAt(0), mmAt(lengthPx)) + 1);
  const ticks: WindowRulerTick[] = [];
  const micro = pxPerMm >= 2.2;
  for (let mm = startMm; mm <= endMm; mm++) {
    const offsetPx = originPx + (mm / positiveDirection) * pxPerMm;
    if (offsetPx < -0.5 || offsetPx > lengthPx + 0.5) continue;
    const major = mm % TICK_MAJOR_MM === 0;
    const minor = mm % TICK_MINOR_MM === 0;
    if (!major && !minor && !micro) continue;
    const labelled = mm % LABEL_EVERY_MM === 0;
    ticks.push({
      offsetPx,
      mm,
      kind: major ? "major" : minor ? "minor" : "micro",
      label: labelled ? String(mm) : undefined,
    });
  }
  return ticks;
}
