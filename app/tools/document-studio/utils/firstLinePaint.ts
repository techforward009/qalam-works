/** Align the first LINE BOX, keeping its glyph ink below the top guide.
 * Small explicit leading intentionally permits ink to overlap later lines. */
export function firstLinePaintShift(lineTop: number, inkTop: number, bottom: number, frameTop: number, frameBottom: number, layoutTop = lineTop, guard = 1, _nextLineTop = Infinity): number {
  const desired = frameTop - layoutTop;
  const min = frameTop + guard - inkTop;
  const max = frameBottom - guard - bottom;
  return min > max ? 0 : Math.min(max,Math.max(min,desired));
}

/** Following tightly spaced lines can overhang the top too. Paint only; never
 * change their line boxes, selection pitch, or pagination membership. */
export function topEdgeInkShift(inkTop:number,inkBottom:number,frameTop:number,frameBottom:number,guard=1):number {
  return Math.max(0,Math.min(frameTop+guard-inkTop,frameBottom-guard-inkBottom));
}
