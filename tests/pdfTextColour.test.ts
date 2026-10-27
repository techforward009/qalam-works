import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings, withStudioOpeningMargins } from "../app/tools/document-studio/utils/documentSettings";

const chrome = process.env.QALAM_PDF_CHROMIUM!;
const dir = join(process.cwd(), "test-results", "pdf-text-colour");
const rows = [
  { font: "Mehr Nastaliq Web", dir: "rtl", values: ["سفید", "سرخ", "نیلا", "سیاہ"] },
  { font: "Digital Khatt Indo-Pak", dir: "rtl", values: ["ابيض", "احمر", "ازرق", "اسود"] },
  { font: "Inter", dir: "ltr", values: ["WHITE", "RED", "BLUE", "BLACK"] },
];
const colours = [null, "#ff0000", "#0000ff", null];
const doc = { type: "doc", content: [...rows.map(row => ({ type: "paragraph", attrs: { dir: row.dir }, content: row.values.map((value, index) => ({
  type: "text", text: value + " ", marks: [{ type: "textStyle", attrs: { fontFamily: row.font, fontSize: "24pt", color: colours[index], textEffect: index === 0 ? "reverse" : null } }],
})) })), { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "The same line breaks should stay in the downloaded document ".repeat(2), marks: [{ type: "textStyle", attrs: { fontFamily: "Inter", fontSize: "24pt" } }] }] }] };

describe.runIf(Boolean(chrome))("PDF text colours", () => {
  const launch = puppeteer.launch.bind(puppeteer);
  let printRuns: Array<{ value: string; left: number; top: number; right: number; bottom: number; colour: string; fill: string }> = [];
  let printedLines: string[] = [];
  beforeAll(() => {
    mkdirSync(dir, { recursive: true });
    vi.spyOn(chromium, "executablePath").mockResolvedValue(chrome);
    vi.spyOn(puppeteer, "launch").mockImplementation(async options => {
      const browser = await launch({ ...options, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const newPage = browser.newPage.bind(browser);
      vi.spyOn(browser, "newPage").mockImplementation(async () => {
        const page = await newPage();
        const print = page.pdf.bind(page);
        vi.spyOn(page, "pdf").mockImplementation(async options => {
          const data = await page.evaluate((values) => {
            const sheet = document.querySelector<HTMLElement>('[data-pdf-ink-page="1"]')!;
            const pageRect = sheet.getBoundingClientRect();
            const lines = [...document.querySelectorAll<HTMLElement>('[data-pdf-ink-line]')].map(line => line.textContent || "");
            const runs = values.flatMap(value => {
              const node = [...sheet.querySelectorAll<HTMLElement>('[data-pdf-ink-line] span')].find(el => el.childNodes.length === 1 && el.textContent?.trim() === value);
              if (!node) return [];
              const r = node.getBoundingClientRect(), s = getComputedStyle(node);
              return [{ value, left: r.left - pageRect.left + 48, right: r.right - pageRect.left + 48, top: r.top - pageRect.top + 48, bottom: r.bottom - pageRect.top + 48, colour: s.color, fill: s.webkitTextFillColor }];
            });
            return { runs, lines };
          }, rows.flatMap(row => row.values));
          printRuns = data.runs; printedLines = data.lines;
          return print(options);
        });
        return page;
      });
      return browser;
    });
  });
  afterAll(() => vi.restoreAllMocks());

  it("preserves reverse, red, blue and default pixels and editor line breaks in three scripts", async () => {
    const browser = await launch({ executablePath: chrome, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://127.0.0.1:3000/tools/document-studio", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".ProseMirror");
    await page.waitForFunction(() => Boolean(localStorage.getItem("qalam-document-studio-active-document-v1")));
    await page.$eval(".ProseMirror", (element, content) => {
      (element as HTMLElement & { editor: { commands: { setContent: (value: unknown) => void } } }).editor.commands.setContent(content);
    }, doc);
    await page.evaluate(() => document.fonts.ready);
    const editorLines = await page.$$eval(".ProseMirror p", blocks => blocks.flatMap(block => {
      const canvas = document.createElement("canvas").getContext("2d")!;
      const lines: Array<{ baseline: number; text: string }> = [];
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text, parent = node.parentElement!;
        const style = getComputedStyle(parent); canvas.font = style.font;
        let shift = 0;
        for (let el: HTMLElement | null = parent; el && el !== block; el = el.parentElement) {
          const css = getComputedStyle(el); if (css.position === "relative") shift += parseFloat(css.top) || 0;
        }
        for (let i = 0; i < node.length;) {
          const end = i + ((node.data.codePointAt(i) ?? 0) > 0xffff ? 2 : 1);
          const char = node.data.slice(i, end), range = document.createRange(); range.setStart(node, i); range.setEnd(node, end);
          const baseline = range.getBoundingClientRect().top - shift + canvas.measureText(char).fontBoundingBoxAscent;
          let line = lines.at(-1);
          if (!line || (!/^\s$/u.test(char) && Math.abs(line.baseline - baseline) > 1)) { line = { baseline, text: "" }; lines.push(line); }
          line.text += char; i = end;
        }
      }
      return lines.map(line => line.text);
    }));
    expect(editorLines.length).toBeGreaterThan(rows.length + 1);
    await browser.close();

    const settings = withStudioOpeningMargins(defaultDocumentSettings());
    settings.headerFooter.headerEnabled = false; settings.headerFooter.footerEnabled = false;
    const response = await POST(new NextRequest("http://localhost/api/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc, dir: "rtl", settings }) }));
    expect(response.status, await response.clone().text().then(s => s.slice(0, 300))).toBe(200);
    expect(printedLines.map(s => s.trim())).toEqual(editorLines.map(s => s.trim()));
    expect(printRuns).toHaveLength(12);
    const pdf = Buffer.from(await response.arrayBuffer()); writeFileSync(join(dir, "colours.pdf"), pdf);
    execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-singlefile", "-r", "96", "-png", join(dir, "colours.pdf"), join(dir, "colours")]);
    const image = sharp(readFileSync(join(dir, "colours.png"))).removeAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    for (const row of rows) for (const [index, value] of row.values.entries()) {
      const run = printRuns.find(item => item.value === value)!;
      const counts = { red: 0, blue: 0, black: 0, white: 0, whiteOnBlack: 0, whiteInterior: 0 };
      for (let y = Math.max(0, Math.floor(run.top)); y < Math.min(info.height, Math.ceil(run.bottom)); y++) for (let x = Math.max(0, Math.floor(run.left)); x < Math.min(info.width, Math.ceil(run.right)); x++) {
        const pos = (y * info.width + x) * 3, [r, g, b] = [data[pos], data[pos + 1], data[pos + 2]];
        if (r > 160 && g < 90 && b < 90) counts.red++;
        if (b > 160 && r < 90 && g < 90) counts.blue++;
        if (r < 60 && g < 60 && b < 60) counts.black++;
        if (r > 230 && g > 230 && b > 230) {
          counts.white++;
          let dark = 0;
          for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) {
            const qx = x + dx, qy = y + dy;
            if (qx < 0 || qy < 0 || qx >= info.width || qy >= info.height) continue;
            const q = (qy * info.width + qx) * 3;
            if (data[q] < 60 && data[q + 1] < 60 && data[q + 2] < 60) dark++;
          }
          if (dark >= 2) counts.whiteOnBlack++;
        }
      }
      if (index === 0) {
        for (let y = Math.max(0, Math.floor(run.top)); y < Math.min(info.height, Math.ceil(run.bottom)); y++) {
          const black: number[] = [];
          for (let x = Math.max(0, Math.floor(run.left)); x < Math.min(info.width, Math.ceil(run.right)); x++) {
            const p = (y * info.width + x) * 3;
            if (data[p] < 60 && data[p + 1] < 60 && data[p + 2] < 60) black.push(x);
          }
          if (black.length < 4) continue;
          for (let x = black[0] + 2; x < black[black.length - 1] - 1; x++) {
            const p = (y * info.width + x) * 3;
            if (data[p] > 230 && data[p + 1] > 230 && data[p + 2] > 230) counts.whiteInterior++;
          }
        }
        expect(counts.black, `${row.font} reverse background`).toBeGreaterThan(30);
        expect(counts.whiteInterior, `${row.font} white glyph pixels inside black`).toBeGreaterThan(5);
        expect(run.fill, `${row.font} reverse fill`).toBe("rgb(255, 255, 255)");
      }
      if (index === 1) expect(counts.red, `${row.font} red pixels`).toBeGreaterThan(5);
      if (index === 2) expect(counts.blue, `${row.font} blue pixels`).toBeGreaterThan(5);
      if (index === 3) expect(counts.black, `${row.font} default pixels`).toBeGreaterThan(5);
    }
  }, 120_000);
});
