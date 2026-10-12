import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import puppeteer from "puppeteer-core";
import type { Page } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { fontsForDocument } from "../app/tools/document-studio/utils/pdfDocumentFonts";
import { verifyPdfUrduEmbedding } from "../app/tools/document-studio/utils/pdfEmbeddedFonts";
import { guardPdfUrduFonts } from "../app/tools/document-studio/utils/pdfUrduFontGuard";

const CHROME = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1234/chrome-linux64/chrome"].find(
  (path): path is string => typeof path === "string" && existsSync(path),
);

function ensureProductionFonts(): void {
  if (existsSync("/tmp/opensans/fonts.conf")) return;
  mkdirSync("/tmp/opensans/cache", { recursive: true });
  execSync("node -e \"const fs=require('fs');const zlib=require('zlib');fs.writeFileSync('/tmp/sparticuz-fonts.tar', zlib.brotliDecompressSync(fs.readFileSync('node_modules/@sparticuz/chromium/bin/fonts.tar.br')))\"");
  execSync("tar -xOf /tmp/sparticuz-fonts.tar fonts/Open_Sans/OpenSans-Regular.ttf > /tmp/opensans/OpenSans-Regular.ttf");
  writeFileSync("/tmp/opensans/fonts.conf", `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>/tmp/opensans</dir>
  <cachedir>/tmp/opensans/cache</cachedir>
  <alias><family>sans-serif</family><prefer><family>Open Sans</family></prefer></alias>
  <alias><family>serif</family><prefer><family>Open Sans</family></prefer></alias>
</fontconfig>`);
}
function fatihaAyah(): string {
  const corpus = JSON.parse(readFileSync("public/quran/indopak-digital-khatt.json", "utf8")) as Record<string, Array<{ text?: string }>>;
  const text = corpus["1"]?.find((verse) => typeof verse.text === "string" && verse.text.includes("الْعٰلَمِيْنَ"))?.text;
  if (!text) throw new Error("Indo-Pak corpus ayah was not found");
  return text;
}

function digitalKhattDoc(text: string): DocNode {
  return {
    type: "doc",
    content: [{
      type: "paragraph",
      attrs: { dir: "rtl" },
      content: [{ type: "text", text, marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak", fontSize: "28pt" } }] }],
    }],
  };
}

describe("Digital Khatt PDF font", () => {
  it("does not replace a missing Digital Khatt face with Noto", () => {
    const html = buildPdfHtml(digitalKhattDoc("اَلْحَمْدُ"), "rtl", { faces: [] });
    expect(html.html).toContain('class="qf-blob-digital-khatt-indo-pak" data-pdf-font="Digital Khatt Indo-Pak"');
    expect(html.fontFallbacks.some((item) => /Digital Khatt/i.test(item.requested))).toBe(false);
  });

  it("rejects a custom Noto fallback when Digital Khatt was requested", async () => {
    const detach = vi.fn();
    const send = vi.fn(async (method: string) => {
      if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
      if (method === "DOM.querySelectorAll") return { nodeIds: [2] };
      if (method === "DOM.getAttributes") return { attributes: ["data-pdf-font", "Digital Khatt Indo-Pak"] };
      if (method === "CSS.getPlatformFontsForNode") {
        return { fonts: [{ familyName: "Noto Naskh Arabic", postScriptName: "NotoNaskhArabic-Regular", glyphCount: 12, isCustomFont: true }] };
      }
      return {};
    });
    const page = {
      $$eval: vi.fn(async () => 1),
      evaluate: vi.fn(async () => true),
      createCDPSession: vi.fn(async () => ({ send, detach })),
    } as unknown as Page;
    await expect(guardPdfUrduFonts(page)).rejects.toThrow(/Noto was not substituted; export blocked/);
    expect(page.$$eval).toHaveBeenCalledTimes(1);
    expect(detach).toHaveBeenCalled();
  });

  it("accepts Chromium's DigitalKhatt IndoPak platform name", async () => {
    const send = vi.fn(async (method: string) => {
      if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
      if (method === "DOM.querySelectorAll") return { nodeIds: [2] };
      if (method === "DOM.getAttributes") return { attributes: ["data-pdf-font", "Digital Khatt Indo-Pak"] };
      if (method === "CSS.getPlatformFontsForNode") {
        return { fonts: [{ familyName: "DigitalKhatt IndoPak", postScriptName: "DigitalKhattIndoPakRegular", glyphCount: 40, isCustomFont: true }] };
      }
      return {};
    });
    const page = {
      $$eval: vi.fn(async () => 1),
      evaluate: vi.fn(async () => true),
      createCDPSession: vi.fn(async () => ({ send, detach: vi.fn() })),
    } as unknown as Page;
    expect(await guardPdfUrduFonts(page)).toEqual({ fallbackRuns: 0, actualFamilies: ["DigitalKhatt IndoPak"] });
  });

  it("embeds DigitalKhattIndoPakRegular for an Indo-Pak ayah", async () => {
    if (!CHROME) return;
    const text = fatihaAyah();
    const settings = defaultDocumentSettings();
    const doc = digitalKhattDoc(text);
    const loaded = await fontsForDocument(doc, "rtl", settings.typography);
    const face = loaded.fonts.faces.find((item) => item.familyName === "Digital Khatt Indo-Pak");
    expect(face?.complete).toBe(true);
    expect(face?.regularSources[0]?.length).toBeGreaterThan(1000);
    const html = buildPdfHtml(doc, "rtl", loaded.fonts, settings.typography);
    expect(html.html).toContain('font-family:"Digital Khatt Indo-Pak"');
    expect(html.html).toContain("data:font/woff2;base64,");
    expect(html.fontFallbacks).toEqual([]);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--font-render-hinting=none"] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 900, height: 400, deviceScaleFactor: 2 });
      await page.setContent(html.html, { waitUntil: "load" });
      const guarded = await guardPdfUrduFonts(page);
      expect(guarded.fallbackRuns).toBe(0);
      expect(guarded.actualFamilies).toEqual(["DigitalKhatt IndoPak"]);
      const pdf = await page.pdf({ width: "210mm", height: "80mm", printBackground: true, pageRanges: "1" });
      await page.screenshot({ path: "/tmp/digital-khatt-pdf-ayah.png" });
      const pdfDoc = await PDFDocument.load(pdf);
      const embedded = verifyPdfUrduEmbedding(pdfDoc, guarded.actualFamilies);
      expect(embedded.some((name) => /DigitalKhattIndoPakRegular/i.test(name))).toBe(true);
      expect(Buffer.from(pdf).includes(Buffer.from("DigitalKhattIndoPakRegular"))).toBe(true);
      expect(text.length).toBeGreaterThan(8);
    } finally {
      await browser.close();
    }
  }, 30000);

  it("rejects a Quranic mark missing from Digital Khatt instead of substituting Noto", async () => {
    const settings = defaultDocumentSettings();
    const doc = digitalKhattDoc(`${fatihaAyah()}\u06D7`);
    const loaded = await fontsForDocument(doc, "rtl", settings.typography);
    expect(() => buildPdfHtml(doc, "rtl", loaded.fonts, settings.typography)).toThrow(/U\+06D7/);
    expect(() => buildPdfHtml(doc, "rtl", loaded.fonts, settings.typography)).toThrow(/Noto was not substituted/);
  });

  it("lets a non-Quranic period use another font without failing the Quranic span", async () => {
    if (!CHROME) return;
    ensureProductionFonts();
    const settings = defaultDocumentSettings();
    const text = fatihaAyah();
    const doc = digitalKhattDoc(`${text}.`);
    const loaded = await fontsForDocument(doc, "rtl", settings.typography);
    const html = buildPdfHtml(doc, "rtl", loaded.fonts, settings.typography);
    expect(html.html).toContain(`data-pdf-font="Digital Khatt Indo-Pak"`);
    expect(html.html).not.toContain(`${text}.</span>`);
    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      env: { ...process.env, FONTCONFIG_FILE: "/tmp/opensans/fonts.conf" },
      args: ["--no-sandbox", "--font-render-hinting=none"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html.html, { waitUntil: "load" });
      const guarded = await guardPdfUrduFonts(page);
      expect(guarded.actualFamilies).toEqual(["DigitalKhatt IndoPak"]);
      const session = await page.createCDPSession();
      await session.send("DOM.enable");
      await session.send("CSS.enable");
      const root = await session.send("DOM.getDocument");
      const nodes = await session.send("DOM.querySelectorAll", { nodeId: root.root.nodeId, selector: '[data-pdf-font="Digital Khatt Indo-Pak"]' });
      const fonts = await session.send("CSS.getPlatformFontsForNode", { nodeId: nodes.nodeIds[0] });
      const names = fonts.fonts.filter(font => font.glyphCount > 0).map(font => font.familyName);
      expect(names).toContain("DigitalKhatt IndoPak");
      expect(names).not.toContain("Open Sans");
      expect(names).not.toContain("Noto Naskh Arabic");
    } finally {
      await browser.close();
    }
  }, 30000);
});
