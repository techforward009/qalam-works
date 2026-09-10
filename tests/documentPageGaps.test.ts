/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import {
  PAGE_STACK_GAP_PX,
  collectPageGapBreaksFromLines,
  pageTransitionSpacerPx,
  type PageLineMetric,
} from "../app/tools/document-studio/utils/documentView";
import {
  PageGapExtension,
  applyPageGapGeometry,
  pageGapPluginKey,
  pageGapProbeXs,
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

  it("A. keeps a short paragraph on page 1", () => {
    const breaks = collectPageGapBreaksFromLines([{ pos: 1, top: 0, bottom: 40 }], PAGE_H, GAP);
    expect(breaks).toEqual([]);
  });

  it("C. splits one oversized paragraph internally without a start spacer", () => {
    const breaks = collectPageGapBreaksFromLines(
      [{ pos: 1, top: 0, bottom: 180, splitPositions: [{ offsetY: 100, pos: 40 }] }],
      PAGE_H,
      GAP,
    );
    expect(breaks).toEqual([{ pos: 40, heightPx: GAP }]);
    expect(breaks.some((entry) => entry.pos === 1)).toBe(false);
  });

  it("D. produces multiple internal breaks for a 3+ page paragraph", () => {
    const breaks = collectPageGapBreaksFromLines(
      [{
        pos: 1,
        top: 0,
        bottom: 280,
        splitPositions: [
          { offsetY: 100, pos: 40 },
          { offsetY: 200, pos: 80 },
        ],
      }],
      PAGE_H,
      GAP,
    );
    expect(breaks.map((entry) => entry.pos)).toEqual([40, 80]);
    expect(breaks.every((entry) => entry.heightPx === GAP)).toBe(true);
    expect(breaks.length).toBeGreaterThan(1);
  });

  it("E/F. RTL and LTR oversized paragraphs split internally", () => {
    const metric = {
      pos: 1,
      top: 0,
      bottom: 220,
      splitPositions: [{ offsetY: 100, pos: 55 }, { offsetY: 200, pos: 90 }],
    };
    const rtl = collectPageGapBreaksFromLines([metric], PAGE_H, GAP);
    const ltr = collectPageGapBreaksFromLines([metric], PAGE_H, GAP);
    expect(rtl).toEqual(ltr);
    expect(rtl[0]?.pos).toBeGreaterThan(1);
  });

  it("G. does not create a phantom blank first page when the block starts slightly below the sheet top", () => {
    const breaks = collectPageGapBreaksFromLines(
      [{
        pos: 1,
        top: 8,
        bottom: 308,
        splitPositions: [
          { offsetY: 92, pos: 42 },
          { offsetY: 192, pos: 84 },
        ],
      }],
      PAGE_H,
      GAP,
    );
    expect(breaks.some((entry) => entry.pos === 1)).toBe(false);
    expect(breaks.map((entry) => entry.pos)).toEqual([42, 84]);
  });

  it("H. decoration pagination does not mutate editor JSON", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const editor = new Editor({
      element: host,
      extensions: [...createDocumentStudioExtensions(), PageGapExtension],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          attrs: { dir: "rtl" },
          content: [{ type: "text", text: "اردو ".repeat(80) }],
        }],
      },
    });
    const before = JSON.stringify(editor.getJSON());
    applyPageGapGeometry(editor, { enabled: true, pageHeightPx: PAGE_H, gapPx: GAP });
    expect(JSON.stringify(editor.getJSON())).toBe(before);
    editor.destroy();
  });

  it("probes RTL from the right edge first", () => {
    const xs = pageGapProbeXs({ left: 0, width: 200 }, "rtl");
    expect(xs[0]).toBeGreaterThan(xs[xs.length - 1]);
    const ltr = pageGapProbeXs({ left: 0, width: 200 }, "ltr");
    expect(ltr[0]).toBeLessThan(ltr[ltr.length - 1]);
  });

  it("C/D. internal long-paragraph break includes bottom margin + gutter + next top margin", () => {
    const top = 20;
    const bottom = 20;
    const contentH = 100;
    const transition = pageTransitionSpacerPx(bottom, GAP, top);
    expect(transition).toBe(52);
    const breaks = collectPageGapBreaksFromLines(
      [{
        pos: 1,
        top: 0,
        bottom: 280,
        splitPositions: [
          { offsetY: 100, pos: 40 },
          { offsetY: 200, pos: 80 },
        ],
      }],
      contentH,
      transition,
    );
    expect(breaks.map((entry) => entry.pos)).toEqual([40, 80]);
    expect(breaks.every((entry) => entry.heightPx === transition)).toBe(true);
    expect(breaks.some((entry) => entry.pos === 1)).toBe(false);
  });

  it("D. short block moved to next page begins after leftover content + transition", () => {
    const transition = pageTransitionSpacerPx(20, GAP, 20);
    const breaks = collectPageGapBreaksFromLines(
      [
        { pos: 1, top: 0, bottom: 80 },
        { pos: 20, top: 80, bottom: 110 },
      ],
      100,
      transition,
    );
    expect(breaks[0]?.pos).toBe(20);
    expect(breaks[0]?.heightPx).toBe(20 + transition);
  });
});
