import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import puppeteer from "puppeteer-core";
import type { Page } from "puppeteer-core";
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { arabicAyat, urduAyat } from "./fixtures/digitalKhatt/aalImran";
import { guardScriptAwarePdfFonts } from "../app/tools/document-studio/utils/pdfScriptAwareFontGuard";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { fontsForDocument } from "../app/tools/document-studio/utils/pdfDocumentFonts";
import { verifyPdfUrduEmbedding } from "../app/tools/document-studio/utils/pdfEmbeddedFonts";
import { guardPdfUrduFonts } from "../app/tools/document-studio/utils/pdfUrduFontGuard";

const CHROME = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1234/chrome-linux64/chrome"].find(
  (path): path is string => typeof path === "string" && existsSync(path),
);

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

  it.skipIf(!CHROME)("embeds DigitalKhattIndoPakQalam for an Indo-Pak ayah", async () => {
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
      expect(guarded.actualFamilies).toEqual(["DigitalKhatt IndoPak Qalam"]);
      const pdf = await page.pdf({ width: "210mm", height: "80mm", printBackground: true, pageRanges: "1" });
      await page.screenshot({ path: "/tmp/digital-khatt-pdf-ayah.png" });
      const pdfDoc = await PDFDocument.load(pdf);
      const embedded = verifyPdfUrduEmbedding(pdfDoc, guarded.actualFamilies);
      expect(embedded.some((name) => /DigitalKhattIndoPakQalam/i.test(name))).toBe(true);
      expect(Buffer.from(pdf).includes(Buffer.from("DigitalKhattIndoPakQalam"))).toBe(true);
      expect(text.length).toBeGreaterThan(8);
    } finally {
      await browser.close();
    }
  }, 30000);
  it.skipIf(!CHROME)("shapes Urdu-codepoint Aal-Imran 3:26-27 with identical PDF glyph IDs and advances", async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--font-render-hinting=none"] });
    try {
      const page = await browser.newPage();
      const print = async (text: string) => {
        const settings = defaultDocumentSettings();
        const doc = digitalKhattDoc(text);
        const loaded = await fontsForDocument(doc, "rtl", settings.typography);
        const html = buildPdfHtml(doc, "rtl", loaded.fonts, settings.typography);
        await page.setContent(html.html, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        const guarded = await guardScriptAwarePdfFonts(page, [text]);
        expect(guarded.diagnostics.every(part => part.accepted)).toBe(true);
        const bytes = await page.pdf({ width: "210mm", height: "297mm", printBackground: true });
        const pdf = await PDFDocument.load(bytes);
        const streams = pdf.getPages().flatMap(p => {
          const contents = p.node.Contents();
          const raw = contents instanceof PDFArray ? contents.asArray().map(ref => pdf.context.lookup(ref)) : [contents];
          return raw.map(stream => {
            if (!(stream instanceof PDFRawStream)) throw new Error("Missing PDF content stream");
            return Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
          });
        }).join("\n");
        // Chromium emits glyph IDs in Tj/TJ and advances/offsets in TJ/Tm/Td.
        // Ignore accessibility ActualText, which must preserve differing Unicode.
        return streams.split("\n").map(line => line.trim()).filter(line => /\b(?:Tj|TJ|Td|TD|Tm|Tf|Tc|Tw|Tz|TL|Ts|BT|ET)$/.test(line)).join("\n");
      };
      for (let index = 0; index < arabicAyat.length; index++) {
        const arabic = await print(arabicAyat[index]);
        expect(arabic).toMatch(/Tj|TJ/);
        expect(await print(urduAyat[index])).toBe(arabic);
      }
      for (const [urdu, arabic] of [["۝۲۶ ۝۲۷ ۰۱۲۳۴۵۶۷۸۹", "۝٢٦ ۝٢٧ ٠١٢٣٤٥٦٧٨٩"], ["ی بی یب بیب", "ي بي يب بيب"], ["ہ بہ ہب بہب", "ه به هب بهب"], ["ھ بھ ھب بھب", "ه به هب بهب"], ["ک بک کب بکب", "ك بك كب بكب"], ["ۃ بۃ ے بے ۓ بۓ", "ة بة ي بي ئ بئ"]]) {
        expect(await print(urdu)).toBe(await print(arabic));
      }
    } finally {
      await browser.close();
    }
  }, 60000);

});
