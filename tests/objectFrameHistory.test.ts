import { describe, expect, it } from "vitest";
import type { StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import {
  OBJECT_FRAME_HISTORY_LIMIT,
  beginObjectGesture,
  createObjectFrameHistory,
  endObjectGesture,
  recordObjectFrames,
  redoObjectFrames,
  undoObjectFrames,
} from "../app/tools/document-studio/utils/objectFrameHistory";

function frame(id: string, patch: Partial<StudioFrame> = {}): StudioFrame {
  return { id, kind: "rect", page: 1, xMm: 0, yMm: 0, wMm: 10, hMm: 10, flip: false, text: "", ...patch };
}

describe("object frame history", () => {
  it("records one entry for a gesture and ignores pointer-move writes", () => {
    const start = [frame("a", { xMm: 1, text: "old" }), frame("b", { xMm: 2, text: "b" })];
    let state = beginObjectGesture(createObjectFrameHistory(), start);
    const mid = [frame("a", { xMm: 4, text: "old" }), frame("b", { xMm: 5, text: "b" })];
    const moved = [frame("a", { xMm: 8, text: "typed" }), frame("b", { xMm: 9, text: "b" })];
    expect(recordObjectFrames(state, start, mid)).toBe(state);
    expect(recordObjectFrames(state, mid, moved)).toBe(state);
    state = endObjectGesture(state, moved);
    expect(state.past).toHaveLength(1);
    expect(state.past[0].map((item) => item.xMm)).toEqual([1, 2]);
    expect(state.future).toEqual([]);
    expect(state.gesture).toBeNull();

    state = beginObjectGesture(state, moved);
    state = endObjectGesture(state, [frame("a", { xMm: 8, text: "more" }), frame("b", { xMm: 9, text: "b" })]);
    expect(state.past).toHaveLength(1);
  });

  it("does not record text-only edits and keeps a no-op gesture off the stack", () => {
    const before = [frame("a", { xMm: 1, text: "a", textAlign: "left" })];
    const after = [frame("a", { xMm: 1, text: "b", textAlign: "right", paragraphAligns: ["center"] })];
    const state = createObjectFrameHistory();
    expect(recordObjectFrames(state, before, after)).toBe(state);
    const open = beginObjectGesture(state, before);
    const closed = endObjectGesture(open, after);
    expect(closed.past).toEqual([]);
    expect(closed.gesture).toBeNull();
  });

  it("restores object fields and keeps current text on frames that still exist", () => {
    const before = [
      frame("a", { xMm: 0, text: "old", textAlign: "left", paragraphAligns: ["left"] }),
      frame("b", { kind: "text", xMm: 3, text: "gone", textAlign: "center" }),
    ];
    const after = [frame("a", { xMm: 6, text: "old", textAlign: "left", paragraphAligns: ["left"] })];
    const state = recordObjectFrames(createObjectFrameHistory(), before, after);
    const current = [frame("a", { xMm: 6, text: "new", textAlign: "right", paragraphAligns: ["justify"] })];
    const undone = undoObjectFrames(state, current);
    expect(undone?.frames).toEqual([
      frame("a", { xMm: 0, text: "new", textAlign: "right", paragraphAligns: ["justify"] }),
      frame("b", { kind: "text", xMm: 3, text: "gone", textAlign: "center" }),
    ]);
    const typed = [frame("a", { xMm: 0, text: "newer", textAlign: "center" }), frame("b", { kind: "text", xMm: 3, text: "back" })];
    const redone = redoObjectFrames(undone!.state, typed);
    expect(redone?.frames.map((item) => ({ id: item.id, xMm: item.xMm, text: item.text, textAlign: item.textAlign }))).toEqual([
      { id: "a", xMm: 6, text: "newer", textAlign: "center" },
    ]);
  });

  it("clears the redo stack on a new object action and caps history", () => {
    const first = [frame("a", { xMm: 0 })];
    const second = [frame("a", { xMm: 1 })];
    const third = [frame("a", { xMm: 2 })];
    let state = recordObjectFrames(createObjectFrameHistory(), first, second);
    state = recordObjectFrames(state, second, third);
    const undone = undoObjectFrames(state, third)!;
    expect(undone.state.future).toHaveLength(1);
    const branched = recordObjectFrames(undone.state, undone.frames, [frame("a", { xMm: 4 })]);
    expect(branched.future).toEqual([]);
    expect(branched.past.map((entry) => entry[0].xMm)).toEqual([0, 1]);

    let frames = [frame("a", { xMm: 0 })];
    let capped = createObjectFrameHistory();
    for (let i = 1; i <= OBJECT_FRAME_HISTORY_LIMIT + 5; i += 1) {
      const next = [frame("a", { xMm: i })];
      capped = recordObjectFrames(capped, frames, next);
      frames = next;
    }
    expect(capped.past).toHaveLength(OBJECT_FRAME_HISTORY_LIMIT);
    expect(capped.past[0][0].xMm).toBe(5);
    expect(capped.past.at(-1)?.[0].xMm).toBe(OBJECT_FRAME_HISTORY_LIMIT + 4);
  });
});
