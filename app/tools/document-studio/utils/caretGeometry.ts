export interface CaretGeometryInput {
  x: number; top: number; height: number; scale: number; rtl: boolean;
  blockLeft: number; blockRight: number; contentRight: number; contentTop: number;
}
/** Coordinates are unscaled page pixels; ink width and guide clearance are screen pixels. */
export function caretGeometry(input: CaretGeometryInput) {
  const scale = input.scale > 0 && Number.isFinite(input.scale) ? input.scale : 1;
  const width = 2 / scale, inset = 1 / scale;
  const min = input.blockLeft + inset;
  const max = Math.max(min, Math.min(input.blockRight, input.contentRight) - width - inset);
  return {
    left: Math.max(min, Math.min(max, input.rtl ? input.x - width - inset : input.x + inset)),
    // The top guide itself is one page pixel thick, even when zoomed.
    top: Math.max(input.top, input.contentTop + Math.max(inset, 1)),
    width, height: input.height,
  };
}
