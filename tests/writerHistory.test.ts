import {
  createTextHistory,
  pushTextHistory,
  undoTextHistory,
  redoTextHistory,
  canUndo,
  canRedo,
  WRITER_HISTORY_LIMIT,
} from "../app/tools/roman-urdu-writer/utils/writerHistory";

describe("writerHistory", () => {
  test("undo redo", () => {
    let h = createTextHistory("");
    h = pushTextHistory(h, "a", 1000, 80, 0);
    h = pushTextHistory(h, "ab", 2000, 80, 0);
    h = undoTextHistory(h);
    expect(h.present).toBe("a");
    h = redoTextHistory(h);
    expect(h.present).toBe("ab");
  });

  test("new edit clears redo", () => {
    let h = createTextHistory("");
    h = pushTextHistory(h, "a", 1000, 80, 0);
    h = pushTextHistory(h, "ab", 2000, 80, 0);
    h = undoTextHistory(h);
    h = pushTextHistory(h, "az", 3000, 80, 0);
    expect(canRedo(h)).toBe(false);
  });

  test("coalesce rapid typing", () => {
    let h = createTextHistory("");
    h = pushTextHistory(h, "a", 1000, 80, 400);
    h = pushTextHistory(h, "ab", 1200, 80, 400);
    expect(h.past.length).toBe(1);
  });

  test("bounded", () => {
    let h = createTextHistory("");
    for (let i = 0; i < WRITER_HISTORY_LIMIT + 10; i++) {
      h = pushTextHistory(h, String(i), i * 1000, WRITER_HISTORY_LIMIT, 0);
    }
    expect(h.past.length).toBeLessThanOrEqual(WRITER_HISTORY_LIMIT);
  });

  test("canUndo empty", () => {
    expect(canUndo(createTextHistory("hi"))).toBe(false);
  });
});
