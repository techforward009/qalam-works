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
  return { id, kind: "picture-rect", page: 1, xMm: 10, yMm: 10, wMm: 30, hMm: 20, flip: false, text: "", ...patch };
}

describe("object frame history", () => {
  it("supports Delete / Cut -> Undo -> Redo preserving IDs, geometry, z-order, and picture fields", () => {
    const pic1 = frame("pic-1", { xMm: 10, imageSrc: "data:image/png;base64,aaa", imageXMm: 2, imageYMm: 3 });
    const pic2 = frame("pic-2", { xMm: 50, locked: true });
    const initial = [pic1, pic2];

    // Delete/Cut unlocked pic-1
    const afterDelete = [pic2];
    const h1 = recordObjectFrames(createObjectFrameHistory(), initial, afterDelete);
    expect(h1.past).toHaveLength(1);

    const undone = undoObjectFrames(h1, afterDelete);
    expect(undone?.frames).toEqual(initial);

    const redone = redoObjectFrames(undone!.state, undone!.frames);
    expect(redone?.frames).toEqual(afterDelete);
  });

  it("supports Paste -> Undo -> Redo", () => {
    const pic1 = frame("pic-1");
    const pasted = frame("pic-1-copy", { xMm: 15, yMm: 15 });
    const h1 = recordObjectFrames(createObjectFrameHistory(), [pic1], [pic1, pasted]);

    const undone = undoObjectFrames(h1, [pic1, pasted]);
    expect(undone?.frames).toEqual([pic1]);

    const redone = redoObjectFrames(undone!.state, undone!.frames);
    expect(redone?.frames).toEqual([pic1, pasted]);
  });

  it("records one entry for a move or resize gesture and ignores intermediate pointer-move writes", () => {
    const start = [frame("a", { xMm: 1, wMm: 20 })];
    let state = beginObjectGesture(createObjectFrameHistory(), start);
    const mid = [frame("a", { xMm: 4, wMm: 25 })];
    const end = [frame("a", { xMm: 8, wMm: 30 })];

    expect(recordObjectFrames(state, start, mid)).toBe(state);
    expect(recordObjectFrames(state, mid, end)).toBe(state);

    state = endObjectGesture(state, end);
    expect(state.past).toHaveLength(1);
    const undone = undoObjectFrames(state, end);
    expect(undone?.frames[0]).toMatchObject({ id: "a", xMm: 1, wMm: 20 });
    const redone = redoObjectFrames(undone!.state, undone!.frames);
    expect(redone?.frames[0]).toMatchObject({ id: "a", xMm: 8, wMm: 30 });
  });

  it("preserves live frame text across object undo/redo and caps history at limit", () => {
    const before = [frame("a", { kind: "text", xMm: 0, text: "old" })];
    const after = [frame("a", { kind: "text", xMm: 12, text: "old" })];
    const state = recordObjectFrames(createObjectFrameHistory(), before, after);
    const current = [frame("a", { kind: "text", xMm: 12, text: "live-typed" })];

    const undone = undoObjectFrames(state, current)!;
    expect(undone.frames[0]).toMatchObject({ id: "a", xMm: 0, text: "live-typed" });

    let frames = [frame("cap", { xMm: 0 })];
    let capped = createObjectFrameHistory();
    for (let i = 1; i <= OBJECT_FRAME_HISTORY_LIMIT + 3; i += 1) {
      const next = [frame("cap", { xMm: i })];
      capped = recordObjectFrames(capped, frames, next);
      frames = next;
    }
    expect(capped.past).toHaveLength(OBJECT_FRAME_HISTORY_LIMIT);
  });
});
