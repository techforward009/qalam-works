/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import {
  bindFrameScrollLock,
  caretInClippedOverflow,
  columnFrameOverflowEdge,
  frameContentBox,
  frameOverflowEdge,
  frameOverflowMarkStyle,
  pinFrameScroll,
  rtlStartScrollLeft,
} from "../app/tools/document-studio/utils/frameOverflow";

const box = { left: 1, top: 1, right: 120, bottom: 80 };

describe("frameOverflowEdge", () => {
  it("marks multiline overflow on the bottom when content is taller than the box", () => {
    expect(frameOverflowEdge({ singleLine: false, scrollHeight: 200, clientHeight: 80, scrollWidth: 100, clientWidth: 100 })).toBe("bottom");
  });

  it("ignores a 2px measurement slop and horizontal wrap in a multiline box", () => {
    expect(frameOverflowEdge({ singleLine: false, scrollHeight: 82, clientHeight: 80, scrollWidth: 400, clientWidth: 100 })).toBeNull();
    expect(frameOverflowEdge({ singleLine: false, scrollHeight: 83, clientHeight: 80, scrollWidth: 100, clientWidth: 100 })).toBe("bottom");
  });

  it("does not mark a wrapping single-line box", () => {
    expect(frameOverflowEdge({ singleLine: true, scrollHeight: 40, clientHeight: 20, scrollWidth: 300, clientWidth: 100 })).toBeNull();
    expect(frameOverflowEdge({ singleLine: true, scrollHeight: 40, clientHeight: 20, scrollWidth: 102, clientWidth: 100 })).toBeNull();
    expect(frameOverflowEdge({ singleLine: true, scrollHeight: 200, clientHeight: 40, scrollWidth: 100, clientWidth: 100 })).toBeNull();
  });

  it("returns null for an empty box", () => {
    expect(frameOverflowEdge({ singleLine: false, scrollHeight: 0, clientHeight: 0, scrollWidth: 0, clientWidth: 0 })).toBeNull();
  });
});

describe("columnFrameOverflowEdge", () => {
  it("keeps a fitting single column free of a stripe", () => {
    expect(columnFrameOverflowEdge({ singleLine: false, scrollHeight: 80, clientHeight: 80, scrollWidth: 400, clientWidth: 100 }, 1)).toBeNull();
  });

  it("marks extra columns with the bottom stripe", () => {
    expect(columnFrameOverflowEdge({ singleLine: false, scrollHeight: 80, clientHeight: 80, scrollWidth: 240, clientWidth: 100 }, 2)).toBe("bottom");
    expect(columnFrameOverflowEdge({ singleLine: false, scrollHeight: 200, clientHeight: 80, scrollWidth: 100, clientWidth: 100 }, 2)).toBe("bottom");
  });

  it("ignores a 2px column slop and a fitting pair of columns", () => {
    expect(columnFrameOverflowEdge({ singleLine: false, scrollHeight: 80, clientHeight: 80, scrollWidth: 102, clientWidth: 100 }, 2)).toBeNull();
    expect(columnFrameOverflowEdge({ singleLine: false, scrollHeight: 80, clientHeight: 80, scrollWidth: 100, clientWidth: 100 }, 2)).toBeNull();
    expect(columnFrameOverflowEdge({ singleLine: true, scrollHeight: 200, clientHeight: 40, scrollWidth: 300, clientWidth: 100 }, 3)).toBeNull();
  });
});

describe("pinFrameScroll", () => {
  it("pins multiline to the top and single-line RTL to scrollLeft 0", () => {
    expect(rtlStartScrollLeft()).toBe(0);
    const multi = { scrollTop: 36, scrollLeft: -12 };
    pinFrameScroll(multi, false);
    expect(multi).toEqual({ scrollTop: 0, scrollLeft: 0 });
    const single = { scrollTop: 4, scrollLeft: -240 };
    pinFrameScroll(single, true);
    expect(single).toEqual({ scrollTop: 0, scrollLeft: 0 });
  });
});

describe("caretInClippedOverflow", () => {
  it("hides a caret past the bottom or the left edge and keeps an interior caret", () => {
    expect(caretInClippedOverflow({ left: 20, top: 10, width: 2, height: 20 }, box)).toBe(false);
    expect(caretInClippedOverflow({ left: 20, top: 79, width: 2, height: 20 }, box)).toBe(true);
    expect(caretInClippedOverflow({ left: -30, top: 10, width: 2, height: 20 }, box)).toBe(true);
    expect(caretInClippedOverflow({ left: 4, top: -40, width: 2, height: 10 }, box)).toBe(true);
    expect(caretInClippedOverflow({ left: 90, top: 70, width: 2, height: 20 }, box)).toBe(false);
  });

  it("builds the visible box from the border and the client size", () => {
    expect(frameContentBox(100, 40, 1, 1)).toEqual({ left: 1, top: 1, right: 101, bottom: 41 });
  });
});

describe("frameOverflowMarkStyle", () => {
  it("draws a full-width bottom stripe and a left-edge horizontal stripe", () => {
    const bottom = frameOverflowMarkStyle("bottom");
    expect(bottom.height).toBe(5);
    expect(bottom.left).toBe(1);
    expect(bottom.right).toBe(1);
    expect(bottom.bottom).toBe(1);
    expect(bottom.width).toBeUndefined();
    expect(bottom.background).toBe("#ff0000");
    expect(bottom.pointerEvents).toBe("none");
    const start = frameOverflowMarkStyle("start");
    expect(start.height).toBe(5);
    expect(start.width).toBeGreaterThan(start.height);
    expect(start.left).toBe(1);
    expect(start.right).toBeUndefined();
    expect(start.bottom).toBe(1);
    expect(start.background).toBe("#ff0000");
  });
});

describe("bindFrameScrollLock", () => {
  it("resets a programmatic scroll and cancels the wheel", () => {
    document.body.innerHTML = '<textarea id="field"></textarea>';
    const field = document.querySelector<HTMLTextAreaElement>("#field")!;
    const release = bindFrameScrollLock(field, false);
    field.scrollTop = 36;
    field.dispatchEvent(new Event("scroll"));
    expect(field.scrollTop).toBe(0);
    const wheel = new WheelEvent("wheel", { deltaY: 80, cancelable: true });
    field.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    release();
    field.scrollTop = 20;
    field.dispatchEvent(new Event("scroll"));
    expect(field.scrollTop).toBe(20);
  });

  it("puts the document scroller back after a field key scrolls it", () => {
    document.body.innerHTML = '<div data-studio-scroller="true"><textarea id="field"></textarea></div>';
    const field = document.querySelector<HTMLTextAreaElement>("#field")!;
    const scroller = field.parentElement as HTMLElement;
    scroller.scrollLeft = 120;
    scroller.scrollTop = 40;
    const release = bindFrameScrollLock(field, false);
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    scroller.scrollLeft = 0;
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.scrollLeft).toBe(120);
    expect(scroller.scrollTop).toBe(40);
    release();
  });
});
