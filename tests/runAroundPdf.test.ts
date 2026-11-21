import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { PdfExportTestRequest } from "./helpers/pdfExportRequest";

const CHROME = [
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  join(homedir(), ".cache/ms-playwright/chromium-1234/chrome-linux64/chrome"),
].find(path => path && existsSync(path)) ?? "";
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WAAAAABJRU5ErkJggg==";
const PDF_PATH = "/tmp/qalam-run-around.pdf";
const story = `بِسم اللہ ${"سلام\u200cعلی ".repeat(140)}`;

const frames = [
  { id: "pic-left", kind: "picture-rect", page: 1, xMm: 58, yMm: 42, wMm: 34, hMm: 26, flip: false, text: "", runAround: true, runAroundLeftMm: 1, runAroundRightMm: 4, runAroundTopMm: 0.5, runAroundBottomMm: 1 },
  { id: "pic-right", kind: "picture-rect", page: 1, xMm: 128, yMm: 42, wMm: 32, hMm: 26, flip: false, text: "", runAround: true, runAroundLeftMm: 3, runAroundRightMm: 1, runAroundTopMm: 2, runAroundBottomMm: 0.4 },
  { id: "text-left", kind: "text", page: 1, xMm: 58, yMm: 90, wMm: 34, hMm: 22, flip: false, text: "بائیں خانہ", runAround: true, runAroundLeftMm: 2, runAroundRightMm: 2, runAroundTopMm: 1, runAroundBottomMm: 1 },
  { id: "text-right", kind: "text", page: 1, xMm: 126, yMm: 90, wMm: 34, hMm: 22, flip: false, text: "دائیں خانہ", runAround: true, runAroundLeftMm: 0.5, runAroundRightMm: 5, runAroundTopMm: 0.4, runAroundBottomMm: 2 },
];

type SideFlow = { left: boolean; right: boolean; overlap: number; lines: number; frameTop: number; frameHeight: number };

type InkRect = { page: number; left: number; right: number; top: number; bottom: number };

function measurePdfFlow() {
  const report: Record<string, SideFlow> = {};
  const ids = Array.from(new Set([
    "pic-left",
    "pic-right",
    "text-left",
    "text-right",
    "pic-page2",
    "text-page2",
    ...Array.from(document.querySelectorAll("[data-print-frame-id]"))
      .map(el => el.getAttribute("data-print-frame-id") ?? "")
      .filter(Boolean),
  ]));
  const inkRects: InkRect[] = [];
  const imageRects: InkRect[] = [];
  for (const img of document.querySelectorAll('[data-pdf-image="true"]')) {
    const pageEl = img.closest("[data-pdf-physical-page]") ?? img.closest("[data-pdf-ink-page]");
    const pageNum = Number(pageEl?.getAttribute("data-pdf-physical-page") || pageEl?.getAttribute("data-pdf-ink-page") || 1);
    const pageRect = pageEl?.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    if (r.width > 1 && r.height > 1) {
      imageRects.push({
        page: pageNum,
        left: r.left - (pageRect?.left ?? 0),
        right: r.right - (pageRect?.left ?? 0),
        top: r.top - (pageRect?.top ?? 0),
        bottom: r.bottom - (pageRect?.top ?? 0),
      });
    }
  }
  for (const line of document.querySelectorAll("[data-pdf-ink-line]")) {
    const pageEl = line.closest("[data-pdf-physical-page]") ?? line.closest("[data-pdf-ink-page]");
    const pageNum = Number(pageEl?.getAttribute("data-pdf-physical-page") || pageEl?.getAttribute("data-pdf-ink-page") || 1);
    const pageRect = pageEl?.getBoundingClientRect();
    const pageTop = pageRect?.top ?? 0;
    const pageLeft = pageRect?.left ?? 0;
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (!node.data.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 2 || rect.height < 2) continue;
        inkRects.push({
          page: pageNum,
          left: rect.left - pageLeft,
          right: rect.right - pageLeft,
          top: rect.top - pageTop,
          bottom: rect.bottom - pageTop,
        });
      }
    }
  }
  let lowest = 0;
  for (const id of ids) {
    const element = document.querySelector(`[data-print-frame-id="${id}"]`);
    const frame = element?.getBoundingClientRect();
    const flow: SideFlow = { left: false, right: false, overlap: 0, lines: 0, frameTop: 0, frameHeight: 0 };
    if (frame && element) {
      lowest = Math.max(lowest, frame.bottom);
      flow.frameTop = Math.round(frame.top);
      flow.frameHeight = Math.round(frame.height);
      flow.lines = element.closest("[data-pdf-physical-page]")?.querySelectorAll("[data-pdf-ink-line]").length ?? 0;
      for (const line of document.querySelectorAll("[data-pdf-ink-line]")) {
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
          if (!node.data.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (rect.width < 2 || rect.height < 2) continue;
            if (rect.bottom <= frame.top + 1 || rect.top >= frame.bottom - 1) continue;
            flow.overlap += 1;
            if (rect.right <= frame.left - 1) flow.left = true;
            if (rect.left >= frame.right + 1) flow.right = true;
          }
        }
      }
    }
    report[id] = flow;
  }
  const pages = document.querySelectorAll("[data-pdf-physical-page], [data-pdf-ink-page]").length;
  const screenDecorations = document.querySelectorAll("[data-run-around-gap], [data-run-around-break], [data-run-around-skip]").length;
  const printFrames = document.querySelectorAll("[data-print-frame]").length;
  const skipInLines = document.querySelectorAll('[data-pdf-ink-line] [data-print-run-around="skip"]').length;
  const tailInLines = document.querySelectorAll('[data-pdf-ink-line] [data-print-run-around="tail"]').length;
  const frameRects: Record<string, { page: number; left: number; right: number; top: number; bottom: number }> = {};
  for (const el of document.querySelectorAll("[data-print-frame-id]")) {
    const id = el.getAttribute("data-print-frame-id") ?? "";
    const pageEl = el.closest("[data-pdf-physical-page]") ?? el.closest("[data-pdf-ink-page]");
    const pageNum = Number(pageEl?.getAttribute("data-pdf-physical-page") || pageEl?.getAttribute("data-pdf-ink-page") || 1);
    const pageRect = pageEl?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (id) {
      frameRects[id] = {
        page: pageNum,
        left: r.left - (pageRect?.left ?? 0),
        right: r.right - (pageRect?.left ?? 0),
        top: r.top - (pageRect?.top ?? 0),
        bottom: r.bottom - (pageRect?.top ?? 0),
      };
    }
  }
  const lineRects = Array.from(document.querySelectorAll<HTMLElement>("[data-pdf-ink-line]")).map(line => {
    const pageEl = line.closest("[data-pdf-physical-page]") ?? line.closest("[data-pdf-ink-page]");
    const pageNum = Number(pageEl?.getAttribute("data-pdf-physical-page") || pageEl?.getAttribute("data-pdf-ink-page") || 1);
    const storyEl = line.closest("[data-pdf-ink-page]");
    const storyRect = storyEl?.getBoundingClientRect();
    const pageRect = pageEl?.getBoundingClientRect();
    const storyLeftOffset = (storyRect?.left ?? 0) - (pageRect?.left ?? 0);
    const styleLeft = storyLeftOffset + (parseFloat(line.style.left) || 0);
    const styleWidth = parseFloat(line.style.width) || 0;
    const r = line.getBoundingClientRect();
    return {
      page: pageNum,
      styleLeft,
      styleRight: styleLeft + styleWidth,
      left: r.left - (pageRect?.left ?? 0),
      right: r.right - (pageRect?.left ?? 0),
      top: r.top - (pageRect?.top ?? 0),
      bottom: r.bottom - (pageRect?.top ?? 0),
      text: line.textContent ?? "",
    };
  });
  return { report, pages, screenDecorations, printFrames, inkRects, imageRects, text: document.body.textContent ?? "", lowest, skipInLines, tailInLines, frameRects, lineRects };
}

describe.runIf(existsSync(CHROME))("PDF run around for image and text boxes", () => {
  const launch = puppeteer.launch.bind(puppeteer);
  let captured: ReturnType<typeof measurePdfFlow> | undefined;

  beforeAll(() => {
    vi.spyOn(chromium, "executablePath").mockResolvedValue(CHROME);
    vi.spyOn(puppeteer, "launch").mockImplementation(async (options) => {
      const browser = await launch({ ...options, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const newPage = browser.newPage.bind(browser);
      vi.spyOn(browser, "newPage").mockImplementation(async () => {
        const page = await newPage();
        const pdf = page.pdf.bind(page);
        vi.spyOn(page, "pdf").mockImplementation(async (pdfOptions) => {
          captured = await page.evaluate(measurePdfFlow);
          return pdf(pdfOptions);
        });
        return page;
      });
      return browser;
    });
  });

  afterAll(() => vi.restoreAllMocks());

  it("places story text beside both box types and writes a Nastaliq PDF", async () => {
    const settings = defaultDocumentSettings();
    settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false };
    const doc = {
      type: "doc" as const,
      content: [
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: story }] },
        { type: "pageBreak" },
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "صفحہ دو محفوظ رہے، سلام\u200cعلی۔" }] },
      ],
    };
    const response = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, frames, dir: "rtl", settings }),
    }));
    const failure = response.status === 200 ? "" : await response.text();
    expect(response.status, failure).toBe(200);
    const bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(PDF_PATH, bytes);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
    expect(captured, "PDF paint snapshot").toBeTruthy();
    expect(captured!.printFrames).toBe(4);
    expect(captured!.screenDecorations).toBe(0);
    expect(captured!.text).toContain("بِسم");
    expect(captured!.text).toContain("سلام\u200cعلی");
    expect(captured!.text).toContain("صفحہ دو");
    expect(captured!.text).toContain("بائیں خانہ");
    for (const id of ["pic-left", "pic-right", "text-left", "text-right"]) {
      expect(captured!.report[id], id).toMatchObject({ left: true, right: true });
      expect(captured!.report[id].overlap, id).toBeGreaterThan(0);
    }
    expect(response.headers.get("X-Pdf-Jameel-Used")).toBe("yes");
    const fonts = execFileSync("pdffonts", [PDF_PATH], { encoding: "utf8" });
    expect(fonts).toMatch(/MehrNastaliqWeb/);
    expect(fonts).toMatch(/Jameel/);
    const extracted = execFileSync("pdftotext", ["-layout", "-f", "1", "-l", "2", PDF_PATH, "-"], { encoding: "utf8" });
    const beside = extracted.split("\n").filter(line => /\S\s{12,}\S/.test(line));
    expect(beside.length).toBeGreaterThan(3);
  }, 120000);

  it("wraps a continuous story around an image box and a text box on page 2", async () => {
    const settings = defaultDocumentSettings();
    settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false };
    const continuous = `بِسم اللہ ${"سلام\u200cعلی ".repeat(700)}`;
    const pageTwo = [
      { id: "pic-page2", kind: "picture-rect", page: 2, xMm: 58, yMm: 32, wMm: 34, hMm: 30, flip: false, text: "", runAround: true, runAroundLeftMm: 1, runAroundRightMm: 4, runAroundTopMm: 0.5, runAroundBottomMm: 1 },
      { id: "text-page2", kind: "text", page: 2, xMm: 126, yMm: 32, wMm: 34, hMm: 28, flip: false, text: "دوسرا خانہ", runAround: true, runAroundLeftMm: 2, runAroundRightMm: 3, runAroundTopMm: 0.4, runAroundBottomMm: 1.2 },
    ];
    const doc = {
      type: "doc" as const,
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: continuous }] }],
    };
    const response = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, frames: pageTwo, dir: "rtl", settings }),
    }));
    const failure = response.status === 200 ? "" : await response.text();
    expect(response.status, failure).toBe(200);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(2);
    expect(captured!.printFrames).toBe(2);
    expect(captured!.screenDecorations).toBe(0);
    expect(captured!.text).toContain("دوسرا خانہ");
    expect(captured!.text).toContain("سلام\u200cعلی");
    for (const id of ["pic-page2", "text-page2"]) {
      expect(captured!.report[id], `${id} ${JSON.stringify(captured!.report)} pages=${captured!.pages}`).toMatchObject({ left: true, right: true });
      expect(captured!.report[id].overlap, id).toBeGreaterThan(0);
    }
  }, 120000);

  it("omits dontPrint Run Around frames and lets PDF story text flow through their area", async () => {
    const settings = defaultDocumentSettings();
    settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false };
    const doc = {
      type: "doc" as const,
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: story }] }],
    };
    const mixedFrames = [
      { id: "hidden-dont-print", kind: "picture-rect", page: 1, xMm: 95, yMm: 36, wMm: 45, hMm: 30, flip: false, text: "", dontPrint: true, runAround: true },
      { id: "visible-print", kind: "rect", page: 1, xMm: 95, yMm: 86, wMm: 45, hMm: 28, flip: false, text: "", dontPrint: false, runAround: true },
    ];
    const response = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, frames: mixedFrames, dir: "rtl", settings }),
    }));
    const failure = response.status === 200 ? "" : await response.text();
    expect(response.status, failure).toBe(200);
    const pdfPath = "/tmp/qalam-run-around-dont-print.pdf";
    const bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(pdfPath, bytes);
    expect(captured!.printFrames).toBe(1);
    expect(captured!.report["hidden-dont-print"]).toBeUndefined();
    expect(captured!.report["visible-print"]).toMatchObject({ left: true, right: true });
    expect(captured!.report["visible-print"].overlap).toBeGreaterThan(0);
    // Story text must flow straight through the hidden frame's horizontal & vertical span (95..140mm, 36..66mm).
    const pxPerMm = 96 / 25.4;
    const hiddenTop = 36 * pxPerMm;
    const hiddenBottom = 66 * pxPerMm;
    const hiddenLeft = 95 * pxPerMm;
    const hiddenRight = 140 * pxPerMm;
    const insideHidden = captured!.inkRects.filter(
      r => r.page === 1 && r.bottom > hiddenTop + 4 && r.top < hiddenBottom - 4 && r.right > hiddenLeft + 10 && r.left < hiddenRight - 10,
    );
    expect(insideHidden.length).toBeGreaterThan(0);
    const fonts = execFileSync("pdffonts", [pdfPath], { encoding: "utf8" });
    expect(fonts).toMatch(/MehrNastaliqWeb/);
  }, 120000);

  it("aligns page-2+ Run Around boxes after short pages, manual page breaks, and section breaks", async () => {
    const settings = defaultDocumentSettings();
    settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false };
    const doc = {
      type: "doc" as const,
      content: [
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "پہلے صفحے کا مختصر متن۔" }] },
        { type: "pageBreak" },
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: `دوسرا صفحہ ${"سلام\u200cعلی ".repeat(260)}` }] },
        { type: "sectionBreak", attrs: { type: "nextPage" } },
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: `تیسرا صفحہ ${"اردو\u200cنستعلیق ".repeat(260)}` }] },
      ],
    };
    const breakFrames = [
      { id: "p1-lower", kind: "rect", page: 1, xMm: 88, yMm: 72, wMm: 36, hMm: 26, flip: false, text: "", runAround: true },
      { id: "p2-box", kind: "picture-rect", page: 2, xMm: 88, yMm: 34, wMm: 36, hMm: 28, flip: false, text: "", runAround: true, runAroundLeftMm: 2, runAroundRightMm: 2, runAroundTopMm: 0.5, runAroundBottomMm: 0.5 },
      { id: "p3-box", kind: "text", page: 3, xMm: 88, yMm: 36, wMm: 36, hMm: 26, flip: false, text: "تیسرا خانہ", runAround: true, runAroundLeftMm: 2, runAroundRightMm: 2, runAroundTopMm: 0.5, runAroundBottomMm: 0.5 },
    ];
    const response = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, frames: breakFrames, dir: "rtl", settings }),
    }));
    const failure = response.status === 200 ? "" : await response.text();
    expect(response.status, failure).toBe(200);
    const pdfPath = "/tmp/qalam-run-around-breaks.pdf";
    const bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(pdfPath, bytes);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(3);
    expect(captured!.printFrames).toBe(3);
    expect(captured!.report["p2-box"]).toMatchObject({ left: true, right: true });
    expect(captured!.report["p2-box"].overlap).toBeGreaterThan(0);
    expect(captured!.report["p3-box"]).toMatchObject({ left: true, right: true });
    expect(captured!.report["p3-box"].overlap).toBeGreaterThan(0);
    // Page-2 text near y=72..98mm must NOT receive a phantom hole from p1-lower (which lives at y=72..98mm on page 1)
    const pxPerMm = 96 / 25.4;
    const page2LowerInk = captured!.inkRects.filter(
      r => r.page === 2 && r.bottom > 74 * pxPerMm && r.top < 96 * pxPerMm && r.right > 92 * pxPerMm && r.left < 120 * pxPerMm,
    );
    expect(page2LowerInk.length).toBeGreaterThan(0);
    // No glyph ink may collide horizontally inside p2-box or p3-box
    expect(captured!.inkRects.filter(
      r => r.page === 2 && r.bottom > 36 * pxPerMm && r.top < 60 * pxPerMm && r.right > 92 * pxPerMm && r.left < 120 * pxPerMm,
    )).toEqual([]);
    expect(captured!.inkRects.filter(
      r => r.page === 3 && r.bottom > 38 * pxPerMm && r.top < 60 * pxPerMm && r.right > 92 * pxPerMm && r.left < 120 * pxPerMm,
    )).toEqual([]);
    const fonts = execFileSync("pdffonts", [pdfPath], { encoding: "utf8" });
    expect(fonts).toMatch(/MehrNastaliqWeb/);
    expect(fonts).toMatch(/Jameel/);
    const extracted23 = execFileSync("pdftotext", ["-layout", "-f", "2", "-l", "3", pdfPath, "-"], { encoding: "utf8" });
    const beside23 = extracted23.split("\n").filter(line => /\S\s{10,}\S/.test(line));
    expect(beside23.length).toBeGreaterThan(2);
  }, 120000);

  it("coexists DocumentImage (wrapMode='wrap') and StudioFrame (runAround: true) without collisions", async () => {
    const settings = defaultDocumentSettings();
    settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false };
    const doc = {
      type: "doc" as const,
      content: [
        { type: "image", attrs: { src: TINY_PNG, alt: "Wrapped image", width: 140, height: 96, alignment: "right", wrapMode: "wrap" } },
        { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: `بِسم اللہ ${"سلام\u200cعلی ".repeat(180)}` }] },
      ],
    };
    const coexistFrames = [
      { id: "coexist-box", kind: "picture-rect", page: 1, xMm: 62, yMm: 30, wMm: 34, hMm: 26, flip: false, text: "", runAround: true, runAroundLeftMm: 2, runAroundRightMm: 2, runAroundTopMm: 0.5, runAroundBottomMm: 0.5 },
    ];
    const response = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, frames: coexistFrames, dir: "rtl", settings }),
    }));
    const failure = response.status === 200 ? "" : await response.text();
    expect(response.status, failure).toBe(200);
    const pdfPath = "/tmp/qalam-run-around-image-coexist.pdf";
    const bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(pdfPath, bytes);
    expect(captured!.printFrames).toBe(1);
    expect(captured!.imageRects.length).toBe(1);
    expect(captured!.report["coexist-box"]).toMatchObject({ left: true, right: true });
    expect(captured!.report["coexist-box"].overlap).toBeGreaterThan(0);
    const pxPerMm = 96 / 25.4;
    // Zero ink collision inside StudioFrame coexist-box (x=62..96mm, y=30..56mm)
    expect(captured!.inkRects.filter(
      r => r.page === 1 && r.bottom > 32 * pxPerMm && r.top < 54 * pxPerMm && r.right > 64 * pxPerMm && r.left < 94 * pxPerMm,
    )).toEqual([]);
    // Zero ink collision inside right-floated DocumentImage
    const imgRect = captured!.imageRects[0];
    expect(captured!.inkRects.filter(
      r => r.page === 1 && r.bottom > imgRect.top + 4 && r.top < imgRect.bottom - 4 && r.right > imgRect.left + 8 && r.left < imgRect.right - 8,
    )).toEqual([]);
    // Text also continues below both objects
    expect(captured!.inkRects.some(r => r.page === 1 && r.top > Math.max(imgRect.bottom, 58 * pxPerMm))).toBe(true);
    const fonts = execFileSync("pdffonts", [pdfPath], { encoding: "utf8" });
    expect(fonts).toMatch(/MehrNastaliqWeb/);
  }, 120000);

  it("handles full-width skip frames, near-boundary skips, and justified tail gaps cleanly in Server PDF (C1)", async () => {
    const settings = defaultDocumentSettings();
    settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false };
    const pxPerMm = 96 / 25.4;
    const midFullWidth = { id: "full-mid", kind: "picture-rect", page: 1, xMm: 10, yMm: 52, wMm: 190, hMm: 46, flip: false, text: "", runAround: true, runAroundTopMm: 1, runAroundBottomMm: 1 };
    const boundaryFullWidth = { id: "full-bottom", kind: "rect", page: 1, xMm: 10, yMm: 222, wMm: 190, hMm: 48, flip: false, text: "", runAround: true, runAroundTopMm: 1, runAroundBottomMm: 1 };
    const longRtl = Array.from({ length: 16 }, (_, idx) => ({
      type: "paragraph",
      attrs: { dir: "rtl", textAlign: "justify" },
      content: [{ type: "text", text: `فقرہ ${idx + 1} ${"سلام\u200cعلی عبادت معرفت محبت ".repeat(14)}` }],
    }));
    const doc = { type: "doc" as const, content: longRtl };
    const response1 = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, frames: [midFullWidth, boundaryFullWidth], dir: "rtl", settings }),
    }));
    expect(response1.status, response1.status === 200 ? "" : await response1.clone().text()).toBe(200);
    const bytes1 = Buffer.from(await response1.arrayBuffer());
    const pdfPath1 = "/tmp/qalam-run-around-c1-skip.pdf";
    writeFileSync(pdfPath1, bytes1);
    expect(captured!.skipInLines).toBe(0);
    expect(captured!.tailInLines).toBe(0);
    // Zero ink collision inside midFullWidth or boundaryFullWidth
    expect(captured!.inkRects.filter(r => r.page === 1 && r.bottom > 53 * pxPerMm && r.top < 97 * pxPerMm)).toEqual([]);
    expect(captured!.inkRects.filter(r => r.page === 1 && r.bottom > 223 * pxPerMm && r.top < 270 * pxPerMm)).toEqual([]);
    // Page 2 must actually start near the top of Page 2's printable content area (25.4mm), NOT shifted downward by skipHeight (~50mm)!
    const page2TopInk = captured!.inkRects.filter(r => r.page === 2).reduce((min, r) => Math.min(min, r.top), Infinity);
    expect(page2TopInk).toBeLessThan(55 * pxPerMm);
    const fonts1 = execFileSync("pdffonts", [pdfPath1], { encoding: "utf8" });
    expect(fonts1).toMatch(/MehrNastaliqWeb/);

    // Justified narrow side columns triggering packed-fallback tail gaps
    const narrowBox = { id: "justify-narrow", kind: "rect", page: 1, xMm: 52, yMm: 36, wMm: 106, hMm: 34, flip: false, text: "", runAround: true, runAroundLeftMm: 1, runAroundRightMm: 1, runAroundTopMm: 0.5, runAroundBottomMm: 0.5 };
    const justifiedDoc = {
      type: "doc" as const,
      content: [
        { type: "paragraph", attrs: { dir: "rtl", textAlign: "justify" }, content: [{ type: "text", text: `آغاز ${"سلام\u200cعلی عبادت ".repeat(85)}` }] },
      ],
    };
    const response2 = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc: justifiedDoc, frames: [narrowBox], dir: "rtl", settings }),
    }));
    expect(response2.status, response2.status === 200 ? "" : await response2.clone().text()).toBe(200);
    expect(captured!.tailInLines).toBe(0);
    expect(captured!.skipInLines).toBe(0);
    expect(captured!.inkRects.filter(r => r.page === 1 && r.bottom > 37 * pxPerMm && r.top < 69 * pxPerMm && r.right > 53 * pxPerMm && r.left < 157 * pxPerMm)).toEqual([]);
    // Lines strictly below justify-narrow must use normal full column right edge (no tail shift leaked onto subsequent lines).
    const belowRight = captured!.inkRects
      .filter(r => r.page === 1 && r.top > 75 * pxPerMm && r.bottom < 160 * pxPerMm)
      .reduce((max, r) => Math.max(max, r.right), 0);
    expect(belowRight).toBeGreaterThan((210 - 25.4 - 18) * pxPerMm);
  }, 120000);

  it("clamps margin-overlapping frames so adjacent PDF pages never receive phantom Run Around holes (H1)", async () => {
    const settings = defaultDocumentSettings();
    settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false };
    const pxPerMm = 96 / 25.4;
    const p1BottomMarginBox = { id: "p1-bottom-margin", kind: "rect", page: 1, xMm: 82, yMm: 255, wMm: 46, hMm: 30, flip: false, text: "", runAround: true };
    const p2TopMarginBox = { id: "p2-top-margin", kind: "picture-rect", page: 2, xMm: 82, yMm: 10, wMm: 46, hMm: 30, flip: false, text: "", runAround: true };
    const doc = {
      type: "doc" as const,
      content: Array.from({ length: 24 }, (_, idx) => ({
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [{ type: "text", text: `صفحہ‌بندی ${idx + 1} ${"سلام\u200cعلی عبادت ".repeat(24)}` }],
      })),
    };
    const response = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, frames: [p1BottomMarginBox, p2TopMarginBox], dir: "rtl", settings }),
    }));
    expect(response.status, response.status === 200 ? "" : await response.clone().text()).toBe(200);
    // Page-1 bottom lines (y ~ 245..271mm) must still flow horizontally through x=82..128mm despite p2-top-margin (yMm=10 < 25.4mm on Page 2)!
    const p1LowerThroughBand = captured!.inkRects.filter(
      r => r.page === 1 && r.top > 240 * pxPerMm && r.bottom < 273 * pxPerMm && r.right > 86 * pxPerMm && r.left < 124 * pxPerMm,
    );
    expect(p1LowerThroughBand.length).toBeGreaterThan(0);
    // Page-2 top lines (y ~ 25..42mm) should avoid p2-top-margin (inside Page 2 content band y=25.4..40.35mm),
    // yet lower on Page 2 after y=44mm (wait: p1-bottom-margin on Page 1 would bleed down to ~14mm of Page 2 content = y ~ 25.4..39mm on Page 2).
    // Test isolation specifically: remove p2TopMarginBox, keep ONLY p1BottomMarginBox -> Page 2 top band must flow straight through x=82..128mm!
    const responseOnlyP1 = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, frames: [p1BottomMarginBox], dir: "rtl", settings }),
    }));
    expect(responseOnlyP1.status).toBe(200);
    const p2TopThroughBand = captured!.inkRects.filter(
      r => r.page === 2 && r.top >= 24 * pxPerMm && r.bottom < 45 * pxPerMm && r.right > 86 * pxPerMm && r.left < 124 * pxPerMm,
    );
    expect(p2TopThroughBand.length).toBeGreaterThan(0);
  }, 120000);

  it("preserves exact horizontal Run Around clearance on RTL and LTR lines with tight default clearances (M1)", async () => {
    const settings = defaultDocumentSettings();
    settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false };
    const pxPerMm = 96 / 25.4;

    // 1. RTL Nastaliq with left and right Run Around frames using default clearances (0.71mm / 0.35mm)
    const rtlFrames = [
      { id: "rtl-left", kind: "picture-rect", page: 1, xMm: 48, yMm: 36, wMm: 30, hMm: 26, flip: false, text: "", runAround: true },
      { id: "rtl-right", kind: "rect", page: 1, xMm: 132, yMm: 78, wMm: 30, hMm: 26, flip: false, text: "", runAround: true },
    ];
    const rtlDoc = {
      type: "doc" as const,
      content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: `بِسم اللہ ${"سلام\u200cعلی عبادت ".repeat(110)}` }] }],
    };
    const rtlRes = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc: rtlDoc, frames: rtlFrames, dir: "rtl", settings }),
    }));
    expect(rtlRes.status, rtlRes.status === 200 ? "" : await rtlRes.clone().text()).toBe(200);
    for (const id of ["rtl-left", "rtl-right"]) {
      const f = captured!.frameRects[id];
      expect(f).toBeTruthy();
      expect(captured!.report[id]).toMatchObject({ left: true, right: true });
      const hits = captured!.inkRects.filter(
        r => r.page === 1 && r.bottom > f.top + 1 && r.top < f.bottom - 1 && r.right > f.left - 0.5 && r.left < f.right + 0.5,
      );
      expect(hits, `${id} ink collision`).toEqual([]);
    }

    // 2. LTR Latin with left and right Run Around frames using tight default clearances (0.71mm / 0.35mm)
    const ltrFrames = [
      { id: "ltr-left", kind: "picture-rect", page: 1, xMm: 46, yMm: 36, wMm: 32, hMm: 24, flip: false, text: "", runAround: true },
      { id: "ltr-right", kind: "rect", page: 1, xMm: 130, yMm: 74, wMm: 32, hMm: 24, flip: false, text: "", runAround: true },
    ];
    const ltrDoc = {
      type: "doc" as const,
      content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Balanced English prose flows cleanly around both boxes with tight default clearances. ".repeat(24) }] }],
    };
    const ltrRes = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc: ltrDoc, frames: ltrFrames, dir: "ltr", settings }),
    }));
    expect(ltrRes.status, ltrRes.status === 200 ? "" : await ltrRes.clone().text()).toBe(200);
    for (const id of ["ltr-left", "ltr-right"]) {
      const f = captured!.frameRects[id];
      expect(f).toBeTruthy();
      expect(captured!.report[id]).toMatchObject({ left: true, right: true });
      const hits = captured!.inkRects.filter(
        r => r.page === 1 && r.bottom > f.top + 1 && r.top < f.bottom - 1 && r.right > f.left - 0.5 && r.left < f.right + 0.5,
      );
      expect(hits, `${id} ink collision`).toEqual([]);
      // Confirm frame and printed line frames sit strictly inside physical printable margins (25.4mm..184.6mm).
      expect(f.left).toBeGreaterThan(25.4 * pxPerMm);
    }
    const page1Lines = captured!.lineRects.filter(l => l.page === 1 && l.text.trim().length > 0);
    expect(page1Lines.length).toBeGreaterThan(0);
    for (const line of page1Lines) {
      expect(line.styleLeft).toBeGreaterThanOrEqual(25.4 * pxPerMm - 1);
      expect(line.styleRight).toBeLessThanOrEqual((210 - 25.4) * pxPerMm + 1);
    }
    const page1Ink = captured!.inkRects.filter(r => r.page === 1);
    expect(page1Ink.length).toBeGreaterThan(0);
    for (const r of page1Ink) {
      expect(r.left).toBeGreaterThanOrEqual(25.4 * pxPerMm - 2);
      expect(r.right).toBeLessThanOrEqual((210 - 25.4) * pxPerMm + 2);
    }
  }, 120000);
});
