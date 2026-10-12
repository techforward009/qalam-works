import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import puppeteer from "puppeteer-core";
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { documentPrintCss } from "../app/tools/document-studio/utils/documentView";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { resolveEditorFontFamily } from "../app/tools/document-studio/utils/fontRegistry";
import { fontsForDocument } from "../app/tools/document-studio/utils/pdfDocumentFonts";
import { paginatePdfInk } from "../app/tools/document-studio/utils/pdfInkPagination";
import { resolvePageLayout, resolvePhysicalMargins } from "../app/tools/document-studio/utils/pageLayout";

const CHROME = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1234/chrome-linux64/chrome"].find(
  (path): path is string => typeof path === "string" && existsSync(path),
);

const AYAH = "اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَۙ";
const NASKH = "بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيْمِ";

function doc(): DocNode {
  return {
    type: "doc",
    content: [
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: AYAH, marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak" } }] }] },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: NASKH, marks: [{ type: "textStyle", attrs: { fontFamily: '"Noto Naskh Arabic", serif' } }] }] },
    ],
  };
}

describe("selected PDF fonts stay selected", () => {
  it("resolves Digital Khatt and Noto Naskh without a Noto Nastaliq substitute", () => {
    for (const name of ["Digital Khatt Indo-Pak", '"Digital Khatt Indo-Pak"', "digital-khatt-indo-pak", '"Noto Naskh Arabic", serif', "noto-naskh-arabic"]) {
      const resolved = resolveEditorFontFamily(name, "rtl");
      expect(resolved.fellBack).toBe(false);
      expect(resolved.pdfFamily).not.toBe("Noto Nastaliq Urdu");
    }
    expect(resolveEditorFontFamily("Digital Khatt Indo-Pak", "rtl").fontId).toBe("digital-khatt-indo-pak");
    expect(resolveEditorFontFamily("Noto Naskh Arabic", "rtl").fontId).toBe("noto-naskh-arabic");
  });

  it("embeds both faces in the export PDF and does not report a fallback", async () => {
    expect(CHROME, "Chrome is required").toBeTruthy();
    const settings = defaultDocumentSettings();
    const source = doc();
    const loaded = await fontsForDocument(source, "rtl", settings.typography);
    expect(loaded.fonts.faces.find(face => face.familyName === "Digital Khatt Indo-Pak")?.complete).toBe(true);
    expect(loaded.fonts.faces.find(face => face.familyName === "Noto Naskh Arabic")?.complete).toBe(true);
    const html = buildPdfHtml(source, "rtl", loaded.fonts, settings.typography);
    expect(html.fontFallbacks).toEqual([]);
    expect(html.html).toContain('data-pdf-font="Digital Khatt Indo-Pak"');
    expect(html.html).toContain('data-pdf-font="Noto Naskh Arabic"');
    expect(html.html).toContain('font-family:"Digital Khatt Indo-Pak"');
    expect(html.html).toContain('font-family:"Noto Naskh Arabic"');

    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--font-render-hinting=none"] });
    try {
      const page = await browser.newPage();
      await page.setContent(html.html, { waitUntil: "load" });
      const session = await page.createCDPSession();
      await session.send("DOM.enable");
      await session.send("CSS.enable");
      const root = await session.send("DOM.getDocument");
      const painted: Record<string, string> = {};
      for (const family of ["Digital Khatt Indo-Pak", "Noto Naskh Arabic"]) {
        const found = await session.send("DOM.querySelector", { nodeId: root.root.nodeId, selector: `[data-pdf-font="${family}"]` });
        const used = await session.send("CSS.getPlatformFontsForNode", { nodeId: found.nodeId });
        painted[family] = (used.fonts ?? []).map((font: { familyName?: string }) => font.familyName).join(",");
      }
      await session.detach();
      expect(painted["Digital Khatt Indo-Pak"]).toMatch(/DigitalKhatt|Digital Khatt/i);
      expect(painted["Noto Naskh Arabic"]).toMatch(/Noto Naskh|NotoNaskh/i);
      expect(painted["Digital Khatt Indo-Pak"]).not.toMatch(/Nastaliq/i);
      expect(painted["Noto Naskh Arabic"]).not.toMatch(/Nastaliq/i);
      const pdf = await page.pdf({ width: "210mm", height: "297mm", printBackground: true });
      const bytes = Buffer.from(pdf);
      const document = await PDFDocument.load(bytes);
      const names = new Set<string>();
      for (const pdfPage of document.getPages()) {
        const resources = pdfPage.node.Resources();
        const fontDict = resources?.lookup(PDFName.of("Font"));
        if (!(fontDict instanceof PDFDict)) continue;
        for (const [, ref] of fontDict.entries()) {
          const font = document.context.lookup(ref);
          if (font instanceof PDFDict) names.add(String(font.get(PDFName.of("BaseFont")) ?? ""));
        }
      }
      const embedded = [...names].join(" ");
      expect(embedded).toMatch(/DigitalKhatt/i);
      expect(embedded).toMatch(/NotoNaskh/i);
    } finally {
      await browser.close();
    }
  }, 60000);
});

describe("direct print and export use the same page metrics", () => {
  it("print CSS locks the editor line box instead of the looser fallback", () => {
    const css = documentPrintCss(210, 297, 25.4, 25.4);
    expect(css).toContain("font-size: var(--qalam-body-size, 12pt) !important");
    expect(css).toContain("line-height: var(--qalam-line-height, 1.5) !important");
    expect(css).toContain("margin-block-end: var(--qalam-paragraph-after, 6pt) !important");
    expect(css).toContain("padding-left: 0 !important");
    expect(css).toContain("padding-right: 0 !important");
  });

  it("a multi-page Urdu document has the same page count in print CSS and export ink", async () => {
    expect(CHROME, "Chrome is required").toBeTruthy();
    const settings = defaultDocumentSettings();
    const paragraph = "تحقیق: یہ ایک علمی مضمون ہے، جس میں اردو اور English متن ایک ساتھ موجود ہے۔ مصنف نے کہا: یہ مواد اشاعت کے لئے تیار ہے۔";
    const source: DocNode = {
      type: "doc",
      content: Array.from({ length: 28 }, () => ({
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [{ type: "text", text: paragraph, marks: [{ type: "textStyle", attrs: { fontFamily: "Noto Nastaliq Urdu" } }] }],
      })),
    };
    const loaded = await fontsForDocument(source, "rtl", settings.typography);
    const html = buildPdfHtml(source, "rtl", loaded.fonts, settings.typography);
    expect(html.fontFallbacks).toEqual([]);
    const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal", customMargins: settings.page.margins });
    const physical = resolvePhysicalMargins(layout.margins, "rtl");
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.setContent(html.html, { waitUntil: "load" });
      const ink = await paginatePdfInk(page, layout.contentWidthMm, layout.heightMm - layout.margins.topMm - layout.margins.bottomMm, physical.leftMm, physical.rightMm);
      const exported = await page.pdf({
        width: `${layout.widthMm}mm`,
        height: `${layout.heightMm}mm`,
        printBackground: true,
        margin: { top: `${layout.margins.topMm}mm`, bottom: `${layout.margins.bottomMm}mm`, left: `${physical.leftMm}mm`, right: `${physical.rightMm}mm` },
      });
      const exportPages = (await PDFDocument.load(exported)).getPageCount();
      const printHtml = (lineHeight: string, padding: string) => `<!DOCTYPE html><html dir="rtl"><head><style>
        ${documentPrintCss(layout.widthMm, layout.heightMm, layout.margins.topMm, layout.margins.bottomMm)}
        @font-face{font-family:"Noto Nastaliq Urdu";src:url("data:font/woff2;base64,${loaded.fonts.faces.find(face => face.familyName === "Noto Nastaliq Urdu")!.regularSources[0]}") format("woff2");}
        body{margin:0}
        [data-studio-print-page]{width:${layout.widthMm}mm;box-sizing:border-box;padding:0 ${physical.rightMm}mm 0 ${physical.leftMm}mm}
      </style></head><body>
        <div data-studio-print-page style="--qalam-body-size:${settings.typography.bodyFontSizePt}pt;--qalam-line-height:${lineHeight};--qalam-paragraph-before:0pt;--qalam-paragraph-after:${settings.typography.paragraphAfterPt}pt">
          <div class="ProseMirror" dir="rtl" style="${padding}">
            ${source.content!.map(node => `<p dir="rtl" style="font-family:'Noto Nastaliq Urdu'">${node.content![0].text}</p>`).join("")}
          </div>
        </div>
      </body></html>`;
      const countPdf = async (markup: string) => {
        const printPage = await browser.newPage();
        await printPage.emulateMediaType("print");
        await printPage.setContent(markup, { waitUntil: "load" });
        const lineHeight = await printPage.$eval(".ProseMirror", element => getComputedStyle(element).lineHeight);
        const printed = await printPage.pdf({ preferCSSPageSize: true, printBackground: true });
        await printPage.close();
        return { pages: (await PDFDocument.load(printed)).getPageCount(), lineHeight };
      };
      const locked = await countPdf(printHtml(String(settings.typography.lineHeight), "padding:0"));
      const unlocked = await countPdf(printHtml("1.9", "padding:0"));
      expect(exportPages).toBe(ink.pages);
      expect(parseFloat(locked.lineHeight)).toBeLessThan(parseFloat(unlocked.lineHeight));
      expect(Math.abs(locked.pages - exportPages)).toBeLessThanOrEqual(1);
    } finally {
      await browser.close();
    }
  }, 90000);
});
