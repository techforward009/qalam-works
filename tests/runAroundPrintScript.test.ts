/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { applyStoryRunAround, runAroundBrowserProgram } from "../app/tools/document-studio/extensions/RunAroundLayout";

describe("print and PDF run-around script", () => {
  it("evals without the module graph and inserts spacers on both sides", () => {
    const program = runAroundBrowserProgram();
    expect(program).toContain("function placeGlyphs");
    expect(program).toContain("function applyStoryRunAround");
    expect(program).not.toContain("_runAroundFlow");
    const root = document.createElement("div");
    root.innerHTML = `<p>${"اب ".repeat(30)}</p>`;
    document.body.append(root);
    const box = { left: 0, right: 420, top: 0, bottom: 80, width: 420, height: 80, x: 0, y: 0, toJSON() { return {}; } };
    root.getBoundingClientRect = () => box as DOMRect;
    const block = root.querySelector("p")!;
    block.getBoundingClientRect = () => box as DOMRect;
    const original = Range.prototype.getClientRects;
    Range.prototype.getClientRects = () => [{ width: 10, height: 16, left: 0, right: 10, top: 0, bottom: 16 }] as unknown as DOMRectList;
    try {
      const run = new Function("root", "exclusions", "direction", `${program}\nreturn applyStoryRunAround(root, exclusions, direction);`) as (
        root: HTMLElement,
        exclusions: Array<{ left: number; right: number; top: number; bottom: number }>,
        direction: "rtl" | "ltr",
      ) => number;
      const inserted = run(root, [{ left: 140, right: 220, top: 0, bottom: 40 }], "rtl");
      expect(inserted).toBeGreaterThan(0);
      expect(root.querySelectorAll("[data-print-run-around='gap']").length).toBeGreaterThan(0);
      expect(root.querySelector("[data-run-around-gap]")).toBeNull();
      expect(applyStoryRunAround(root, [{ left: 140, right: 220, top: 0, bottom: 40 }], "ltr")).toBeGreaterThan(0);
    } finally {
      Range.prototype.getClientRects = original;
      root.remove();
    }
  });
});
