import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { preflightPdfSource, PDF_SOURCE_LIMITS } from "../app/tools/document-studio/utils/pdfSourcePreflight";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WAAAAABJRU5ErkJggg==";
const CHROME = process.env.QALAM_PDF_CHROMIUM || "/opt/pw-browsers/chromium-1234/chrome-linux64/chrome";

function sampleDoc(src: string) {
  return {
    type: "doc" as const,
    content: [
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "الحمدللہ آج ہم خیریت سے کراچی پہنچ گئے ہیں۔" }] },
      { type: "image", attrs: { src, alt: "Mark", width: 160, height: 80, alignment: "left", wrapMode: "wrap" } },
      { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Text beside the wrapped image continues on the right." }] },
      { type: "pageBreak" },
      { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "صفحہ دو" }] },
      { type: "sectionBreak", attrs: { type: "nextPage" } },
      { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Section two text." }] },
    ],
  };
}

describe.runIf(Boolean(CHROME))("PDF export wrap + page/section breaks", () => {
  const launch = puppeteer.launch.bind(puppeteer);
  beforeAll(() => {
    vi.spyOn(chromium, "executablePath").mockResolvedValue(CHROME);
    vi.spyOn(puppeteer, "launch").mockImplementation(async (options) =>
      launch({ ...options, args: ["--no-sandbox", "--disable-setuid-sandbox"] }),
    );
  });
  afterAll(() => vi.restoreAllMocks());

  it("lets a realistic wrapped image through preflight", () => {
    let src = PNG;
    try { src = readFileSync("/tmp/noise-uri.txt", "utf8"); } catch { /* optional */ }
    expect(preflightPdfSource(sampleDoc(src)).bytes).toBeLessThan(PDF_SOURCE_LIMITS.bytes);
  });

  it("returns HTTP 200 and a non-empty multi-page PDF", async () => {
    const settings = defaultDocumentSettings();
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc: sampleDoc(PNG), dir: "rtl", settings }),
    }));
    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(0);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
    expect(response.headers.get("x-pdf-page-count")).toBe(String(pdf.getPageCount()));
  }, 120000);
});
