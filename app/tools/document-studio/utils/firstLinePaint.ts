/** Paint only a frame's first visual line. Layout/fit coordinates stay unchanged. */
export function firstLinePaintShift(lineTop: number, inkTop: number, bottom: number, frameTop: number, frameBottom: number, layoutTop = lineTop, guard = 1, nextLineTop = Infinity): number {
  const desired = inkTop < Math.max(lineTop, layoutTop)
    ? frameTop + guard - Math.min(inkTop, layoutTop) : frameTop - lineTop;
  const min = frameTop + guard - inkTop;
  const max = Math.min(frameBottom, nextLineTop) - guard - bottom;
  return min > max ? 0 : Math.min(max, Math.max(min, desired));
}
