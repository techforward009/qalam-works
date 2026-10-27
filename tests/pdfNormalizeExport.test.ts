import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { PdfExportTestRequest as NextRequest } from "./helpers/pdfExportRequest";
import { PDFDocument } from "pdf-lib";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { measureJsonUtf8Bytes } from "../app/tools/document-studio/utils/pdfSourcePreflight";
import { normalizePdfDocument } from "../app/tools/document-studio/utils/normalizePdfDocument";

describe.runIf(Boolean(process.env.QALAM_PDF_CHROMIUM))("normalised real PDF export", () => {
  const launch = puppeteer.launch.bind(puppeteer);
  beforeAll(() => {
    vi.spyOn(chromium, "executablePath").mockResolvedValue(process.env.QALAM_PDF_CHROMIUM!);
    vi.spyOn(puppeteer, "launch").mockImplementation(options => launch({ ...options, args: ["--no-sandbox", "--disable-setuid-sandbox"] }));
  });
  afterAll(() => vi.restoreAllMocks());
  it("reduces a one-page mixed-script marked document without changing PDF pixels", async () => {
    const sample = Array.from({ length: 48 }, () => ["یہ ", "ایک ", "خوبصورت ", "عبارت ", "ہے ", "This is a Qalam Page "]).flat();
    const doc = { type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: sample.map((text, index) => ({ type: "text", text, marks: [{ type: "textStyle", attrs: { fontFamily: "Mehr Nastaliq Web", fontSize: "10pt", color: Math.floor(index / 6) % 2 ? "#123456" : "#000000", textEffect: Math.floor(index / 6) % 2 ? "single" : "none", trackingPercent: null, scalePercent: null, latinFontFamily: null, textOutline: null, backgroundColor: null, charScale: null, baselineShift: null, hatch: null, kashida: null, charLanguage: null, meem: null, be: null, jeem: null, ain: null, kaaf: null } }] })) }] };
    const compact = normalizePdfDocument(doc), before = measureJsonUtf8Bytes(doc), after = measureJsonUtf8Bytes(compact);
    expect(before).toBeGreaterThan(96 * 1024); expect(after).toBeLessThan(before);
    const settings = defaultDocumentSettings(); settings.headerFooter.headerEnabled = false; settings.headerFooter.footerEnabled = false;
    const output = join(tmpdir(), "qalam-pdf-normalize"); mkdirSync(output, { recursive: true });
    const renders: Buffer[] = [];
    for (const [index, candidate] of [doc, compact].entries()) {
      const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc: candidate, dir: "rtl", settings }) }));
      expect(response.status, await response.clone().text().then(s => s.slice(0, 500))).toBe(200);
      const bytes = Buffer.from(await response.arrayBuffer()); expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
      const base = join(output, String(index)); writeFileSync(base + ".pdf", bytes);
      execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-singlefile", "-r", "96", "-png", base + ".pdf", base]);
      renders.push(await sharp(readFileSync(base + ".png")).removeAlpha().raw().toBuffer());
    }
    console.log(`PDF source bytes: ${before} -> ${after}`);
    writeFileSync(join(output, "sizes.json"), JSON.stringify({ before, after }));
    expect(renders[1].equals(renders[0])).toBe(true);
  }, 120_000);
  it("preserves pixels when adjacent equal-mark runs split Arabic words", async () => {
    const marks = [{ type: "textStyle", attrs: { fontFamily: "Mehr Nastaliq Web", fontSize: "20pt", color: "#123456", textEffect: "single", textOutline: null } }];
    const doc = { type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: ["ال", "لہ ", "ک", "تاب ", "Hello ", "world"].map(text => ({ type: "text", text, marks })) }] };
    const settings = defaultDocumentSettings(); settings.headerFooter.headerEnabled = false; settings.headerFooter.footerEnabled = false;
    const output = join(tmpdir(), "qalam-pdf-normalize"); mkdirSync(output, { recursive: true });
    const renders: Buffer[] = [];
    for (const [index, candidate] of [doc, normalizePdfDocument(doc)].entries()) {
      const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc: candidate, dir: "rtl", settings }) }));
      expect(response.status, await response.clone().text().then(s => s.slice(0, 500))).toBe(200);
      const base = join(output, `split-${index}`); writeFileSync(base + ".pdf", Buffer.from(await response.arrayBuffer()));
      execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-singlefile", "-r", "96", "-png", base + ".pdf", base]);
      renders.push(await sharp(readFileSync(base + ".png")).removeAlpha().raw().toBuffer());
    }
    expect(renders[1].equals(renders[0])).toBe(true);
  }, 120_000);
});
