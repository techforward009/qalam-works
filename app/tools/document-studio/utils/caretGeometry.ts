export interface CaretGeometryInput {
  x: number; top: number; height: number; scale: number; rtl: boolean;
  blockLeft: number; blockRight: number; contentRight: number; contentTop: number; contentBottom?: number; contentLeft?: number;
}
/** Coordinates are unscaled page pixels; ink width and guide clearance are screen pixels. */
export function caretGeometry(input: CaretGeometryInput) {
  const scale = input.scale > 0 && Number.isFinite(input.scale) ? input.scale : 1;
  const width = 2 / scale, inset = 1 / scale;
  const min = input.rtl
    ? Math.max(input.blockLeft, input.contentLeft ?? input.blockLeft) + inset
    : Math.max(input.blockLeft + inset, (input.contentLeft ?? input.blockLeft) + 2 * inset);
  const max = Math.min(input.blockRight, input.contentRight) - width - inset;
  const x = input.rtl ? input.x - width - inset : input.x + inset;
  const bottom = input.contentBottom ?? Infinity;
  const topGuard = input.contentTop + inset;
  const top = Math.min(Math.max(input.top,topGuard),Math.max(topGuard,bottom-input.height));
  return {
    left: max > min ? Math.max(min, Math.min(max, x)) : x,
    // The guide and its clearance are screen pixels at every magnification.
    top,
    width, height: Math.max(0,Math.min(input.height,bottom-top)),
  };
}
