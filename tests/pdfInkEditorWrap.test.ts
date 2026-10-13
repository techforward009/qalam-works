import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import puppeteer from "puppeteer-core";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { fontsForDocument } from "../app/tools/document-studio/utils/pdfDocumentFonts";
import { paginatePdfInk } from "../app/tools/document-studio/utils/pdfInkPagination";
import { resolvePageLayout, resolvePhysicalMargins } from "../app/tools/document-studio/utils/pageLayout";

const CHROME = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1234/chrome-linux64/chrome"].find(
  (path): path is string => typeof path === "string" && existsSync(path),
);

const sentence = "قلم ورکس میں نستعلیق سطر اپنی اصل چوڑائی پر ٹوٹنی چاہیے اور حاشیے میں لٹکا ہوا نقش صفحے کو نیچے نہیں دھکیلتا۔ ";

describe("PDF ink keeps the editor wrap", () => {
  it("does not rewrap a justified Nastaliq paragraph to reserve glyph overhang", async () => {
    if (!CHROME) return;
    const settings = defaultDocumentSettings();
    const doc: DocNode = {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "rtl", textAlign: "justify", lineHeight: 1.75 },
        content: [{
          type: "text",
          text: sentence.repeat(8),
          marks: [{ type: "textStyle", attrs: { fontFamily: "Noto Nastaliq Urdu", fontSize: "16pt" } }],
        }],
      }],
    };
    const loaded = await fontsForDocument(doc, "rtl", settings.typography);
    const html = buildPdfHtml(doc, "rtl", loaded.fonts, settings.typography).html;
    const layout = resolvePageLayout({
      size: "a4",
      orientation: "portrait",
      marginPreset: "normal",
      customMargins: settings.page.margins,
    });
    const physical = resolvePhysicalMargins(layout.margins, "rtl");
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--font-render-hinting=none"] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const flow = await page.evaluate((width) => {
        document.body.style.width = `${width}px`;
        const lines: string[] = [];
        const range = document.createRange();
        let row: { y: number } | null = null;
        for (const block of Array.from(document.querySelectorAll("p"))) {
          const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.nodeValue ?? "";
            for (let i = 0; i < text.length; i++) {
              range.setStart(node, i);
              range.setEnd(node, i + 1);
              const rect = range.getClientRects()[0];
              const measured = rect ? (rect.top + rect.bottom) / 2 : null;
              const y: number | null = measured ?? (row ? row.y : null);
              if (y == null) continue;
              if (!row || Math.abs(row.y - y) > 7) {
                row = { y };
                lines.push("");
              }
              lines[lines.length - 1] += text[i];
            }
          }
        }
        return lines.map(item => item.replace(/\s+/g, "").replace(/\p{Cf}/gu, "")).filter(Boolean);
      }, layout.contentWidthMm * 96 / 25.4);
      const ink = await paginatePdfInk(
        page,
        layout.contentWidthMm,
        layout.heightMm - layout.margins.topMm - layout.margins.bottomMm,
        physical.leftMm,
        physical.rightMm,
        layout.margins.topMm,
      );
      const pdfLines = await page.evaluate(() => Array.from(document.querySelectorAll("[data-pdf-ink-line]")).map(node => (node.textContent ?? "").replace(/\s+/g, "").replace(/\p{Cf}/gu, "")).filter(Boolean));
      expect(flow.length).toBeGreaterThan(2);
      expect(pdfLines).toEqual(flow);
      expect(ink.pages).toBeGreaterThan(0);
    } finally {
      await browser.close();
    }
  }, 60000);
});
