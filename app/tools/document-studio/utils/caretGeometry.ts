export interface CaretGeometryInput {
  x: number; top: number; height: number; scale: number; rtl: boolean;
  blockLeft: number; blockRight: number; contentRight: number; contentTop: number; contentBottom?: number; contentLeft?: number;
}
/** Coordinates are unscaled page pixels; ink width and guide clearance are screen pixels. */
export function caretGeometry(input: CaretGeometryInput) {
  const scale = input.scale > 0 && Number.isFinite(input.scale) ? input.scale : 1;
  const width = 2 / scale, inset = 1 / scale;
  const min = Math.max(input.blockLeft, input.contentLeft ?? input.blockLeft) + inset;
  const max = Math.max(min, Math.min(input.blockRight, input.contentRight) - width - inset);
  const bottom = input.contentBottom ?? Infinity;
  const topGuard = input.contentTop + Math.max(inset,1);
  const top = Math.min(Math.max(input.top,topGuard),Math.max(topGuard,bottom-input.height));
  return {
    left: Math.max(min, Math.min(max, input.rtl ? input.x - width - inset : input.x + inset)),
    // The top guide itself is one page pixel thick, even when zoomed.
    top,
    width, height: Math.max(0,Math.min(input.height,bottom-top)),
  };
}
