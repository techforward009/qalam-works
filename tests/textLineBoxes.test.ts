// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { groupVisualLineRects, selectedLineBoxes, selectedTextareaLineBoxes } from "../app/tools/document-studio/utils/textLineBoxes";

describe("visual line selection boxes", () => {
  it("gives mixed Urdu/Latin sizes the same top and height and clamps the next line", () => {
    const boxes = groupVisualLineRects([
      { left: 0, top: 10, width: 80, height: 40, fontTop: 10, fontBottom: 40 },
      { left: 80, top: 20, width: 40, height: 20, fontTop: 20, fontBottom: 35 },
      { left: 0, top: 48, width: 90, height: 40, fontTop: 48, fontBottom: 78 },
    ]);
    expect(boxes.slice(0, 2).map(({top, height}) => ({top, height}))).toEqual([{top:10,height:38},{top:10,height:38}]);
    expect(boxes[0].top + boxes[0].height).toBe(boxes[2].top);
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
  it("mirrors textarea typography at natural size before applying 200% scaling", () => {
    const input = document.createElement("textarea");
    input.style.cssText = "width:200px;box-sizing:border-box;padding:2px;font-size:16px;line-height:35px;unicode-bidi:plaintext;text-indent:3px;tab-size:4;font-kerning:none";
    input.value = "abc\\tdef"; document.body.append(input); input.setSelectionRange(0, 3);
    Object.defineProperty(input, "clientWidth", { value: 200 });
    vi.spyOn(input, "getBoundingClientRect").mockReturnValue(new DOMRect(0,0,400,200));
    const append = vi.spyOn(document.body, "append");
    selectedTextareaLineBoxes(input);
    const mirror = append.mock.calls[0][0] as HTMLElement;
    expect(mirror.style.width).toBe("200px"); expect(mirror.style.fontSize).toBe("16px");
    expect(mirror.style.transform).toBe("scale(2)"); expect(mirror.style.unicodeBidi).toBe("plaintext");
    expect(mirror.style.textIndent).toBe("3px"); expect(mirror.style.tabSize).toBe("4"); expect(mirror.style.fontKerning).toBe("none");
    expect(mirror.isConnected).toBe(false); append.mockRestore(); input.remove();
  });
});
