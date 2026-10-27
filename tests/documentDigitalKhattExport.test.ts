import { expect, test, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { editorFontFamilyStack, getFontById } from "../app/tools/document-studio/utils/fontRegistry";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { fontsForDocument } from "../app/tools/document-studio/utils/pdfDocumentFonts";

async function exportDigital(texts: string[], size = "24pt", indentCssPx = 0) {
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
  settings.typography.firstLineIndentMm = indentCssPx * 25.4 / 96;
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

test("right-edge Digital Khatt contours match an unclipped inset reference, rejecting a clipped control", async () => {
  const texts = ["قُلِ اللّٰھُمَّ مِنۡ ، ۔", "لَا إِلٰهَ إِلَّا اللّٰهُ", "فِی سَبِیْلِ اللّٰهِ", "شَیْءٍ قَدِیْرٌ"];
  const result = await exportDigital(texts);
  // Move the reference text 48 CSS px into its line box. Its glyph overhang is
  // safely inside even if boundary overflow clipping regresses. Shape/size stay
  // identical: the only intended difference is an integer pixel translation.
  const reference = await exportDigital(texts, "24pt", 48);
  const dpi = 384, scale = dpi / 96;
  const rasterize = async (pdf: string) => {
    const png = execFileSync("pdftoppm", ["-f", "1", "-singlefile", "-r", String(dpi), "-png", pdf]);
    return sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  };
  const actual = await rasterize(result.pdf), expected = await rasterize(reference.pdf);
  const margin = result.settings.page.margins.topMm * dpi / 25.4;
  const guide = (result.settings.page.margins.startMm * 96 / 25.4 + Number(result.response.headers.get("X-Pdf-Printable-Width"))) * scale;
  type Raster = typeof actual;
  const box = (image: Raster, bound: { top: number; bottom: number }, clip = Infinity) => {
    let left = Infinity, right = -1, top = Infinity, bottom = -1;
    for (let y = Math.max(0, Math.floor(margin + bound.top * scale) - 3); y < Math.min(image.info.height, Math.ceil(margin + bound.bottom * scale) + 3); y++)
      for (let x = 0; x < Math.min(image.info.width, clip); x++) if (image.data[y * image.info.width + x] < 100) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    expect(right).toBeGreaterThan(left);
    return { left, right, top, bottom };
  };
  const assertUnclipped = (clip = Infinity) => texts.map((_, index) => {
    const a = box(actual, result.bounds[index], clip), r = box(expected, reference.bounds[index]);
    const dx = a.left - r.left, dy = a.top - r.top;
    expect(Math.abs(dx - 48 * scale)).toBeLessThanOrEqual(1);
    expect(Math.abs((a.right - a.left) - (r.right - r.left))).toBeLessThanOrEqual(1);
    let compared = 0, missing = 0;
    // Compare the actual terminal ink contour, not just its furthest column.
    // A 1px endpoint difference cannot hide a flat cut through the first glyph.
    for (let y = r.top; y <= r.bottom; y++) for (let x = Math.max(r.left, r.right - 32); x <= r.right; x++) {
      if (expected.data[y * expected.info.width + x] >= 80) continue;
      compared++;
      const ax = x + dx, ay = y + dy;
      const painted = ax < clip && [-1, 0, 1].some(offset => actual.data[(ay + offset) * actual.info.width + ax] < 160);
      if (!painted) missing++;
    }
    expect(compared).toBeGreaterThan(20);
    expect(missing / compared, JSON.stringify({ index, compared, missing, a, r })).toBeLessThan(.001);
    return { compared, missing, right: a.right };
  });
  const contours = assertUnclipped();
  // Sensitivity control: simulate a real cut at the right guide. This matcher
  // must reject it, even if other lines still happen to vary by one pixel.
  expect(() => assertUnclipped(Math.floor(guide))).toThrow();
  writeFileSync(join(result.dir, "ink-contours.json"), JSON.stringify({ guide, contours }));
}, 60000);

// A Latin segment is intentionally handled by the editor's English face; it
// must not trigger the protected-Arabic source checksum and reject the PDF.
test("mixed Latin codepoints inside a Digital Khatt mark do not block the document", async () => {
  const result = await exportDigital(["مِنۡ café ، لَا۔"]);
  expect(result.pdfLines.join("")).toContain("café");
}, 60000);

test("compiled editor font guards and export use the same catalogued Digital Khatt bytes", async () => {
  const asset = getFontById("digital-khatt-indo-pak").pdf.regularFiles![0];
  const globals = readFileSync("app/globals.css", "utf8");
  expect(globals.match(/@font-face\{font-family:"Digital Khatt Indo-Pak";src:url\("([^"]+)"\)/)?.[1]).toBe(asset);
  const source = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "لَا مِنۡ", marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak" } }] }] }] };
  const loaded = await fontsForDocument(source, "rtl", defaultDocumentSettings().typography);
  expect(loaded.fonts.faces.find(face => face.familyName === "Digital Khatt Indo-Pak")?.regularSources[0]).toBe(readFileSync(join("public", asset.slice(1))).toString("base64"));
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


test("restored Digital Khatt mark sets export as real CID TrueType text", async () => {
  const result = await exportDigital(["رَبِّ الۡعٰلَمِیۡنَ بِیَدِکَ بِاَمۡرِہٖ الۡمَیِّتِ"], "32pt");
  const digital = result.fonts.split("\n").find(line => line.includes("DigitalKhattIndoPakQalam-Regular"));
  expect(digital).toContain("CID TrueType");
  expect(digital).toMatch(/Identity-H\s+yes\s+yes\s+yes/);
  expect(result.fonts).not.toMatch(/Type 3/);
  expect(result.pdfLines.join("")).toContain("رَبِّ");
}, 60000);
