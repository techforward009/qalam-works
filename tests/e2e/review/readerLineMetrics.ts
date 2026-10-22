import type { Locator } from "@playwright/test";

export async function readerLineMetrics(area: Locator) {
  return area.evaluate(element => {
    const lines: { top: number; font: string; baseline: number; text: string; direction: CanvasDirection }[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const context = document.createElement("canvas").getContext("2d")!;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const style = getComputedStyle(node.parentElement!);
      const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.font = font;
      const fontAscent = context.measureText("Mg").fontBoundingBoxAscent;
      const direction = style.direction === "rtl" ? "rtl" : "ltr";
      let offset = 0;
      for (const character of node.textContent) {
        const range = document.createRange();
        range.setStart(node, offset); offset += character.length; range.setEnd(node, offset);
        const rect = [...range.getClientRects()].find(rect => rect.height > 0);
        if (!rect) continue;
        let line = lines.find(line => Math.abs(line.top - rect.top) < 1);
        if (!line) { line = { top: rect.top, baseline: rect.top + fontAscent, text: "", font, direction }; lines.push(line); }
        line.text += character;
      }
    }
    const ink = lines.sort((a, b) => a.top - b.top).filter(line => line.text.trim()).map(line => {
      context.font = line.font; context.direction = line.direction;
      const measure = context.measureText(line.text);
      return { top: line.baseline - measure.actualBoundingBoxAscent, bottom: line.baseline + measure.actualBoundingBoxDescent };
    });
    const clearances = ink.slice(1).map((line, i) => line.top - ink[i].bottom);
    const text = element.querySelector<HTMLElement>(".khateeb-book-text")!;
    const style = getComputedStyle(text);
    return {
      lines: ink.length, fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight),
      maxInkHeight: Math.max(...ink.map(line => line.bottom - line.top)),
      minimumInkClearance: clearances.length ? Math.min(...clearances) : null,
      paragraphGap: parseFloat(getComputedStyle(element).rowGap),
      availableHeight: element.clientHeight, scrollHeight: element.scrollHeight,
      inkTopInset: ink.length ? ink[0].top - element.getBoundingClientRect().top : 0,
      inkBottomInset: ink.length ? element.getBoundingClientRect().bottom - ink.at(-1)!.bottom : 0,
      fragments: [...element.querySelectorAll<HTMLElement>("[data-paragraph-id]")].map(el => ({
        paragraphId: el.dataset.paragraphId!, start: Number(el.dataset.startOffset), end: Number(el.dataset.endOffset),
      })),
    };
  });
}
