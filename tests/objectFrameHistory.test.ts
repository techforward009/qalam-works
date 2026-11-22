import { describe, expect, it } from "vitest";
import { nudgeSelectedFrames, resolveMovedFramePlacement, resolveResizedFrameBounds, type StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import { facingSlot, type PageProjection } from "../app/tools/document-studio/utils/facingPages";
import { runAroundExclusionMm } from "../app/tools/document-studio/utils/runAroundFlow";
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
  it("nudges selected picture, shape, and text frames by physical arrow-key points", () => {
    const picture = frame("picture", { kind: "picture-rect", imageXMm: 2, imageYMm: 3, imageWMm: 20, imageHMm: 10 });
    const ellipse = frame("ellipse", { kind: "ellipse", xMm: 40 });
    const text = frame("text", { kind: "text", xMm: 70 });
    const options = { pageCount: 2, pageHeightPx: 1122.52, gapPx: 12 };
    const pointMm = 25.4 / 72;

    const left = nudgeSelectedFrames([picture], ["picture"], "ArrowLeft", false, options)[0];
    expect(left.xMm).toBeCloseTo(picture.xMm - pointMm, 8);
    expect(left).toMatchObject({ imageXMm: 2, imageYMm: 3, imageWMm: 20, imageHMm: 10 });
    expect(nudgeSelectedFrames([ellipse], ["ellipse"], "ArrowDown", false, options)[0].yMm).toBeCloseTo(ellipse.yMm + pointMm, 8);
    expect(nudgeSelectedFrames([text], ["text"], "ArrowUp", false, options)[0].yMm).toBeCloseTo(text.yMm - pointMm, 8);
    expect(nudgeSelectedFrames([picture], ["picture"], "ArrowRight", true, options)[0].xMm).toBeCloseTo(picture.xMm + pointMm * 10, 8);
  });

  it("nudges unlocked multi-selection together, leaves locked or unselected frames untouched, and records undo/redo", () => {
    const first = frame("first", { xMm: 20, yMm: 30 });
    const second = frame("second", { kind: "round-rect", xMm: 70, yMm: 45 });
    const locked = frame("locked", { xMm: 90, yMm: 50, locked: true });
    const start = [first, second, locked];
    const options = { pageCount: 2, pageHeightPx: 1122.52, gapPx: 12 };
    const moved = nudgeSelectedFrames(start, ["first", "second", "locked"], "ArrowRight", false, options);

    expect(moved[1].xMm - moved[0].xMm).toBeCloseTo(second.xMm - first.xMm, 8);
    expect(moved[1].yMm - moved[0].yMm).toBeCloseTo(second.yMm - first.yMm, 8);
    expect(moved[2]).toEqual(locked);
    expect(nudgeSelectedFrames(start, [], "ArrowRight", false, options)).toEqual(start);

    const history = recordObjectFrames(createObjectFrameHistory(), start, moved);
    const undone = undoObjectFrames(history, moved)!;
    expect(undone.frames).toEqual(start);
    expect(redoObjectFrames(undone.state, undone.frames)!.frames).toEqual(moved);
  });

  it("keeps arrow-key movement in page-local coordinates in Facing Pages mode", () => {
    const projection: PageProjection = { width: 794, height: 1123, gap: 12, count: 2 };
    const start = frame("facing", { page: 2, xMm: 40, yMm: 50 });
    const moved = nudgeSelectedFrames([start], ["facing"], "ArrowRight", false, {
      pageCount: 2,
      pageHeightPx: projection.height,
      gapPx: projection.gap,
      projection,
    })[0];
    expect(moved.page).toBe(2);
    expect(moved.xMm).toBeCloseTo(start.xMm + 25.4 / 72, 8);
    expect(moved.yMm).toBeCloseTo(start.yMm, 8);
  });

  it("preserves Run Around inputs while a picture box is nudged", () => {
    const picture = frame("wrap", {
      runAround: true,
      runAroundLeftMm: 1,
      runAroundRightMm: 2,
      runAroundTopMm: 3,
      runAroundBottomMm: 4,
    });
    const before = runAroundExclusionMm(picture)!;
    const moved = nudgeSelectedFrames([picture], ["wrap"], "ArrowRight", false, { pageCount: 2, pageHeightPx: 1122.52, gapPx: 12 })[0];
    const after = runAroundExclusionMm(moved)!;
    expect(moved).toMatchObject({ runAround: true, runAroundLeftMm: 1, runAroundRightMm: 2, runAroundTopMm: 3, runAroundBottomMm: 4 });
    expect(after.left - before.left).toBeCloseTo(25.4 / 72, 8);
    expect(after.right - before.right).toBeCloseTo(25.4 / 72, 8);
  });

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

  it("records and restores Run Around flags, four-sided clearances, and move/resize geometry", () => {
    const base = frame("pic-1", { xMm: 20, yMm: 30, wMm: 45, hMm: 35, runAround: false });
    const enabled = frame("pic-1", {
      xMm: 20,
      yMm: 30,
      wMm: 45,
      hMm: 35,
      runAround: true,
      runAroundLeftMm: 4,
      runAroundRightMm: 6,
      runAroundTopMm: 2,
      runAroundBottomMm: 5,
    });
    const moved = frame("pic-1", {
      ...enabled,
      xMm: 52,
      yMm: 64,
      wMm: 60,
      hMm: 42,
    });

    let history = recordObjectFrames(createObjectFrameHistory(), [base], [enabled]);
    history = recordObjectFrames(history, [enabled], [moved]);

    const afterFirstUndo = undoObjectFrames(history, [moved])!;
    expect(afterFirstUndo.frames[0]).toMatchObject({
      xMm: 20,
      yMm: 30,
      wMm: 45,
      hMm: 35,
      runAround: true,
      runAroundLeftMm: 4,
      runAroundRightMm: 6,
      runAroundTopMm: 2,
      runAroundBottomMm: 5,
    });

    const afterSecondUndo = undoObjectFrames(afterFirstUndo.state, afterFirstUndo.frames)!;
    expect(afterSecondUndo.frames[0]).toMatchObject({
      xMm: 20,
      yMm: 30,
      runAround: false,
    });

    const afterRedo = redoObjectFrames(afterSecondUndo.state, afterSecondUndo.frames)!;
    expect(afterRedo.frames[0]).toMatchObject({
      runAround: true,
      runAroundLeftMm: 4,
      runAroundRightMm: 6,
    });
  });

  it("updates page and page-local yMm across page boundaries without coordinate drift", () => {
    const pageHeightPx = 1122.52;
    const gapPx = 12;
    const stride = pageHeightPx + gapPx;
    const start = frame("cross", { page: 1, xMm: 42, yMm: 35, wMm: 30, hMm: 20, runAround: true });

    const movedToPage2 = resolveMovedFramePlacement(start, 0, stride, {
      pageCount: 2,
      pageHeightPx,
      gapPx,
    });
    expect(movedToPage2.page).toBe(2);
    expect(movedToPage2.xMm).toBeCloseTo(42, 6);
    expect(movedToPage2.yMm).toBeCloseTo(35, 6);

    const movedBackToPage1 = resolveMovedFramePlacement(
      { ...start, ...movedToPage2 },
      0,
      -stride,
      { pageCount: 2, pageHeightPx, gapPx },
    );
    expect(movedBackToPage1.page).toBe(1);
    expect(movedBackToPage1.xMm).toBeCloseTo(42, 6);
    expect(movedBackToPage1.yMm).toBeCloseTo(35, 6);
  });

  it("updates page and local coordinates in Facing Pages mode without drift", () => {
    const projection: PageProjection = { width: 794, height: 1123, gap: 12, count: 3 };
    const start = frame("facing-cross", { page: 1, xMm: 50, yMm: 40, wMm: 30, hMm: 20, runAround: true });
    const slot1 = facingSlot(0, projection);
    const slot2 = facingSlot(1, projection);
    const dxPx = slot2.x - slot1.x;
    const dyPx = slot2.y - slot1.y;

    const toPage2 = resolveMovedFramePlacement(start, dxPx, dyPx, {
      pageCount: 3,
      pageHeightPx: projection.height,
      gapPx: projection.gap,
      projection,
    });
    expect(toPage2.page).toBe(2);
    expect(toPage2.xMm).toBeCloseTo(50, 6);
    expect(toPage2.yMm).toBeCloseTo(40, 6);

    const backToPage1 = resolveMovedFramePlacement(
      { ...start, ...toPage2 },
      -dxPx,
      -dyPx,
      { pageCount: 3, pageHeightPx: projection.height, gapPx: projection.gap, projection },
    );
    expect(backToPage1.page).toBe(1);
    expect(backToPage1.xMm).toBeCloseTo(50, 6);
    expect(backToPage1.yMm).toBeCloseTo(40, 6);
  });

  it("preserves page-2+ frames when moved slightly in Pageless mode (pageCount === 1)", () => {
    const start = frame("pageless-p2", { page: 2, xMm: 30, yMm: 25, wMm: 30, hMm: 20 });
    const moved = resolveMovedFramePlacement(start, 15, 10, {
      pageCount: 1,
      pageHeightPx: 1122.52,
      gapPx: 12,
    });
    expect(moved.page).toBe(2);
    expect(moved.xMm).toBeGreaterThan(30);
    expect(moved.yMm).toBeGreaterThan(25);
  });

  it("records a single history entry for cross-page Run Around drag and supports Undo/Redo", () => {
    const pageHeightPx = 1122.52;
    const gapPx = 12;
    const stride = pageHeightPx + gapPx;
    const start = [frame("ra-move", { page: 1, xMm: 50, yMm: 60, runAround: true })];

    let history = beginObjectGesture(createObjectFrameHistory(), start);
    const stepMid = [{
      ...start[0],
      ...resolveMovedFramePlacement(start[0], 0, stride / 2, { pageCount: 2, pageHeightPx, gapPx }),
    }];
    expect(recordObjectFrames(history, start, stepMid)).toBe(history);

    const end = [{
      ...start[0],
      ...resolveMovedFramePlacement(start[0], 0, stride, { pageCount: 2, pageHeightPx, gapPx }),
    }];
    expect(end[0].page).toBe(2);
    expect(end[0].yMm).toBeCloseTo(60, 6);
    expect(recordObjectFrames(history, stepMid, end)).toBe(history);

    history = endObjectGesture(history, end);
    expect(history.past).toHaveLength(1);

    const undone = undoObjectFrames(history, end)!;
    expect(undone.frames[0]).toMatchObject({ id: "ra-move", page: 1, runAround: true });
    expect(undone.frames[0].yMm).toBeCloseTo(60, 6);

    const redone = redoObjectFrames(undone.state, undone.frames)!;
    expect(redone.frames[0]).toMatchObject({ id: "ra-move", page: 2, runAround: true });
    expect(redone.frames[0].yMm).toBeCloseTo(60, 6);
  });

  it("clamps south/north resizes to owning physical page and handles Facing Pages without negative coordinates (H3)", () => {
    const pxPerMm = 96 / 25.4;
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const pageWidthPx = pageWidthMm * pxPerMm;
    const pageHeightPx = pageHeightMm * pxPerMm;

    // 1. Single Pages south-handle dragged past Page 1 bottom stays on Page 1 and clamps hMm to Page 1 bottom.
    const p1 = frame("p1-tall", { page: 1, xMm: 20, yMm: 240, wMm: 40, hMm: 30 });
    const clampedSouth = resolveResizedFrameBounds(
      p1,
      "s",
      { x: 50 * pxPerMm, y: 420 * pxPerMm },
      { startSlot: { x: 0, y: 0 }, pageWidthPx, pageHeightPx },
    )!;
    expect(clampedSouth.page).toBe(1);
    expect(clampedSouth.yMm).toBe(240);
    expect(clampedSouth.yMm + clampedSouth.hMm).toBeCloseTo(pageHeightMm, 4);

    // 2. Single Pages north-handle on Page 2 dragged above Page 2 top stays on Page 2 and clamps yMm >= 0.
    const stride = pageHeightPx + 12;
    const p2 = frame("p2-north", { page: 2, xMm: 25, yMm: 20, wMm: 40, hMm: 35, imageSrc: "data:image/png;base64,a", imageXMm: 4, imageYMm: 6 });
    const clampedNorth = resolveResizedFrameBounds(
      p2,
      "n",
      { x: 35 * pxPerMm, y: stride - 140 },
      { startSlot: { x: 0, y: stride }, pageWidthPx, pageHeightPx },
    )!;
    expect(clampedNorth.page).toBe(2);
    expect(clampedNorth.yMm).toBeCloseTo(0, 6);
    expect(clampedNorth.hMm).toBeCloseTo(55, 4);
    expect(clampedNorth.imageYMm).toBeCloseTo(26, 4);

    // 3. Rapid pointer movement across nw handle: returning to start point yields exact original imageYMm without drift.
    const rapidMid = resolveResizedFrameBounds(
      p2,
      "nw",
      { x: 15 * pxPerMm, y: stride + 8 * pxPerMm },
      { startSlot: { x: 0, y: stride }, pageWidthPx, pageHeightPx },
    )!;
    const rapidBack = resolveResizedFrameBounds(
      p2,
      "nw",
      { x: 25 * pxPerMm, y: stride + 20 * pxPerMm },
      { startSlot: { x: 0, y: stride }, pageWidthPx, pageHeightPx },
    )!;
    expect(rapidMid.imageXMm).toBeCloseTo(14, 4);
    expect(rapidMid.imageYMm).toBeCloseTo(18, 4);
    expect(rapidBack.xMm).toBeCloseTo(25, 4);
    expect(rapidBack.yMm).toBeCloseTo(20, 4);
    expect(rapidBack.imageXMm).toBeCloseTo(4, 4);
    expect(rapidBack.imageYMm).toBeCloseTo(6, 4);

    // 4. Facing Pages south & west across spread spine keep owning page and clamp to page bounds.
    const projection: PageProjection = { width: pageWidthPx, height: pageHeightPx, gap: 12, count: 3 };
    const slot2 = facingSlot(1, projection); // Page 2 in spread
    const p2Facing = frame("p2-facing", { page: 2, xMm: 20, yMm: 30, wMm: 40, hMm: 30 });
    const crossSpineWest = resolveResizedFrameBounds(
      p2Facing,
      "w",
      { x: slot2.x - 160, y: slot2.y + 40 * pxPerMm },
      { startSlot: slot2, pageWidthPx, pageHeightPx },
    )!;
    expect(crossSpineWest.page).toBe(2);
    expect(crossSpineWest.xMm).toBeCloseTo(0, 6);
    expect(crossSpineWest.wMm).toBeCloseTo(60, 4);

    // 5. Facing Pages singleLine resize applies startSlot.x cleanly.
    const slot1 = facingSlot(0, projection);
    const titleFacing = frame("title-facing", { page: 1, singleLine: true, kind: "text", xMm: 40, yMm: 25, wMm: 60, hMm: 10 });
    const titleResized = resolveResizedFrameBounds(
      titleFacing,
      "e",
      { x: slot1.x + 130 * pxPerMm, y: slot1.y + 25 * pxPerMm },
      { startSlot: slot1, pageWidthPx, pageHeightPx },
    )!;
    expect(titleResized.page).toBe(1);
    expect(titleResized.xMm).toBeCloseTo(40, 6);
    expect(titleResized.wMm).toBeCloseTo(90, 4);
    expect(titleResized.hMm).toBe(10);
  });
});
