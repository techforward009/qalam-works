import type { StudioFrame } from "../components/StudioObjectLayer";

/** Oldest entries fall off after this many object undo steps. */
export const OBJECT_FRAME_HISTORY_LIMIT = 100;

/**
 * Text fields stay with the per-frame text history. Object undo restores
 * geometry, order, pictures and other object fields, then puts the live
 * text back on frames that still exist.
 */
const TEXT_FIELD = new Set(["text", "textAlign", "paragraphAligns"]);

export type ObjectFrameHistory = {
  past: StudioFrame[][];
  future: StudioFrame[][];
  /** Frames at pointer-down. Null when no move, resize or pan is open. */
  gesture: StudioFrame[] | null;
};

export function createObjectFrameHistory(): ObjectFrameHistory {
  return { past: [], future: [], gesture: null };
}

function copyFrames(frames: readonly StudioFrame[]): StudioFrame[] {
  return frames.map((frame) => ({
    ...frame,
    ...(frame.paragraphAligns ? { paragraphAligns: [...frame.paragraphAligns] } : {}),
  }));
}

function objectEntries(frame: StudioFrame): [string, unknown][] {
  return Object.entries(frame)
    .filter(([key]) => !TEXT_FIELD.has(key))
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function sameObjectFrames(a: readonly StudioFrame[], b: readonly StudioFrame[]): boolean {
  return JSON.stringify(a.map(objectEntries)) === JSON.stringify(b.map(objectEntries));
}

/** Snapshot order and object fields, with current text kept on frames that still exist. */
export function restoreObjectFrames(snapshot: readonly StudioFrame[], current: readonly StudioFrame[]): StudioFrame[] {
  const live = new Map(current.map((frame) => [frame.id, frame]));
  return snapshot.map((frame) => {
    const next = copyFrames([frame])[0];
    const now = live.get(frame.id);
    if (!now) return next;
    next.text = now.text;
    if (now.textAlign === undefined) delete next.textAlign;
    else next.textAlign = now.textAlign;
    if (now.paragraphAligns === undefined) delete next.paragraphAligns;
    else next.paragraphAligns = [...now.paragraphAligns];
    return next;
  });
}

function pushPast(state: ObjectFrameHistory, snapshot: StudioFrame[]): ObjectFrameHistory {
  const past = [...state.past, snapshot];
  if (past.length > OBJECT_FRAME_HISTORY_LIMIT) past.splice(0, past.length - OBJECT_FRAME_HISTORY_LIMIT);
  return { past, future: [], gesture: null };
}

/**
 * Record one non-gesture object change. Text-only and other no-op writes
 * return the same state. Writes during an open gesture are not entries.
 */
export function recordObjectFrames(
  state: ObjectFrameHistory,
  before: readonly StudioFrame[],
  after: readonly StudioFrame[],
): ObjectFrameHistory {
  if (state.gesture || sameObjectFrames(before, after)) return state;
  return pushPast(state, copyFrames(before));
}

export function beginObjectGesture(state: ObjectFrameHistory, frames: readonly StudioFrame[]): ObjectFrameHistory {
  if (state.gesture) return state;
  return { ...state, gesture: copyFrames(frames) };
}

/** Push the pre-gesture snapshot once, and only when object fields changed. */
export function endObjectGesture(state: ObjectFrameHistory, frames: readonly StudioFrame[]): ObjectFrameHistory {
  if (!state.gesture) return state;
  const before = state.gesture;
  if (sameObjectFrames(before, frames)) return { ...state, gesture: null };
  return pushPast(state, before);
}

export function undoObjectFrames(
  state: ObjectFrameHistory,
  current: readonly StudioFrame[],
): { state: ObjectFrameHistory; frames: StudioFrame[] } | null {
  if (!state.past.length) return null;
  const snapshot = state.past[state.past.length - 1];
  return {
    state: { past: state.past.slice(0, -1), future: [copyFrames(current), ...state.future], gesture: null },
    frames: restoreObjectFrames(snapshot, current),
  };
}

export function redoObjectFrames(
  state: ObjectFrameHistory,
  current: readonly StudioFrame[],
): { state: ObjectFrameHistory; frames: StudioFrame[] } | null {
  if (!state.future.length) return null;
  const snapshot = state.future[0];
  const past = [...state.past, copyFrames(current)];
  if (past.length > OBJECT_FRAME_HISTORY_LIMIT) past.splice(0, past.length - OBJECT_FRAME_HISTORY_LIMIT);
  return {
    state: { past, future: state.future.slice(1), gesture: null },
    frames: restoreObjectFrames(snapshot, current),
  };
}
