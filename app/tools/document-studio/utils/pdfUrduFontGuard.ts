import type { Page } from "puppeteer-core";

/** Runs inside Chromium. A successful check() alone does not prove a face exists. */
export async function loadPdfUrduFace(family: string): Promise<boolean> {
  try {
    const sample = "یہ کراچی ہے قلم ورکس نستعلیق";
    for (const weight of [400, 700]) {
      const faces = await document.fonts.load(`${weight} 16px "${family}"`, sample);
      if (!faces.length || !faces.every(face => face.status === "loaded")) return false;
    }
    await document.fonts.ready;
    return true;
  } catch {
    return false;
  }
}

/** Verify actual font use, not the computed CSS family (which can lie about fallback). */
export async function guardPdfUrduFonts(page: Page): Promise<{ fallbackRuns: number; actualFamilies: string[] }> {
  const count = await page.$$eval('[data-pdf-urdu="true"]', elements => elements.length);
  if (!count) return { fallbackRuns: 0, actualFamilies: [] };
  if (!await page.evaluate(loadPdfUrduFace, "Noto Nastaliq Urdu")) {
    throw new Error("PDF Urdu fallback unavailable: bundled Noto Nastaliq Urdu did not load; printing blocked");
  }
  const session = await page.createCDPSession();
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeIds } = await session.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: '[data-pdf-urdu="true"]' });
    const actualFamilies = new Set<string>();
    let fallbackRuns = 0;
    for (const [index, nodeId] of nodeIds.entries()) {
      const { node } = await session.send("DOM.describeNode", { nodeId, depth: -1 });
      const textParents: number[] = [];
      const collect = (current: typeof node) => {
        if (current.children?.some(child => child.nodeType === 3 && /\p{Script=Arabic}/u.test(child.nodeValue))) textParents.push(current.nodeId);
        current.children?.forEach(collect);
      };
      collect(node);
      const inspect = async () => {
        // Bold/link/underline wrappers may own the actual TextNode below the run span.
        const results = await Promise.all(textParents.map(parentId => session.send("CSS.getPlatformFontsForNode", { nodeId: parentId })));
        const used = results.flatMap(result => result.fonts).filter(font => font.glyphCount > 0);
        const hasUrdu = used.some(font => font.isCustomFont && /Jameel|Noto Nastaliq|Noto Naskh|Amiri|Vazirmatn/i.test(font.familyName));
        return { used, usable: hasUrdu && used.every(font => font.isCustomFont) };
      };
      let result = await inspect();
      if (!result.usable) {
        // Keep the text, bidi, size, weight and shaping engine; change only this run's family.
        await page.$$eval('[data-pdf-urdu="true"]', (elements, i) => {
          (elements[i] as HTMLElement).style.fontFamily = '"Noto Nastaliq Urdu"';
          elements[i].getBoundingClientRect(); // Flush layout before checking actual glyph fonts again.
        }, index);
        await page.evaluate(loadPdfUrduFace, "Noto Nastaliq Urdu");
        result = await inspect();
        fallbackRuns++;
      }
      if (!result.usable) throw new Error(`PDF Urdu glyph font could not be verified for run ${index}; printing blocked`);
      result.used.forEach(font => actualFamilies.add(font.familyName));
    }
    return { fallbackRuns, actualFamilies: [...actualFamilies] };
  } finally {
    await session.detach();
  }
}
