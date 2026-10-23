// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { groupVisualLineRects, selectedLineBoxes, lineBoxTop } from "../app/tools/document-studio/utils/textLineBoxes";

describe("visual line selection boxes", () => {
  it("gives mixed Urdu/Latin sizes the same top and height and keeps the full line-height", () => {
    const boxes = groupVisualLineRects([
      { left: 0, top: 10, width: 80, height: 40, fontTop: 10, fontBottom: 40 },
      { left: 80, top: 20, width: 40, height: 20, fontTop: 20, fontBottom: 35 },
      { left: 0, top: 51, width: 90, height: 40, fontTop: 51, fontBottom: 81 },
    ]);
    expect(boxes.slice(0, 2).map(({top, height}) => ({top, height}))).toEqual([{top:10,height:40},{top:10,height:40}]);
    expect(boxes[2].top - boxes[0].top - boxes[0].height).toBe(1);
  });
  it("subtracts half-leading at both zoom levels", () => {
    expect(lineBoxTop(106, 28, 40)).toBe(100);
    expect(lineBoxTop(212, 56, 80)).toBe(200);
  });
  it("walks a text common ancestor directly and rejects offscreen rects", () => {
    const root = document.createElement("div"); root.style.cssText = "width:200px;line-height:20px";
    root.textContent = "abcdef"; document.body.append(root);
    const range = document.createRange(); range.setStart(root.firstChild!, 1); range.setEnd(root.firstChild!, 3);
    const original = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects");
    Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [new DOMRect(0,10,20,15), new DOMRect(0,300,20,15)] });
    try { expect(selectedLineBoxes(root, range, new DOMRect(0,0,200,100))).toHaveLength(1); }
    finally { if (original) Object.defineProperty(Range.prototype, "getClientRects", original); else delete (Range.prototype as unknown as Record<string,unknown>).getClientRects; root.remove(); }
  });
});
