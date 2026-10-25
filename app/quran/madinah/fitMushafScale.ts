/** One shrink step so a nowrap mushaf line fits its box. Returns the same scale when nothing overflows. */
export function shrinkMushafScale(
  current: number,
  lines: readonly { scrollWidth: number; clientWidth: number }[],
): number {
  if (!Number.isFinite(current) || current <= 0) return 1;
  let ratio = 1;
  for (const line of lines) {
    if (line.clientWidth > 0 && line.scrollWidth > line.clientWidth + 1) {
      ratio = Math.min(ratio, line.clientWidth / line.scrollWidth);
    }
  }
  if (ratio > 0.998) return current;
  const next = current * ratio;
  return next < 0.4 ? 0.4 : next;
}
