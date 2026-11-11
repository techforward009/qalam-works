/** Selected frames keep their relative order and move as a block. */
function partition<T extends { id: string }>(frames: readonly T[], selectedIds: readonly string[]): { moving: T[]; rest: T[] } {
  const selected = new Set(selectedIds);
  const moving: T[] = [];
  const rest: T[] = [];
  for (const frame of frames) (selected.has(frame.id) ? moving : rest).push(frame);
  return { moving, rest };
}

/** Place the selected objects behind every unselected object. */
export function sendFramesToBack<T extends { id: string }>(frames: readonly T[], selectedIds: readonly string[]): T[] {
  const { moving, rest } = partition(frames, selectedIds);
  return [...moving, ...rest];
}

/** Place the selected objects in front of every unselected object. */
export function bringFramesToFront<T extends { id: string }>(frames: readonly T[], selectedIds: readonly string[]): T[] {
  const { moving, rest } = partition(frames, selectedIds);
  return [...rest, ...moving];
}
