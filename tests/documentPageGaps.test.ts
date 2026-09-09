/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import {
  PAGE_STACK_GAP_PX,
  collectPageGapBreaksFromLines,
  type PageLineMetric,
} from "../app/tools/document-studio/utils/documentView";
import {
  PageGapExtension,
  applyPageGapGeometry,
  pageGapPluginKey,
} from "../app/tools/document-studio/utils/pageGapDecorations";

const PAGE_H = 100;
const GAP = PAGE_STACK_GAP_PX;

function gutters(pageCount: number): Array<[number, number]> {
  return Array.from({ length: pageCount - 1 }, (_, index) => {
    const start = (index + 1) * PAGE_H + index * GAP;
    return [start, start + GAP];
  });
}

function spaceLines(lines: PageLineMetric[], breaks: { pos: number; heightPx: number }[]) {
  return lines.map((line) => {
    const earlier = breaks.filter((entry) => entry.pos < line.pos).reduce((sum, entry) => sum + entry.heightPx, 0);
    const own = breaks.find((entry) => entry.pos === line.pos);
    const top = line.top + earlier + (own ? own.heightPx : 0);
    return { top, bottom: top + (line.bottom - line.top) };
  });
}

describe("Pages mode visual gaps", () => {
  it("keeps multi-page lines out of the 12px sheet gutter without mutating JSON", () => {
    const lines: PageLineMetric[] = [
      { pos: 1, top: 0, bottom: 20 },
      { pos: 10, top: 20, bottom: 40 },
      { pos: 20, top: 40, bottom: 60 },
      { pos: 30, top: 60, bottom: 80 },
      { pos: 40, top: 80, bottom: 108 },
      { pos: 50, top: 108, bottom: 128 },
      { pos: 60, top: 128, bottom: 148 },
      { pos: 70, top: 148, bottom: 168 },
      { pos: 80, top: 168, bottom: 188 },
      { pos: 90, top: 188, bottom: 208 },
      { pos: 100, top: 208, bottom: 228 },
    ];
    const breaks = collectPageGapBreaksFromLines(lines, PAGE_H, GAP);
    expect(breaks.length).toBeGreaterThanOrEqual(2);
    expect(breaks[0]).toEqual({ pos: 40, heightPx: PAGE_H - 80 + GAP });

    const spaced = spaceLines(lines, breaks);
    for (const [gapStart, gapEnd] of gutters(3)) {
      for (const line of spaced) {
        expect(line.top < gapEnd && line.bottom > gapStart).toBe(false);
      }
    }

    const host = document.createElement("div");
    document.body.appendChild(host);
    const editor = new Editor({
      element: host,
      extensions: [...createDocumentStudioExtensions(), PageGapExtension],
      content: {
        type: "doc",
        content: lines.map((line, index) => ({
          type: "paragraph",
          attrs: { dir: index % 2 === 0 ? "rtl" : "ltr" },
          content: [{ type: "text", text: index % 2 === 0 ? "اردو سطر" : "English line" }],
        })),
      },
    });
    const before = JSON.stringify(editor.getJSON());
    applyPageGapGeometry(editor, { enabled: true, pageHeightPx: PAGE_H, gapPx: GAP });
    expect(JSON.stringify(editor.getJSON())).toBe(before);
    expect(pageGapPluginKey.getState(editor.state)?.geometry.enabled).toBe(true);
    applyPageGapGeometry(editor, { enabled: false, pageHeightPx: PAGE_H, gapPx: GAP });
    expect(JSON.stringify(editor.getJSON())).toBe(before);
    expect(pageGapPluginKey.getState(editor.state)?.decorations.find().length).toBe(0);
    editor.destroy();
  });
});
