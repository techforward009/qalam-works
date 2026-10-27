import { expect, test, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { editorFontFamilyStack } from "../app/tools/document-studio/utils/fontRegistry";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";

async function exportDigital(texts: string[], size = "24pt") {
  const doc = { type: "doc", content: texts.map(text => ({ type: "paragraph", attrs: { dir: "rtl" }, content: [
    { type: "text", text, marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak", fontSize: size } }] },
  ] })) };
  let pdfLines: string[] = [];
  let bounds: { top: number; bottom: number }[] = [];
  const launch = puppeteer.launch.bind(puppeteer);
  const spy = vi.spyOn(puppeteer, "launch").mockImplementation(async options => {
    const browser = await launch(options), newPage = browser.newPage.bind(browser);
    vi.spyOn(browser, "newPage").mockImplementation(async () => {
      const page = await newPage(), print = page.pdf.bind(page);
      vi.spyOn(page, "pdf").mockImplementation(async options => {
        pdfLines = await page.$$eval("[data-pdf-ink-line]", lines => lines.map(line => line.textContent ?? ""));
        bounds = await page.$$eval("[data-pdf-ink-line]", lines => lines.map(line => JSON.parse((line as HTMLElement).dataset.pdfInkBounds!)));
        return print(options);
      });
      return page;
    });
    return browser;
  });
  const settings = defaultDocumentSettings();
  const response = await POST(new NextRequest("http://localhost/api/export-pdf", {
    method: "POST", body: JSON.stringify({ doc, dir: "rtl", settings }),
  })).finally(() => spy.mockRestore());
  expect(response.status, response.status === 200 ? "PDF exported" : await response.text()).toBe(200);
  const dir = mkdtempSync(join(tmpdir(), "qalam-dk-export-")), pdf = join(dir, "download.pdf");
  writeFileSync(pdf, Buffer.from(await response.arrayBuffer()));
  writeFileSync(join(dir, "source.json"), JSON.stringify({ doc, dir: "rtl", settings, pdfLines, bounds }));
  const fonts = execFileSync("pdffonts", [pdf], { encoding: "utf8" });
  expect(fonts).toMatch(/DigitalKhattIndoPakQalam-Regular/);
  expect(fonts).not.toMatch(/NotoNaskh/i);
  const names = fonts.split("\n").slice(2).filter(line => line.trim()).map(line => line.trim().split(/\s+/)[0].replace(/^[A-Z]{6}\+/, ""));
  expect(names.every(name => /^(DigitalKhattIndoPakQalam-Regular|MehrNastaliqWeb|Amiri(?:-Regular)?|Inter(?:-Regular)?|NotoNastaliqUrdu(?:-Regular)?)$/.test(name)), fonts).toBe(true);
  return { dir, pdf, pdfLines, bounds, settings, response, fonts };
}

test("downloaded Digital Khatt ligatures and punctuation use only bundled fonts", async () => {
  const text = "لَا لا فِی فی قُلِ اللّٰھُمَّ ، لَا لا فِی قُلِ اللّٰھُمَّ۔ ".repeat(3);
  const result = await exportDigital([text]);
  // Recorded from the editor at 24pt, A4 / 25.4mm margins: preserve wrap positions.
  expect(result.pdfLines.map(line => line.trim())).toEqual([
    "لَا لا فِی فی قُلِ اللّٰھُمَّ ، لَا لا فِی قُلِ اللّٰھُمَّ۔ لَا لا فِی فی قُلِ اللّٰھُمَّ ،",
    "لَا لا فِی قُلِ اللّٰھُمَّ۔ لَا لا فِی فی قُلِ اللّٰھُمَّ ، لَا لا فِی قُلِ اللّٰھُمَّ۔",
  ]);
}, 60000);

test("Indo-Pak jazm in مِنۡ survives an actual successful PDF export", async () => {
  const result = await exportDigital(["مِنۡ قُلِ اللّٰھُمَّ ، لَا لا فِی۔"]);
  expect(result.pdfLines.join("")).toContain("مِنۡ");
  const extracted = execFileSync("pdftotext", ["-raw", result.pdf, "-"], { encoding: "utf8" });
  expect(extracted).toContain("\u06E1");
  expect(result.response.headers.get("X-Pdf-Warnings")).toBe("[]");
}, 60000);

test("other uncovered marks use the bundled editor fallback and produce a warning", async () => {
  const result = await exportDigital(["ا\u06D7 ، مِنۡ۔"]);
  expect(result.pdfLines.join("")).toContain("\u06D7");
  expect(JSON.parse(result.response.headers.get("X-Pdf-Warnings")!)).toContain("U+06D7");
  expect(result.response.headers.get("X-Pdf-Font-Fallbacks")).toContain("U+06D7");
}, 60000);

test("right-edge Digital Khatt ink can bleed past the guide without a flat clipping column", async () => {
  const result = await exportDigital(["قُلِ اللّٰھُمَّ مِنۡ ، ۔", "لَا إِلٰهَ إِلَّا اللّٰهُ", "فِی سَبِیْلِ اللّٰهِ", "شَیْءٍ قَدِیْرٌ"]);
  const raster = execFileSync("pdftoppm", ["-f", "1", "-singlefile", "-r", "144", "-png", result.pdf]);
  const { data, info } = await sharp(raster).greyscale().raw().toBuffer({ resolveWithObject: true });
  const guide = (result.settings.page.margins.startMm * 96 / 25.4 + Number(result.response.headers.get("X-Pdf-Printable-Width"))) * 1.5;
  const topMargin = result.settings.page.margins.topMm * 144 / 25.4;
  const edges = result.bounds.map(bound => {
    let right = -1;
    for (let y = Math.max(0, Math.floor(topMargin + bound.top * 1.5) - 3); y < Math.min(info.height, Math.ceil(topMargin + bound.bottom * 1.5) + 3); y++)
      for (let x = Math.floor(guide - 140); x < Math.min(info.width, Math.ceil(guide + 64)); x++)
        if (data[y * info.width + x] < 100) right = Math.max(right, x);
    return right;
  });
  writeFileSync(join(result.dir, "ink-edges.json"), JSON.stringify({ guide, edges }));
  expect(edges.every(x => x > 0)).toBe(true);
  expect(new Set(edges).size, JSON.stringify({ guide, edges })).toBeGreaterThan(1);
  // Pixel indices name their left edge; this column lies wholly past the guide.
  expect(Math.max(...edges), JSON.stringify({ guide, edges })).toBeGreaterThanOrEqual(Math.ceil(guide));
}, 60000);

// A Latin segment is intentionally handled by the editor's English face; it
// must not trigger the protected-Arabic source checksum and reject the PDF.
test("mixed Latin codepoints inside a Digital Khatt mark do not block the document", async () => {
  const result = await exportDigital(["مِنۡ café ، لَا۔"]);
  expect(result.pdfLines.join("")).toContain("café");
}, 60000);

test("compiled editor font guards retain Digital Khatt as the primary face of its fallback stack", async () => {
  const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage();
    const [{ default: postcss }, { default: tailwind }] = await Promise.all([import("postcss"), import("@tailwindcss/postcss")]);
    const compiled = await postcss([tailwind({ optimize: true })]).process(readFileSync("app/globals.css", "utf8"), { from: "app/globals.css" });
    await page.setContent(`<style>${compiled.css}</style><div class="qalam-editor-content"><span id="probe">مِنۡ ، ۔</span></div>`);
    await page.$eval("#probe", (el, stack) => (el as HTMLElement).style.fontFamily = stack, editorFontFamilyStack("digital-khatt-indo-pak"));
    expect(await page.$eval("#probe", el => getComputedStyle(el).fontFamily)).toBe(editorFontFamilyStack("digital-khatt-indo-pak"));
  } finally { await browser.close(); }
}, 60000);
