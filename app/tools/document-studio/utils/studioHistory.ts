import type { StudioFrame } from "../components/StudioObjectLayer";
import {
  beginObjectGesture,
  clearObjectFuture,
  createObjectFrameHistory,
  endObjectGesture,
  nextSelectionAfterObjectHistory,
  recordObjectFrames,
  redoObjectFrames,
  undoObjectFrames,
  type ObjectFrameHistory,
} from "./objectFrameHistory";
import {
  createFrameHistory,
  type FrameAlignSnapshot,
  type FrameHistory,
  type FrameRememberOptions,
} from "./paragraphAlign";

export type HistoryTimelineEntry =
  | { surface: "story" }
  | { surface: "objects" }
  | { surface: "frame"; frameId: string };

export type StudioHistoryAdapters = {
  getStoryUndoDepth: () => number;
  getStoryRedoDepth: () => number;
  undoStory: () => boolean;
  redoStory: () => boolean;
  closeStoryHistoryGroup: () => void;
  getFrames: () => readonly StudioFrame[];
  getSelectedIds: () => readonly string[];
  restoreFrames: (frames: StudioFrame[], selectedIds: string[] | null) => void;
  getFrameSnapshot: (frameId: string) => FrameAlignSnapshot | null;
  applyFrameSnapshot: (frameId: string, snapshot: FrameAlignSnapshot) => void;
};

/**
 * Coordinates chronological Undo/Redo across three editing surfaces:
 * 1. Main TipTap story text ("story")
 * 2. Text-frame text/alignment ("frame")
 * 3. Object-frame geometry/order/pictures ("objects")
 */
export function createStudioHistoryCoordinator() {
  let objectHistory: ObjectFrameHistory = createObjectFrameHistory();
  const frameHistories = new Map<string, FrameHistory>();
  let past: HistoryTimelineEntry[] = [];
  let future: HistoryTimelineEntry[] = [];
  let lastStoryUndoDepth = 0;
  let storyRedoInvalidated = false;

  const getFrameHistory = (frameId: string): FrameHistory => {
    let fh = frameHistories.get(frameId);
    if (!fh) {
      fh = createFrameHistory();
      frameHistories.set(frameId, fh);
    }
    return fh;
  };

  const closeAllFrameGroups = (exceptFrameId?: string) => {
    for (const [id, fh] of frameHistories) {
      if (id !== exceptFrameId) fh.closeGroup();
    }
  };

  const clearOtherFutures = (keep?: "story" | "objects" | string) => {
    future.length = 0;
    if (keep !== "objects") objectHistory = clearObjectFuture(objectHistory);
    for (const [id, fh] of frameHistories) {
      if (id !== keep) fh.clearFuture();
    }
    if (keep !== "story") storyRedoInvalidated = true;
  };

  const trimSurfacePast = (predicate: (entry: HistoryTimelineEntry) => boolean, maxCount: number) => {
    let count = 0;
    for (const entry of past) {
      if (predicate(entry)) count += 1;
    }
    if (count <= maxCount) return;
    let toRemove = count - maxCount;
    past = past.filter((entry) => {
      if (toRemove > 0 && predicate(entry)) {
        toRemove -= 1;
        return false;
      }
      return true;
    });
  };

  const recordObjectSnapshot = (
    next: ObjectFrameHistory,
    closeStoryHistoryGroup: () => void,
  ): boolean => {
    const recorded = next.revision !== objectHistory.revision;
    objectHistory = next;
    if (!recorded) return false;
    closeAllFrameGroups();
    closeStoryHistoryGroup();
    clearOtherFutures("objects");
    past.push({ surface: "objects" });
    trimSurfacePast((e) => e.surface === "objects", objectHistory.past.length);
    return true;
  };

  return {
    getFrameHistory,

    recordStoryEdit(storyUndoDepth: number): boolean {
      closeAllFrameGroups();
      clearOtherFutures("story");
      storyRedoInvalidated = false;
      const pushed = storyUndoDepth > lastStoryUndoDepth || (storyUndoDepth > 0 && past.at(-1)?.surface !== "story");
      if (pushed && storyUndoDepth > 0) {
        past.push({ surface: "story" });
      }
      trimSurfacePast((e) => e.surface === "story", storyUndoDepth);
      lastStoryUndoDepth = storyUndoDepth;
      return pushed;
    },

    recordFrameEdit(
      frameId: string,
      before: FrameAlignSnapshot,
      options: FrameRememberOptions | undefined,
      closeStoryHistoryGroup: () => void,
    ): boolean {
      const fh = getFrameHistory(frameId);
      const pushed = fh.remember(before, options);
      if (!pushed) return false;
      closeAllFrameGroups(frameId);
      closeStoryHistoryGroup();
      clearOtherFutures(frameId);
      past.push({ surface: "frame", frameId });
      trimSurfacePast((e) => e.surface === "frame" && e.frameId === frameId, fh.pastLength());
      return true;
    },

    recordObjectChange(
      before: readonly StudioFrame[],
      after: readonly StudioFrame[],
      closeStoryHistoryGroup: () => void,
    ): boolean {
      const next = recordObjectFrames(objectHistory, before, after);
      return recordObjectSnapshot(next, closeStoryHistoryGroup);
    },

    beginObjectGesture(frames: readonly StudioFrame[], closeStoryHistoryGroup: () => void): boolean {
      let recorded = false;
      if (objectHistory.gesture) {
        recorded = recordObjectSnapshot(endObjectGesture(objectHistory, frames), closeStoryHistoryGroup);
      }
      objectHistory = beginObjectGesture(objectHistory, frames);
      return recorded;
    },

    endObjectGesture(frames: readonly StudioFrame[], closeStoryHistoryGroup: () => void): boolean {
      return recordObjectSnapshot(endObjectGesture(objectHistory, frames), closeStoryHistoryGroup);
    },

    canUndo(storyUndoDepth: number): boolean {
      return past.length > 0 || objectHistory.past.length > 0 || storyUndoDepth > 0;
    },

    canRedo(storyRedoDepth: number): boolean {
      return future.length > 0 || (!storyRedoInvalidated && storyRedoDepth > 0);
    },

    undo(adapters: StudioHistoryAdapters): boolean {
      closeAllFrameGroups();
      while (past.length > 0) {
        const entry = past.pop()!;
        if (entry.surface === "objects") {
          const current = adapters.getFrames();
          const res = undoObjectFrames(objectHistory, current);
          if (!res) continue;
          objectHistory = res.state;
          const nextSel = nextSelectionAfterObjectHistory(current, res.frames, adapters.getSelectedIds());
          future.push(entry);
          adapters.restoreFrames(res.frames, nextSel);
          return true;
        }
        if (entry.surface === "frame") {
          const fh = frameHistories.get(entry.frameId);
          const currentSnap = adapters.getFrameSnapshot(entry.frameId);
          if (!fh || !currentSnap) continue;
          const prevSnap = fh.undo(currentSnap);
          if (!prevSnap) continue;
          future.push(entry);
          adapters.applyFrameSnapshot(entry.frameId, prevSnap);
          return true;
        }
        if (entry.surface === "story") {
          if (adapters.getStoryUndoDepth() <= 0) continue;
          const ok = adapters.undoStory();
          if (!ok) continue;
          lastStoryUndoDepth = adapters.getStoryUndoDepth();
          storyRedoInvalidated = false;
          future.push(entry);
          return true;
        }
      }
      if (adapters.getStoryUndoDepth() > 0 && adapters.undoStory()) {
        lastStoryUndoDepth = adapters.getStoryUndoDepth();
        storyRedoInvalidated = false;
        future.push({ surface: "story" });
        return true;
      }
      return false;
    },

    redo(adapters: StudioHistoryAdapters): boolean {
      closeAllFrameGroups();
      while (future.length > 0) {
        const entry = future.pop()!;
        if (entry.surface === "objects") {
          const current = adapters.getFrames();
          const res = redoObjectFrames(objectHistory, current);
          if (!res) continue;
          objectHistory = res.state;
          const nextSel = nextSelectionAfterObjectHistory(current, res.frames, adapters.getSelectedIds());
          past.push(entry);
          adapters.restoreFrames(res.frames, nextSel);
          return true;
        }
        if (entry.surface === "frame") {
          const fh = frameHistories.get(entry.frameId);
          const currentSnap = adapters.getFrameSnapshot(entry.frameId);
          if (!fh || !currentSnap) continue;
          const nextSnap = fh.redo(currentSnap);
          if (!nextSnap) continue;
          past.push(entry);
          adapters.applyFrameSnapshot(entry.frameId, nextSnap);
          return true;
        }
        if (entry.surface === "story") {
          if (storyRedoInvalidated || adapters.getStoryRedoDepth() <= 0) continue;
          const ok = adapters.redoStory();
          if (!ok) continue;
          lastStoryUndoDepth = adapters.getStoryUndoDepth();
          past.push(entry);
          return true;
        }
      }
      if (!storyRedoInvalidated && adapters.getStoryRedoDepth() > 0 && adapters.redoStory()) {
        lastStoryUndoDepth = adapters.getStoryUndoDepth();
        past.push({ surface: "story" });
        return true;
      }
      return false;
    },

    reset(storyUndoDepth = 0): void {
      objectHistory = createObjectFrameHistory();
      frameHistories.clear();
      past = [];
      future = [];
      lastStoryUndoDepth = storyUndoDepth;
      storyRedoInvalidated = false;
    },

    getObjectHistory(): ObjectFrameHistory {
      return objectHistory;
    },

    getPastTimeline(): readonly HistoryTimelineEntry[] {
      return past;
    },

    getFutureTimeline(): readonly HistoryTimelineEntry[] {
      return future;
    },
  };
}

export type StudioHistoryShortcutAction = "undo" | "redo";

export function resolveStudioHistoryShortcut(
  event: Pick<KeyboardEvent, "defaultPrevented" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "key" | "target"> & { code?: string },
): StudioHistoryShortcutAction | null {
  if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.altKey) return null;
  const isZKey = event.code === "KeyZ" || event.key.toLowerCase() === "z";
  const action: StudioHistoryShortcutAction | null = isZKey ? (event.shiftKey ? "redo" : "undo") : null;
  if (!action) return null;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("[role='dialog'], [role='alertdialog']")) return null;
  if (
    target?.closest("input, textarea, select, [contenteditable='true']")
    && !target.closest(".ProseMirror, [data-studio-text-frame]")
  ) {
    return null;
  }
  return action;
}
