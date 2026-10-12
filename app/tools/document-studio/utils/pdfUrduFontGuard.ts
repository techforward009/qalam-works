import type { Page } from "puppeteer-core";
import { formatCodePoint, isQuranicCodePoint } from "./digitalKhattCoverage";

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

async function foreignQuranicCodePoints(page: Page, index: number): Promise<string[]> {
  await page.evaluate((spanIndex) => {
    document.getElementById("qalam-font-probe")?.remove();
    const sample = document.querySelectorAll('[data-pdf-urdu="true"]')[spanIndex] as HTMLElement | undefined;
    const host = document.createElement("div");
    host.id = "qalam-font-probe";
    host.style.cssText = "position:absolute;left:-9999px;top:0;font-size:32px;white-space:nowrap;";
    if (sample) host.style.fontFamily = getComputedStyle(sample).fontFamily;
    const segmenter = "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
    const text = sample?.textContent ?? "";
    const graphemes = segmenter ? [...segmenter.segment(text)].map(part => part.segment) : [...text];
    graphemes.forEach((grapheme, graphemeIndex) => {
      const probe = document.createElement("span");
      probe.dataset.probe = String(graphemeIndex);
      probe.textContent = grapheme;
      host.appendChild(probe);
    });
    document.body.appendChild(host);
  }, index);
  const session = await page.createCDPSession();
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeIds } = await session.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "#qalam-font-probe [data-probe]" });
    const failed: string[] = [];
    for (const probeId of nodeIds) {
      const html = await session.send("DOM.getOuterHTML", { nodeId: probeId });
      const text = html.outerHTML.replace(/<[^>]+>/g, "");
      const fonts = await session.send("CSS.getPlatformFontsForNode", { nodeId: probeId });
      const used = fonts.fonts.filter(font => font.glyphCount > 0);
      const foreign = used.some(font => !isDigitalKhattPlatformFont(font));
      const quranic = [...text].some(char => isQuranicCodePoint(char.codePointAt(0) ?? 0));
      if (quranic && (foreign || used.length === 0)) {
        const fontName = used.find(font => !isDigitalKhattPlatformFont(font))?.familyName || used[0]?.familyName || "unknown";
        failed.push(`${[...text].filter(char => isQuranicCodePoint(char.codePointAt(0) ?? 0)).map(char => formatCodePoint(char.codePointAt(0) ?? 0)).join(" ")} via ${fontName}`);
      }
    }
    return failed;
  } finally {
    await session.detach();
    await page.evaluate(() => document.getElementById("qalam-font-probe")?.remove());
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
          const foreign = used.filter(font => !isDigitalKhattPlatformFont(font));
          if (used.length === 0 || foreign.some(font => /noto/i.test(`${font.familyName ?? ""} ${font.postScriptName ?? ""}`))) {
            throw new Error(`PDF font Digital Khatt Indo-Pak did not render the text (platform fonts: ${names}); Noto was not substituted; export blocked`);
          }
          if (foreign.length > 0) {
            const quranic = await foreignQuranicCodePoints(page, index);
            if (quranic.length > 0) {
              throw new Error(`PDF font Digital Khatt Indo-Pak did not render Quranic text ${quranic.join("; ")} (platform fonts: ${names}); Noto was not substituted; export blocked`);
            }
          }
          return { used: used.filter(isDigitalKhattPlatformFont), usable: true };
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
