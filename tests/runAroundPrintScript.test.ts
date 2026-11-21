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

      // Justified paragraph: spaces on both sides of the exclusion (even after the
      // first gap widget) get segment spans, and re-running preserves text & spaces.
      const justifiedRoot = document.createElement("div");
      const originalText = "ا ب ج د ہ و ز ح ط ی ک ل م ن س ع ف ص ق ر ش ت";
      justifiedRoot.innerHTML = `<p style="text-align:justify" data-text-align="justify">${originalText}</p>`;
      document.body.append(justifiedRoot);
      justifiedRoot.getBoundingClientRect = () => box as DOMRect;
      const justifiedBlock = justifiedRoot.querySelector("p")!;
      justifiedBlock.getBoundingClientRect = () => box as DOMRect;
      try {
        expect(applyStoryRunAround(justifiedRoot, [{ left: 166, right: 244, top: 0, bottom: 40 }], "rtl")).toBeGreaterThan(0);
        const firstPassSegments = justifiedRoot.querySelectorAll("[data-print-run-around='segment']").length;
        expect(firstPassSegments).toBeGreaterThan(1);
        expect(justifiedBlock.textContent).toBe(originalText);

        expect(applyStoryRunAround(justifiedRoot, [{ left: 166, right: 244, top: 0, bottom: 40 }], "rtl")).toBeGreaterThan(0);
        expect(justifiedRoot.querySelectorAll("[data-print-run-around='segment']").length).toBe(firstPassSegments);
        expect(justifiedBlock.textContent).toBe(originalText);
      } finally {
        justifiedRoot.remove();
      }

      // Phase 2: Manual page & section break mapping aligns Page-2+ exclusions without phantom Page-1 hits.
      const pagedRoot = document.createElement("div");
      pagedRoot.innerHTML = [
        '<p data-p="1">Page one short lead</p>',
        '<div class="qalam-page-break"></div>',
        `<p data-p="2">${"ab ".repeat(24)}</p>`,
        '<div class="qalam-section-break qalam-section-break-continuous"></div>',
        `<p data-p="2b">${"cd ".repeat(24)}</p>`,
        '<div class="qalam-section-break qalam-section-break-next-page"></div>',
        `<p data-p="3">${"ef ".repeat(24)}</p>`,
      ].join("");
      document.body.append(pagedRoot);
      pagedRoot.getBoundingClientRect = () => box as DOMRect;
      const setRect = (el: Element, top: number, bottom: number) => {
        el.getBoundingClientRect = () => ({ left: 0, right: 420, top, bottom, width: 420, height: bottom - top, x: 0, y: top, toJSON() { return {}; } } as DOMRect);
      };
      setRect(pagedRoot.querySelector('[data-p="1"]')!, 0, 24);
      setRect(pagedRoot.querySelector(".qalam-page-break")!, 24, 24);
      setRect(pagedRoot.querySelector('[data-p="2"]')!, 24, 80);
      setRect(pagedRoot.querySelector(".qalam-section-break-continuous")!, 80, 80);
      setRect(pagedRoot.querySelector('[data-p="2b"]')!, 80, 130);
      setRect(pagedRoot.querySelector(".qalam-section-break-next-page")!, 130, 130);
      setRect(pagedRoot.querySelector('[data-p="3"]')!, 130, 190);
      try {
        const exclusions = [
          { left: 140, right: 220, top: 45, bottom: 110 },   // Page 1 below short p1 (must NOT hit p2/p2b)
          { left: 140, right: 220, top: 465, bottom: 520 },  // Page 2 overlapping p2b (400+56=456..506)
          { left: 140, right: 220, top: 810, bottom: 860 },  // Page 3 overlapping p3 (800..860)
        ];
        const count = applyStoryRunAround(pagedRoot, exclusions, "ltr", { contentHeightPx: 400 });
        expect(count).toBeGreaterThan(0);
        expect(pagedRoot.querySelector('[data-p="1"] [data-print-run-around]')).toBeNull();
        expect(pagedRoot.querySelector('[data-p="2"] [data-print-run-around]')).toBeNull();
        expect(pagedRoot.querySelectorAll('[data-p="2b"] [data-print-run-around="gap"]').length).toBeGreaterThan(0);
        expect(pagedRoot.querySelectorAll('[data-p="3"] [data-print-run-around="gap"]').length).toBeGreaterThan(0);

        // Browser Print break attributes follow the identical mapping
        pagedRoot.innerHTML = [
          '<p data-p="1">Short p1</p>',
          '<div data-document-page-break="true"></div>',
          `<p data-p="2">${"ab ".repeat(24)}</p>`,
          '<div data-document-section-break="true" data-section-break-type="continuous"></div>',
          `<p data-p="2b">${"cd ".repeat(24)}</p>`,
          '<div data-document-section-break="true" data-section-break-type="nextPage"></div>',
          `<p data-p="3">${"ef ".repeat(24)}</p>`,
        ].join("");
        setRect(pagedRoot.querySelector('[data-p="1"]')!, 0, 24);
        setRect(pagedRoot.querySelector('[data-document-page-break="true"]')!, 24, 24);
        setRect(pagedRoot.querySelector('[data-p="2"]')!, 24, 80);
        setRect(pagedRoot.querySelector('[data-section-break-type="continuous"]')!, 80, 80);
        setRect(pagedRoot.querySelector('[data-p="2b"]')!, 80, 130);
        setRect(pagedRoot.querySelector('[data-section-break-type="nextPage"]')!, 130, 130);
        setRect(pagedRoot.querySelector('[data-p="3"]')!, 130, 190);
        applyStoryRunAround(pagedRoot, exclusions, "ltr", { contentHeightPx: 400 });
        expect(pagedRoot.querySelector('[data-p="2"] [data-print-run-around]')).toBeNull();
        expect(pagedRoot.querySelectorAll('[data-p="2b"] [data-print-run-around="gap"]').length).toBeGreaterThan(0);
        expect(pagedRoot.querySelectorAll('[data-p="3"] [data-print-run-around="gap"]').length).toBeGreaterThan(0);
      } finally {
        pagedRoot.remove();
      }

      // C1: packed-fallback tail spacers carry data-print-run-around="tail" and clean up cleanly across re-runs.
      const tailRoot = document.createElement("div");
      const tailText = "a b c d e f g h i j k l m n o p q r s t";
      tailRoot.innerHTML = `<p style="text-align:justify" data-text-align="justify">${tailText}</p>`;
      document.body.append(tailRoot);
      tailRoot.getBoundingClientRect = () => box as DOMRect;
      const tailBlock = tailRoot.querySelector("p")!;
      tailBlock.getBoundingClientRect = () => box as DOMRect;
      try {
        // Exclusions creating narrow 25px side columns where minWords=2 rejects fit and forces packed fallback + tail gap.
        const count = applyStoryRunAround(tailRoot, [{ left: 25, right: 395, top: 0, bottom: 40 }], "rtl");
        expect(count).toBeGreaterThan(0);
        expect(tailRoot.querySelectorAll("[data-print-run-around='tail']").length).toBeGreaterThan(0);
        expect(tailBlock.textContent).toBe(tailText);
        // Re-running with zero exclusions strips tail spacers completely.
        expect(applyStoryRunAround(tailRoot, [], "rtl")).toBe(0);
        expect(tailRoot.querySelectorAll("[data-print-run-around]").length).toBe(0);
        expect(tailBlock.textContent).toBe(tailText);
      } finally {
        tailRoot.remove();
      }

      // M3: Paragraph crossing a contentHeightPx boundary whose later line snaps down by snapFlowTop
      // still detects and wraps around a Page-2 exclusion just below pre-snap blockBottom.
      const m3Root = document.createElement("div");
      const m3Words = `${"w ".repeat(80)}`;
      m3Root.innerHTML = [
        `<p data-p="single-clear">${"c ".repeat(12)}</p>`,
        `<p data-p="crossing" style="line-height:30px">${m3Words}</p>`,
      ].join("");
      document.body.append(m3Root);
      m3Root.getBoundingClientRect = () => box as DOMRect;
      const clearP = m3Root.querySelector('[data-p="single-clear"]')!;
      const crossingP = m3Root.querySelector('[data-p="crossing"]')!;
      clearP.getBoundingClientRect = () => ({ left: 0, right: 420, top: 0, bottom: 30, width: 420, height: 30, x: 0, y: 0, toJSON() { return {}; } } as DOMRect);
      // Natural blockTop=360, natural blockBottom=420 (2 natural lines across contentHeightPx=400).
      // Line 1: 360..390 (fits Page 1). Line 2 straddles 400 -> snapFlowTop moves Line 2 to Page 2 (400..430),
      // so Line 3 reaches 430..460 and overlaps Page-2 exclusion at top=425..455 (above natural blockBottom=420!).
      crossingP.getBoundingClientRect = () => ({ left: 0, right: 420, top: 360, bottom: 420, width: 420, height: 60, x: 0, y: 360, toJSON() { return {}; } } as DOMRect);
      const savedGetCS = window.getComputedStyle;
      window.getComputedStyle = ((el: Element) => {
        const cs = savedGetCS(el);
        if (el === crossingP || el === clearP) {
          return {
            ...cs,
            direction: "ltr",
            textAlign: "left",
            textAlignLast: "auto",
            paddingLeft: "0px",
            paddingRight: "0px",
            textIndent: "0px",
            fontSize: "16px",
            lineHeight: "30px",
            getPropertyValue: (k: string) => cs.getPropertyValue(k),
          } as unknown as CSSStyleDeclaration;
        }
        return cs;
      }) as typeof window.getComputedStyle;
      Range.prototype.getClientRects = () => [{ width: 40, height: 30, left: 0, right: 40, top: 0, bottom: 30 }] as unknown as DOMRectList;
      try {
        const exclusions = [
          { left: 120, right: 220, top: 425, bottom: 455 }, // Page 2 near top (> natural blockBottom 420)
        ];
        const inserted = applyStoryRunAround(m3Root, exclusions, "ltr", { contentHeightPx: 400 });
        expect(inserted).toBeGreaterThan(0);
        expect(m3Root.querySelector('[data-p="single-clear"] [data-print-run-around]')).toBeNull();
        expect(m3Root.querySelectorAll('[data-p="crossing"] [data-print-run-around="gap"]').length).toBeGreaterThan(0);
      } finally {
        window.getComputedStyle = savedGetCS;
        m3Root.remove();
      }
    } finally {
      Range.prototype.getClientRects = original;
      root.remove();
    }
  });
});
