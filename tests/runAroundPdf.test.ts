import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { PdfExportTestRequest } from "./helpers/pdfExportRequest";

const CHROME = "/home/qalam/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const PDF_PATH = "/tmp/qalam-run-around.pdf";
const story = `بِسم اللہ ${"سلام\u200cعلی ".repeat(140)}`;

const frames = [
  { id: "pic-left", kind: "picture-rect", page: 1, xMm: 58, yMm: 42, wMm: 34, hMm: 26, flip: false, text: "", runAround: true, runAroundLeftMm: 1, runAroundRightMm: 4, runAroundTopMm: 0.5, runAroundBottomMm: 1 },
  { id: "pic-right", kind: "picture-rect", page: 1, xMm: 128, yMm: 42, wMm: 32, hMm: 26, flip: false, text: "", runAround: true, runAroundLeftMm: 3, runAroundRightMm: 1, runAroundTopMm: 2, runAroundBottomMm: 0.4 },
  { id: "text-left", kind: "text", page: 1, xMm: 58, yMm: 90, wMm: 34, hMm: 22, flip: false, text: "بائیں خانہ", runAround: true, runAroundLeftMm: 2, runAroundRightMm: 2, runAroundTopMm: 1, runAroundBottomMm: 1 },
  { id: "text-right", kind: "text", page: 1, xMm: 126, yMm: 90, wMm: 34, hMm: 22, flip: false, text: "دائیں خانہ", runAround: true, runAroundLeftMm: 0.5, runAroundRightMm: 5, runAroundTopMm: 0.4, runAroundBottomMm: 2 },
];

type SideFlow = { left: boolean; right: boolean; overlap: number; lines: number; frameTop: number; frameHeight: number };

function measurePdfFlow() {
  const report: Record<string, SideFlow> = {};
  const ids = ["pic-left", "pic-right", "text-left", "text-right", "pic-page2", "text-page2"];
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
  return { report, pages, screenDecorations, printFrames, text: document.body.textContent ?? "", lowest };
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
});
