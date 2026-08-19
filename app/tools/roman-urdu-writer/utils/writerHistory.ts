/** Bounded per-mode undo/redo for Writer textareas (19A.4e) */
export const WRITER_HISTORY_LIMIT = 80;
export const WRITER_HISTORY_COALESCE_MS = 450;
export interface TextHistoryState {
  past: string[];
  present: string;
  future: string[];
  lastPushAt: number;
}
export function createTextHistory(initial = ""): TextHistoryState {
  return { past: [], present: initial, future: [], lastPushAt: 0 };
}
export function pushTextHistory(
  state: TextHistoryState,
  next: string,
  now = Date.now(),
  limit = WRITER_HISTORY_LIMIT,
  coalesceMs = WRITER_HISTORY_COALESCE_MS,
): TextHistoryState {
  if (next === state.present) return state;
  if (state.lastPushAt > 0 && now - state.lastPushAt < coalesceMs) {
    return { ...state, present: next, future: [], lastPushAt: now };
  }
  const past = [...state.past, state.present];
  while (past.length > limit) past.shift();
  return { past, present: next, future: [], lastPushAt: now };
}
export function undoTextHistory(state: TextHistoryState): TextHistoryState {
  if (!state.past.length) return state;
  const past = state.past.slice();
  const previous = past.pop()!;
  return { past, present: previous, future: [state.present, ...state.future], lastPushAt: 0 };
}
export function redoTextHistory(state: TextHistoryState): TextHistoryState {
  if (!state.future.length) return state;
  const [next, ...future] = state.future;
  return { past: [...state.past, state.present], present: next, future, lastPushAt: 0 };
}
export function canUndo(s: TextHistoryState) { return s.past.length > 0; }
export function canRedo(s: TextHistoryState) { return s.future.length > 0; }
export function resetTextHistory(value = "") { return createTextHistory(value); }
