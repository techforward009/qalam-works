import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { defaultDocumentSettings, type DocumentStudioSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { fontsForDocument } from "../app/tools/document-studio/utils/pdfDocumentFonts";
import { buildPrintDocumentHtml, paintedFontMismatch, readPaintedPdfFonts, requestedFontPaintMismatch } from "../app/tools/document-studio/utils/printDocumentHtml";

const CHROME = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1234/chrome-linux64/chrome"].find(
  (path): path is string => typeof path === "string" && existsSync(path),
);

function paragraph(text: string, family: string, fontSize: string, extra: Record<string, unknown> = {}): DocNode {
  return {
    type: "paragraph",
    attrs: { dir: "rtl", ...extra },
    content: [{ type: "text", text, marks: [{ type: "textStyle", attrs: { fontFamily: family, fontSize } }] }],
  };
}

describe("print-based PDF layout", () => {
  it("reuses the Direct Print page rules and does not call the ink engine", () => {
    const route = readFileSync("app/api/export-pdf/route.ts", "utf8");
    expect(route).toContain("buildPrintDocumentHtml");
    expect(route).toContain("preferCSSPageSize: true");
    expect(route).not.toContain("paginatePdfInk");
    const settings = defaultDocumentSettings();
    const doc: DocNode = { type: "doc", content: [paragraph("مستفاد", "Gulzar", "24pt")] };
    const html = buildPrintDocumentHtml(doc, "rtl", { faces: [] }, settings).html;
    expect(html).toContain('data-studio-print-page="true"');
    expect(html).toContain("@page { size: 210mm 297mm; margin: 25.4mm 0 25.4mm 0; }");
    expect(html).toContain("margin-block-end: var(--qalam-paragraph-after, 6pt) !important");
    expect(html).not.toMatch(/body \{[^}]*overflow:\s*hidden/);
  });

  it("rejects a selected face that is missing or paints as a different family", () => {
    expect(paintedFontMismatch("Alvi Nastaleeq", [["Jameel Noori Nastaleeq"]])).toMatch(/not substituted/);
    expect(paintedFontMismatch("Alvi Nastaleeq", [["Alvi Nastaleeq"], ["Jameel Noori Nastaleeq"]])).toMatch(/not substituted/);
    expect(paintedFontMismatch("Alvi Nastaleeq", [["Alvi Nastaleeq"]])).toBeNull();
    expect(paintedFontMismatch("Digital Khatt Indo-Pak", [["DigitalKhattIndoPak"]])).toBeNull();
    expect(paintedFontMismatch("Gulzar", [])).toMatch(/no painted text/);
    expect(paintedFontMismatch("Alvi Nastaleeq", [[]])).toMatch(/no painted glyphs/);
    expect(requestedFontPaintMismatch(["Inter", "Noto Nastaliq Urdu"], {})).toBeNull();
    expect(requestedFontPaintMismatch(["Alvi Nastaleeq", "Inter"], { Inter: [] })).toMatch(/Alvi Nastaleeq/);
  });

  it("keeps image wrap, an explicit page break, and mixed script text", () => {
    const settings = defaultDocumentSettings();
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "data:image/png;base64,aaaa", alignment: "left", wrapMode: "wrap", width: 120 },
        },
        paragraph("اردو English", "Noto Nastaliq Urdu", "16pt"),
        { type: "pageBreak" },
      ],
    };
    const html = buildPrintDocumentHtml(doc, "rtl", { faces: [] }, settings).html;
    expect(html).toContain("image-wrap");
    expect(html).toContain("float:left");
    expect(html).toContain("qalam-page-break");
    expect(html).toContain("اردو");
    expect(html).toContain("English");
  });

  it("keeps an authored page break and the selected faces in native pagination", async () => {
    if (!CHROME) return;
    const settings: DocumentStudioSettings = {
      ...defaultDocumentSettings(),
      headerFooter: { ...defaultDocumentSettings().headerFooter, headerEnabled: false, footerEnabled: false },
    };
    const doc: DocNode = {
      type: "doc",
      content: [
        paragraph("مستفاد نکات", "Gulzar", "24pt"),
        paragraph("فریقوں", "Alvi Nastaleeq", "16pt"),
        paragraph("السلام علیک", "Amiri", "24pt"),
        { type: "pageBreak" },
        paragraph("حَدَّثَنَا إِذَا", "Digital Khatt Indo-Pak", "16pt", { lineHeight: 2, textAlign: "justify" }),
        paragraph("English beside اردو", "Noto Nastaliq Urdu", "16pt"),
      ],
    };
    const loaded = await fontsForDocument(doc, "rtl", settings.typography);
    const built = buildPrintDocumentHtml(doc, "rtl", loaded.fonts, settings);
    expect(built.fontFallbacks).toEqual([]);
    expect(built.html).toContain("font-family:'Alvi Nastaleeq'");
    expect(built.html).toContain("font-family:'Digital Khatt Indo-Pak'");
    expect(built.html).toContain("qalam-page-break");
    expect(built.html).toContain("English beside");
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--font-render-hinting=none"] });
    try {
      const page = await browser.newPage();
      await page.emulateMediaType("print");
      await page.setContent(built.html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const painted = await page.evaluate(() => {
        const read = (needle: string) => {
          const span = Array.from(document.querySelectorAll("span")).find((node) => node.textContent?.includes(needle));
          if (!span) return "";
          return getComputedStyle(span).fontFamily;
        };
        return { alvi: read("فریقوں"), khatt: read("حَدَّثَنَا"), amiri: read("السلام") };
      });
      expect(painted.alvi).toMatch(/Alvi/);
      expect(painted.khatt).toMatch(/Digital Khatt/);
      expect(painted.amiri).toMatch(/Amiri/);
      const runs = await readPaintedPdfFonts(page, ["Gulzar", "Alvi Nastaleeq", "Amiri", "Digital Khatt Indo-Pak"]);
      expect(requestedFontPaintMismatch(["Gulzar", "Alvi Nastaleeq", "Amiri", "Digital Khatt Indo-Pak"], runs)).toBeNull();
      expect(runs["Alvi Nastaleeq"]?.length).toBeGreaterThan(0);
      expect(runs["Digital Khatt Indo-Pak"]?.length).toBeGreaterThan(0);
      const bytes = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: "25.4mm", bottom: "25.4mm", left: "0mm", right: "0mm" },
      });
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
    } finally {
      await browser.close();
    }
  }, 60000);
});
