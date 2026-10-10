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

function attributeValue(attributes: string[] | undefined, name: string): string {
  if (!attributes) return "";
  for (let index = 0; index < attributes.length - 1; index += 2) {
    if (attributes[index] === name) return attributes[index + 1] ?? "";
  }
  return "";
}

function compactFontName(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isDigitalKhattRequest(value: string): boolean {
  return compactFontName(value).includes("digitalkhatt");
}

function isDigitalKhattPlatformFont(font: { familyName?: string; postScriptName?: string }): boolean {
  return compactFontName(`${font.familyName ?? ""} ${font.postScriptName ?? ""}`).includes("digitalkhatt");
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
      const described = await session.send("DOM.getAttributes", { nodeId });
      const requested = attributeValue(described.attributes, "data-pdf-font");
      const digitalKhatt = isDigitalKhattRequest(requested);
      const inspect = async () => {
        // The marked span is a stable frontend node and the CDP query includes
        // fonts used by text below inline bold/link/underline wrappers. Child
        // ids returned by describeNode are not guaranteed to be frontend ids.
        const result = await session.send("CSS.getPlatformFontsForNode", { nodeId });
        const used = result.fonts.filter(font => font.glyphCount > 0);
        if (digitalKhatt) {
          const names = used.map(font => font.familyName || font.postScriptName || "unknown").join(", ") || "none";
          if (used.length === 0 || !used.every(isDigitalKhattPlatformFont)) {
            throw new Error(`PDF font Digital Khatt Indo-Pak did not render the text (platform fonts: ${names}); Noto was not substituted; export blocked`);
          }
          return { used, usable: true };
        }
        // Other Urdu faces may fall back to bundled Noto. A different custom
        // face is not proof that the requested Digital Khatt font painted.
        return { used, usable: used.length > 0 && used.every(font => font.isCustomFont) };
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
