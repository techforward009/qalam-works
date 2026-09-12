import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { NextRequest } from "next/server";
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings, FONT_SIZE_OPTIONS_PT, LINE_HEIGHT_OPTIONS } from "../app/tools/document-studio/utils/documentSettings";
import { resolvePageLayout } from "../app/tools/document-studio/utils/pageLayout";

// Opt-in real browser test: only the browser executable changes on Windows.
// The route still loads its fonts, builds HTML, checks it, prints, and returns final bytes.
describe.runIf(Boolean(process.env.QALAM_PDF_CHROMIUM))("actual Document Studio PDF pipeline", () => {
  const output = path.join(os.tmpdir(), "qalam-real-pdf-validation");
  const launch = puppeteer.launch.bind(puppeteer);
  let currentCase = "baseline";
  let browserLaunchCount = 0;
  let screenshotCount = 0;
  beforeAll(() => {
    mkdirSync(output, { recursive: true });
    vi.spyOn(chromium, "executablePath").mockResolvedValue(process.env.QALAM_PDF_CHROMIUM!);
    vi.spyOn(puppeteer, "launch").mockImplementation(async options => {
      browserLaunchCount++;
      const browser = await launch({ ...options, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      console.log("PDF browser:", await browser.version());
      writeFileSync(path.join(output, "browser-version.txt"), await browser.version());
      const newPage = browser.newPage.bind(browser);
      vi.spyOn(browser, "newPage").mockImplementation(async () => {
        const page = await newPage();
        const screenshot = page.screenshot.bind(page);
        vi.spyOn(page, "screenshot").mockImplementation(async options => {
          screenshotCount++;
          return screenshot(options);
        });
        const print = page.pdf.bind(page);
        vi.spyOn(page, "pdf").mockImplementation(async options => {
          const widthMm = parseFloat(String(options?.width ?? 210));
          const leftMm = parseFloat(String(options?.margin?.left ?? 0));
          const rightMm = parseFloat(String(options?.margin?.right ?? 0));
          await page.setViewport({ width: Math.round((widthMm - leftMm - rightMm) * 96 / 25.4), height: 900 });
          await page.evaluate(() => document.fonts.ready);
          writeFileSync(path.join(output, `${currentCase}.html`), await page.content());
          writeFileSync(path.join(output, `${currentCase}-options.json`), JSON.stringify(options, null, 2));
          await page.screenshot({ path: path.join(output, `${currentCase}-browser.png`), fullPage: true });
          writeFileSync(path.join(output, `${currentCase}-layout.json`), JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll("p,h1,h2,h3,h4,blockquote")).map(element => {
            const bounds = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return { text: element.textContent, top: bounds.top, height: bounds.height, width: bounds.width, font: style.fontFamily, size: style.fontSize, lineHeight: style.lineHeight, direction: style.direction, alignment: style.textAlign };
          })), null, 2));
          writeFileSync(path.join(output, `${currentCase}-print-lines.json`), JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("[data-pdf-ink-page]")).map(section => Array.from(section.querySelectorAll<HTMLElement>("[data-pdf-ink-line]")).map(line => {
            const bounds = line.getBoundingClientRect();
             const style = getComputedStyle(line);
             return { id: Number(line.dataset.pdfInkLine), text: line.textContent ?? "", measuredInk: JSON.parse(line.dataset.pdfInkBounds ?? "null"), finalBounds: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom }, css: { left: parseFloat(style.left), width: parseFloat(style.width), transform: style.transform, alignment: style.textAlign, direction: style.direction } };
          }))), null, 2));
          writeFileSync(path.join(output, `${currentCase}-page-structure.json`), JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("[data-pdf-ink-page]")).map(section => {
            const page = section.getBoundingClientRect();
             const lines = Array.from(section.querySelectorAll<HTMLElement>("[data-pdf-ink-line]")).map(line => {
               const bounds = line.getBoundingClientRect();
               const ink = JSON.parse(line.dataset.pdfInkBounds ?? "null") as { left:number;right:number;top:number;bottom:number } | null;
               return { id: Number(line.dataset.pdfInkLine), page: Number(section.dataset.pdfInkPage), contained: Boolean(ink) && ink!.left >= 0 && ink!.right <= page.width && ink!.top >= 0 && ink!.bottom <= page.height, box: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom } };
             });
             return { page: Number(section.dataset.pdfInkPage), bounds: { left: page.left, top: page.top, right: page.right, bottom: page.bottom }, lines,
               semantic: {
                 nestedOl: Boolean(section.querySelector("ul > li > ol > li")),
                 nestedUl: Boolean(section.querySelector("ol > li > ul > li")),
                 ordered: Array.from(section.querySelectorAll<HTMLOListElement>("ol")).map(list => ({ start: list.start, values: Array.from(list.children).filter(child => child.tagName === "LI").map(item => Number(item.getAttribute("value"))) })),
                 multiParagraphItem: Boolean(Array.from(section.querySelectorAll("li")).find(item => item.querySelectorAll(":scope > [data-pdf-ink-line]").length > 1)),
               } };
          })), null, 2));
          return print(options);
        });
        return page;
      });
      return browser;
    });
  });
  afterAll(() => vi.restoreAllMocks());

  it.each(["Noto Nastaliq Urdu", "Jameel Noori Nastaleeq"])("embeds Nastaliq in final PDF with %s", async family => {
    currentCase = family.startsWith("Jameel") ? "jameel-fallback" : "noto-primary";
    const settings = defaultDocumentSettings();
    settings.headerFooter.headerEnabled = false;
    settings.headerFooter.footerEnabled = false;
    const paragraph = (text: string, dir: "rtl" | "ltr") => ({ type: "paragraph", attrs: { dir }, content: [
      { type: "text", text, marks: [{ type: "textStyle", attrs: { fontFamily: dir === "rtl" ? family : "Inter" } }] },
    ] });
    const doc = { type: "doc", content: [
      paragraph("الحمدللہ آج ہم خیریت سے کراچی پہنچ گئے ہیں۔", "rtl"),
      paragraph("This is Karachi. We are testing Qalam Works.", "ltr"),
    ] };
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "rtl", settings }),
    }));
    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const stem = family.startsWith("Jameel") ? "jameel-fallback" : "noto-primary";
    writeFileSync(path.join(output, `${stem}.pdf`), bytes);
    writeFileSync(path.join(output, `${stem}-headers.json`), JSON.stringify(Object.fromEntries(response.headers), null, 2));
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const page = pdf.getPage(0);
    const fonts = page.node.Resources()!.lookup(PDFName.of("Font"), PDFDict);
    const names = fonts.entries().map(([, value]) => pdf.context.lookup(value, PDFDict).get(PDFName.of("BaseFont"))?.toString());
    expect(names.some(name => name?.includes("NotoNastaliqUrdu"))).toBe(true);
    expect(names.some(name => name?.includes("OpenSans"))).toBe(false);
    console.log(stem, { dimensions: page.getSize(), names, headers: Object.fromEntries([...response.headers].filter(([name]) => name.startsWith("x-pdf"))), output });
  }, 120000);

  it.each([28, 29, 30, 40])("measures pagination of %i single-line mixed paragraphs", async count => {
    currentCase = `geometry-${count}`;
    const settings = defaultDocumentSettings();
    settings.headerFooter.headerEnabled = false;
    settings.headerFooter.footerEnabled = false;
    const doc = { type: "doc", content: Array.from({ length: count }, (_, i) => ({
      type: "paragraph", attrs: { dir: i % 2 ? "ltr" : "rtl" }, content: [{ type: "text", text: i % 2
        ? `Row ${String(i + 1).padStart(3, "0")}: This is Karachi. We are testing Qalam Works.`
        : `قطار ${String(i + 1).padStart(3, "0")}: الحمدللہ آج ہم خیریت سے کراچی پہنچ گئے ہیں۔` }],
    })) };
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "rtl", settings }),
    }));
    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    writeFileSync(path.join(output, `${currentCase}.pdf`), bytes);
    const pdf = await PDFDocument.load(bytes);
    // 29 baselines plus complete Nastaliq ink exceed this printable height;
    // native line-box pagination fitted them by clipping the first/last ink.
    expect(pdf.getPageCount()).toBe(count <= 28 ? 1 : 2);
    // Chromium quantizes physical paper dimensions to device pixels (< 1 pt).
    expect(Math.abs(pdf.getPage(0).getWidth() - 210 / 25.4 * 72)).toBeLessThan(1);
    writeFileSync(path.join(output, `${currentCase}-pages.json`), JSON.stringify(pdf.getPages().map(page => page.getSize())));
  }, 120000);

  it("preserves structured blocks, hard breaks, blank spacing, and marked inline runs", async () => {
    currentCase = "structured-content";
    const settings = defaultDocumentSettings();
    settings.headerFooter.headerEnabled = false;
    settings.headerFooter.footerEnabled = false;
    const paragraph = (content: object[]) => ({ type: "paragraph", attrs: { dir: "rtl" }, content });
    const doc = { type: "doc", content: [
      { type: "bulletList", content: [{ type: "listItem", content: [
        paragraph([{ type: "text", text: "پہلا نکتہ: " }, { type: "text", text: "Qalam", marks: [{ type: "bold" }, { type: "highlight", attrs: { color: "#FEF3C7" } }, { type: "link", attrs: { href: "https://qalamworks.com" } }] }]),
        paragraph([{ type: "text", text: "اسی آئٹم کا دوسرا پیراگراف۔" }]),
        { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", attrs: { value: 3 }, content: [
          paragraph([{ type: "text", text: "Nested 3: اندرونی متن" }]),
          { type: "bulletList", content: [{ type: "listItem", content: [paragraph([{ type: "text", text: "گہرا ذیلی نکتہ" }])] }] },
        ] }] },
      ] }] },
      paragraph([{ type: "text", text: "سطر اول" }, { type: "hardBreak" }, { type: "hardBreak" }, { type: "text", text: "سطر سوم" }]),
      paragraph([]),
      paragraph([{ type: "text", text: "چھوٹا " }, { type: "text", text: "بڑا", marks: [{ type: "italic" }, { type: "textStyle", attrs: { fontSize: "28pt" } }] }, { type: "text", text: " اختتام!؟" }]),
      paragraph([{ type: "text", text: Array(30).fill("طویل پیراگراف with mixed content؛").join(" ") }]),
    ] };
    writeFileSync(path.join(output, `${currentCase}-request.json`), JSON.stringify({ doc, dir: "rtl", settings }));
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "rtl", settings }) }));
    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    writeFileSync(path.join(output, `${currentCase}.pdf`), bytes);
    const html = await import("node:fs").then(fs => fs.readFileSync(path.join(output, `${currentCase}.html`), "utf8"));
    expect(html).toContain('href="https://qalamworks.com"');
    expect(html).toContain("background-color:#FEF3C7");
    expect(html).toContain("font-size:28pt");
    expect((html.match(/display: list-item/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((html.match(/data-pdf-ink-line=/g) ?? []).length).toBeGreaterThan(5);
    expect((html.match(/data-pdf-preserved-break="hard-break"/g) ?? []).length).toBe(2);
    expect((html.match(/data-pdf-blank-paragraph="true"/g) ?? []).length).toBe(1);
    expect((html.match(/data-pdf-preserved-break="blank-paragraph"/g) ?? []).length).toBe(1);
    const pages = JSON.parse(await import("node:fs").then(fs => fs.readFileSync(path.join(output, `${currentCase}-print-lines.json`), "utf8"))) as Array<Array<{ id: number; text: string; finalBounds: { top: number; bottom: number } }>>;
    const ids = pages.flat().map(line => line.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(pages.flat().map(line => line.text).join("")).toContain("پہلا نکتہ: Qalamاسی آئٹم کا دوسرا پیراگراف۔Nested 3: اندرونی متنگہرا ذیلی نکتہسطر اولسطر سومچھوٹا بڑا اختتام!؟");
    const hardBreakLines = pages.flat().filter(line => line.text.includes("سطر "));
    expect(hardBreakLines.map(line => line.text)).toEqual(["سطر اول", "سطر سوم"]);
    expect(hardBreakLines[1].finalBounds.top - hardBreakLines[0].finalBounds.top).toBeGreaterThan(30);
    const structure = JSON.parse(await import("node:fs").then(fs => fs.readFileSync(path.join(output, `${currentCase}-page-structure.json`), "utf8"))) as Array<{ lines: Array<{ contained: boolean }>; semantic:{nestedOl:boolean;nestedUl:boolean;ordered:Array<{start:number;values:number[]}>;multiParagraphItem:boolean} }>;
    expect(structure.every(page => page.lines.every(line => line.contained))).toBe(true);
    expect(structure.some(page => page.semantic.nestedOl)).toBe(true);
    expect(structure.some(page => page.semantic.nestedUl)).toBe(true);
    expect(structure.some(page => page.semantic.ordered.some(list => list.start === 3 && list.values.includes(3)))).toBe(true);
    expect(structure.some(page => page.semantic.multiParagraphItem)).toBe(true);
  }, 120000);

  it("fails safely when an unbreakable run cannot fit the printable width", async () => {
    currentCase = "unbreakable-overflow";
    const settings = defaultDocumentSettings();
    settings.headerFooter.headerEnabled = false;
    settings.headerFooter.footerEnabled = false;
    const doc = { type: "doc", content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "W".repeat(500) }] }] };
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "ltr", settings }) }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("printable horizontal boundary") });
  }, 120000);

  it("uses the same translation for final paint and diagnostics across alignment and direction", async () => {
    currentCase = "alignment-translation";
    const settings = defaultDocumentSettings(); settings.headerFooter.headerEnabled = false; settings.headerFooter.footerEnabled = false;
    const cases = [
      ["ltr-left", "ltr", "left", "ffff alignment edge"], ["ltr-right", "ltr", "right", "alignment edge ffff"],
      ["rtl-right", "rtl", "right", "کنارہ سیدھ آزمائش"], ["rtl-left", "rtl", "left", "کنارہ سیدھ آزمائش"],
      ["ltr-center", "ltr", "center", "ffff centered alignment"],
    ] as const;
    const doc = { type: "doc", content: cases.map(([id, dir, textAlign, text]) => ({ type: "paragraph", attrs: { dir, textAlign }, content: [{ type: "text", text: `${id}: ${text}`, marks: [{ type: "italic" }] }] })) };
    const requestBody = { doc, dir: "ltr", settings } as const;
    writeFileSync(path.join(output, `${currentCase}-request.json`), JSON.stringify(requestBody));
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) }));
    expect(response.status).toBe(200); writeFileSync(path.join(output, `${currentCase}.pdf`), new Uint8Array(await response.arrayBuffer()));
    const pages = JSON.parse(await import("node:fs").then(fs => fs.readFileSync(path.join(output, `${currentCase}-print-lines.json`), "utf8"))) as Array<Array<{text:string;measuredInk:{left:number;right:number;horizontalShift:number};finalBounds:{left:number;right:number};css:{left:number;width:number;alignment:string;direction:string}}>>;
    const lines = pages.flat();
    expect(lines).toHaveLength(cases.length);
    for (const line of lines) {
      expect(line.finalBounds.left - line.css.left).toBeCloseTo(line.measuredInk.horizontalShift, 2);
      expect(line.finalBounds.right - line.finalBounds.left).toBeCloseTo(line.css.width, 2);
      expect(line.measuredInk.left).toBeGreaterThanOrEqual(1);
      expect(line.measuredInk.right).toBeLessThanOrEqual(parseFloat(String(response.headers.get("x-pdf-printable-width") ?? 1e9)));
      const source = cases.find(item => line.text.startsWith(item[0]))!;
      expect(line.css.direction).toBe(source[1]); expect(line.css.alignment).toBe(source[2]);
    }
    expect(lines.some(line => line.measuredInk.horizontalShift < 0)).toBe(true);
    expect(lines.some(line => line.measuredInk.horizontalShift > 0)).toBe(true);
    expect(new Set(lines.map(line => line.css.width.toFixed(3))).size).toBe(1);
  }, 120000);

  it("bounds long-document measurement before raster work", async () => {
    const request = async (name: string, count: number, size = 12) => {
      currentCase = name; const settings = defaultDocumentSettings(); settings.headerFooter.headerEnabled = false; settings.headerFooter.footerEnabled = false; settings.typography.bodyFontSizePt = size;
      const doc = { type: "doc", content: Array.from({ length: count }, (_, index) => ({ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: `Performance row ${index + 1}: deterministic layout content.` }] })) };
      const sourceSize = Buffer.byteLength(JSON.stringify(doc)); const started = Date.now();
      const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "ltr", settings }) }));
      return { response, sourceSize, elapsed: Date.now() - started };
    };
    const supported = await request("performance-supported", 300);
    expect(supported.response.status).toBe(200);
    expect(Number(supported.response.headers.get("x-pdf-visual-lines"))).toBe(300);
    expect(Number(supported.response.headers.get("x-pdf-staging-height"))).toBeLessThanOrEqual(40000);
    expect(Number(supported.response.headers.get("x-pdf-measurement-screenshots"))).toBeGreaterThan(0);
    const metrics = { sourceBytes: supported.sourceSize, visualLines: supported.response.headers.get("x-pdf-visual-lines"), stagingHeight: supported.response.headers.get("x-pdf-staging-height"), screenshots: supported.response.headers.get("x-pdf-measurement-screenshots"), measurementMs: supported.response.headers.get("x-pdf-measurement-ms"), exportMs: supported.response.headers.get("x-pdf-export-ms"), observedRouteMs: supported.elapsed, rss: process.memoryUsage().rss };
    console.log("supported-performance", metrics); writeFileSync(path.join(output, "performance-metrics.json"), JSON.stringify(metrics, null, 2));
    await supported.response.arrayBuffer();
    const tooMany = await request("performance-line-guard", 301);
    expect(tooMany.response.status).toBe(500);
    await expect(tooMany.response.json()).resolves.toMatchObject({ error: expect.stringContaining("300 visual-line limit") });
    const tooTall = await request("performance-height-guard", 300, 72);
    expect(tooTall.response.status).toBe(500);
    await expect(tooTall.response.json()).resolves.toMatchObject({ error: expect.stringContaining("40000px staging limit") });
  }, 240000);

  it("rejects pathological source complexity before browser or screenshot work", async () => {
    const request = async (name: string, text: string) => {
      currentCase = name;
      const settings = defaultDocumentSettings();
      const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
      const launchesBefore = browserLaunchCount, screenshotsBefore = screenshotCount;
      const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "ltr", settings }) }));
      expect(response.status).toBe(500);
      expect(browserLaunchCount).toBe(launchesBefore);
      expect(screenshotCount).toBe(screenshotsBefore);
      return response;
    };
    currentCase = "source-byte-guard";
    const byteHeavyDoc = { type: "doc", content: Array.from({ length: 3 }, () => ({ type: "paragraph", content: [{ type: "text", text: "ی".repeat(18_000) }] })) };
    const byteLaunchesBefore = browserLaunchCount, byteScreenshotsBefore = screenshotCount;
    const byteResponse = await POST(new NextRequest("http://localhost/api/export-pdf", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc: byteHeavyDoc, dir: "rtl", settings: defaultDocumentSettings() }),
    }));
    expect(byteResponse.status).toBe(500);
    await expect(byteResponse.json()).resolves.toMatchObject({ error: expect.stringContaining("98304-byte limit") });
    expect(browserLaunchCount).toBe(byteLaunchesBefore);
    expect(screenshotCount).toBe(byteScreenshotsBefore);
    await expect((await request("source-single-node-guard", "x".repeat(20_001))).json())
      .resolves.toMatchObject({ error: expect.stringContaining("20000 code-point single-text-node limit") });
    const depth = 3_000;
    const nestedDoc = `${'{"type":"container","content":['.repeat(depth)}{"type":"text","text":"x"}${']}'.repeat(depth)}`;
    const launchesBefore = browserLaunchCount, screenshotsBefore = screenshotCount;
    const nestedResponse = await POST(new NextRequest("http://localhost/api/export-pdf", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: `{"doc":${nestedDoc},"dir":"ltr"}`,
    }));
    expect(nestedResponse.status).toBe(500);
    await expect(nestedResponse.json()).resolves.toMatchObject({ error: expect.stringContaining("2500-node limit") });
    expect(browserLaunchCount).toBe(launchesBefore);
    expect(screenshotCount).toBe(screenshotsBefore);
    currentCase = "source-wide-node-guard";
    const wideDoc = { type: "doc", content: Array.from({ length: 200_000 }, () => ({ type: "paragraph" })) };
    const wideLaunchesBefore = browserLaunchCount, wideScreenshotsBefore = screenshotCount;
    const wideResponse = await POST(new NextRequest("http://localhost/api/export-pdf", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc: wideDoc, dir: "ltr" }),
    }));
    expect(wideResponse.status).toBe(500);
    await expect(wideResponse.json()).resolves.toMatchObject({ error: expect.stringContaining("2500-node limit") });
    expect(browserLaunchCount).toBe(wideLaunchesBefore);
    expect(screenshotCount).toBe(wideScreenshotsBefore);
  });

  it.runIf(process.env.QALAM_PDF_CHARACTERIZE === "1").each([50, 100, 150, 200, 250, 300, 400])("characterizes route performance at %i visual lines", async count => {
    currentCase = `performance-characterization-${count}`;
    const settings = defaultDocumentSettings();
    settings.headerFooter.headerEnabled = false; settings.headerFooter.footerEnabled = false;
    const doc = { type: "doc", content: Array.from({ length: count }, (_, index) => ({
      type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: `Performance row ${index + 1}: deterministic layout content.` }],
    })) };
    const sourceBytes = Buffer.byteLength(JSON.stringify(doc));
    const rssBefore = process.memoryUsage().rss, started = Date.now();
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "ltr", settings }),
    }));
    const observedTestMs = Date.now() - started, rssAfter = process.memoryUsage().rss;
    const result = {
      requestedLines: count, sourceBytes, httpStatus: response.status,
      visualLines: Number(response.headers.get("x-pdf-visual-lines")),
      stagingHeight: Number(response.headers.get("x-pdf-staging-height")),
      screenshots: Number(response.headers.get("x-pdf-measurement-screenshots")),
      measurementMs: Number(response.headers.get("x-pdf-measurement-ms")),
      exportMs: Number(response.headers.get("x-pdf-export-ms")), observedTestMs,
      rssBefore, rssAfter, rssPeakObserved: Math.max(rssBefore, rssAfter), guardTriggered: response.status !== 200,
    };
    writeFileSync(path.join(output, `${currentCase}.json`), JSON.stringify(result, null, 2));
    console.log("performance-characterization", result);
    expect(response.status).toBe(200); await response.arrayBuffer();
    expect(result.visualLines).toBe(count); expect(result.guardTriggered).toBe(false);
  }, 120000);

  it("keeps loaded-font wrap allowance local to its source block", async () => {
    currentCase = "local-wrap-allowance";
    const settings = defaultDocumentSettings(); settings.headerFooter.headerEnabled = false; settings.headerFooter.footerEnabled = false;
    const ordinary = "Unaffected neighboring paragraph wraps identically before and after the large heading.";
    const doc = { type: "doc", content: [
      { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: ordinary }] },
      { type: "heading", attrs: { dir: "rtl", level: 1 }, content: [{ type: "text", text: "بہت بڑی نستعلیق سرخی", marks: [{ type: "textStyle", attrs: { fontSize: "72pt" } }] }] },
      { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: ordinary }] },
    ] };
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "ltr", settings }) }));
    expect(response.status).toBe(200); await response.arrayBuffer();
    const html = await import("node:fs").then(fs => fs.readFileSync(path.join(output, `${currentCase}.html`), "utf8"));
    const counts = [0, 2].map(block => (html.match(new RegExp(`data-pdf-source-block="${block}"`, "g")) ?? []).length);
    expect(counts[0]).toBeGreaterThan(0); expect(counts[0]).toBe(counts[1]);
  }, 120000);

  const matrix = FONT_SIZE_OPTIONS_PT.flatMap((size, index) => [false, true].map(jameel => ({ size, index, jameel })));
  it.each(matrix)("exports size $size, Jameel fallback $jameel, with styles and wrapped Urdu", async ({ size, index, jameel }) => {
    currentCase = `matrix-${size}-${jameel ? "fallback" : "noto"}`;
    const settings = defaultDocumentSettings();
    settings.typography.bodyFontSizePt = size;
    settings.typography.lineHeight = LINE_HEIGHT_OPTIONS[index % LINE_HEIGHT_OPTIONS.length];
    settings.typography.defaultRtlFontId = jameel ? "jameel-noori-nastaleeq" : "noto-nastaliq-urdu";
    settings.page.size = (["a4", "a5", "letter"] as const)[index % 3];
    settings.page.orientation = index % 2 ? "landscape" : "portrait";
    settings.page.margins = { preset: (["normal", "narrow", "wide", "custom"] as const)[index % 4], topMm: 17, bottomMm: 23, startMm: 19, endMm: 29 };
    const urdu = "الحمدللہ آج ہم خیریت سے کراچی پہنچ گئے ہیں۔";
    const paragraph = (text: string, attrs = {}) => ({ type: "paragraph", attrs: { dir: "rtl", directionMode: "auto", ...attrs }, content: [{ type: "text", text }] });
    const doc = { type: "doc", content: [
      paragraph(urdu, { blockStyle: "title" }),
      paragraph(urdu, { blockStyle: "subtitle" }),
      ...[1, 2, 3, 4].map(level => ({ ...paragraph(urdu), type: "heading", attrs: { dir: "rtl", level } })),
      paragraph(Array(4).fill(urdu).join(" ")),
      paragraph("یہ عبارت Document Studio کی formatting اور export testing کے لیے استعمال کی جا رہی ہے۔"),
      paragraph("2026 میں کراچی نے ایک نئی صبح کا استقبال کیا۔"),
      { type: "blockquote", content: [paragraph(urdu)] },
      paragraph(urdu, { blockStyle: "caption" }),
      paragraph("This is Karachi. We are testing Qalam Works.", { dir: "ltr" }),
    ] };
    writeFileSync(path.join(output, `${currentCase}-request.json`), JSON.stringify({ doc, dir: "rtl", settings }));
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "rtl", settings }) }));
    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    writeFileSync(path.join(output, `${currentCase}.pdf`), bytes);
    const pdf = await PDFDocument.load(bytes);
    const layout = resolvePageLayout({ size: settings.page.size, orientation: settings.page.orientation, marginPreset: settings.page.margins.preset, customMargins: settings.page.margins });
    for (const page of pdf.getPages()) {
      expect(Math.abs(page.getWidth() - layout.widthMm / 25.4 * 72)).toBeLessThan(1);
      expect(Math.abs(page.getHeight() - layout.heightMm / 25.4 * 72)).toBeLessThan(1);
    }
    const names = pdf.getPages().flatMap(page => page.node.Resources()!.lookup(PDFName.of("Font"), PDFDict).entries().map(([, value]) => pdf.context.lookup(value, PDFDict).get(PDFName.of("BaseFont"))?.toString()));
    expect(names.some(name => name?.includes("NotoNastaliqUrdu"))).toBe(true);
    writeFileSync(path.join(output, `${currentCase}-fonts.json`), JSON.stringify(names));
    if (size === 72 && !jameel && process.env.QALAM_PDF_AUDIT_PYTHON && process.env.QALAM_PDF_POPPLER) {
      // Real final-byte regression: PDFium and Poppler compare the printed page
      // with the identical vectors after only Chromium's page clip is removed.
      execFileSync(process.env.QALAM_PDF_AUDIT_PYTHON, [
        path.join(process.cwd(), "tests", "pdfInkPixelAudit.py"),
        path.join(output, `${currentCase}.pdf`),
        path.join(output, `${currentCase}-request.json`),
        process.env.QALAM_PDF_POPPLER,
        path.join(output, `${currentCase}-print-lines.json`),
      ], { stdio: "inherit", env: { ...process.env, PYTHONUTF8: "1" } });
    }
  }, 120000);
});
