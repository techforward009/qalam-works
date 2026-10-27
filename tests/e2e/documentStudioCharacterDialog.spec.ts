import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { POST as exportPdf } from "../../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../../app/tools/document-studio/utils/documentSettings";

const story = ".ProseMirror";

async function open(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(story)).toBeEditable();
  // The local library applies the opening record asynchronously after TipTap mounts.
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await expect(page.locator(story)).toHaveAttribute("data-studio-font-layout", "ready");
}

async function openCharacter(page: Page) {
  await page.locator(story).evaluate((el) => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.selectAll();
    const rect = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.left + 24, clientY: rect.top + 14 }));
  });
  await page.getByRole("menuitem", { name: "Character…", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Character", exact: true })).toBeVisible();
}

test("mixed sizes stay when only scaling changes, undo once, and cancel", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "character dialog is covered on desktop");
  await open(page);
  await page.locator(story).click();
  await page.keyboard.insertText("سلام");
  await openCharacter(page);
  const dialog = page.getByRole("dialog", { name: "Character", exact: true });
  const box = await dialog.boundingBox();
  expect(Math.round(box?.width ?? 0)).toBe(390);
  expect(Math.round(box?.height ?? 0)).toBe(270);
  await dialog.screenshot({ path: "/workspace/screenshots/character-dialog.png" });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.locator(story).evaluate((el) => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.setContent({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [
          { type: "text", text: "پہلا", marks: [{ type: "textStyle", attrs: { fontSize: "18pt" } }] },
          { type: "text", text: " " },
          { type: "text", text: "دوسرا", marks: [{ type: "textStyle", attrs: { fontSize: "36pt" } }] },
        ],
      }],
    });
  });
  await openCharacter(page);
  await expect(dialog.getByLabel("Size", { exact: true })).toHaveValue("");
  await expect(dialog.getByLabel("Scaling", { exact: true })).toHaveValue("100%");
  await dialog.getByLabel("Scaling", { exact: true }).fill("80%");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(dialog).toBeHidden();
  const first = page.locator(`${story} span[style*="font-size"]`, { hasText: "پہلا" });
  const second = page.locator(`${story} span[style*="font-size"]`, { hasText: "دوسرا" });
  await expect(first).toHaveAttribute("data-char-scale", "80");
  await expect(second).toHaveAttribute("data-char-scale", "80");
  await expect(first).toHaveAttribute("data-scale", "80");
  await expect(second).toHaveAttribute("data-scale", "80");
  await expect(first).toHaveAttribute("style", /font-size:\s*18pt/);
  await expect(second).toHaveAttribute("style", /font-size:\s*36pt/);
  await page.locator(story).focus();
  await page.keyboard.press("Control+z");
  await expect(first).not.toHaveAttribute("data-char-scale", "80");
  await expect(second).not.toHaveAttribute("data-char-scale", "80");
  await expect(first).toHaveAttribute("style", /font-size:\s*18pt/);
  await expect(second).toHaveAttribute("style", /font-size:\s*36pt/);
  await openCharacter(page);
  await dialog.getByLabel("Scaling", { exact: true }).fill("50%");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(first).not.toHaveAttribute("data-char-scale", "50");
  await expect(second).not.toHaveAttribute("data-char-scale", "50");
  await expect(first).toHaveAttribute("style", /font-size:\s*18pt/);
  await expect(second).toHaveAttribute("style", /font-size:\s*36pt/);
  await openCharacter(page);
  await dialog.getByLabel("Scaling", { exact: true }).fill("50%");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(first).not.toHaveAttribute("data-char-scale", "50");
  await expect(second).toHaveAttribute("style", /font-size:\s*36pt/);
});

test("a 3pt baseline shift keeps PDF lines from overlapping", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "character dialog is covered on desktop");
  test.setTimeout(90_000);
  await open(page);
  await page.locator(story).evaluate((el) => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { dir: "ltr" },
          content: [
            { type: "text", text: "Alpha " },
            { type: "text", text: "SHIFT", marks: [{ type: "textStyle", attrs: { baselineShift: 3 } }] },
            { type: "text", text: " Beta" },
          ],
        },
        { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Gamma line" }] },
      ],
    });
  });
  const shifted = page.locator(`${story} [data-baseline="3"]`);
  await expect(shifted).toHaveAttribute("style", /position:\s*relative/);
  await expect(shifted).toHaveAttribute("style", /top:\s*-3pt/);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/export-pdf") && response.request().method() === "POST", { timeout: 70_000 });
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-submenu="file.download"]').hover();
  await page.locator('[data-menu-action="file.downloadPdf"]').click();
  const response = await responsePromise;
  if (response.status() !== 200) throw new Error(await response.text());
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  const file = "/tmp/character-baseline.pdf";
  await download.saveAs(file);
  const raw = execFileSync("python3", ["-c", `
import json, sys
from pypdf import PdfReader
items = []
def visitor(text, cm, tm, font_dict, font_size):
    if text:
        items.append({"text": text, "x": float(tm[4]), "y": float(tm[5])})
reader = PdfReader(sys.argv[1])
for pdf_page in reader.pages:
    pdf_page.extract_text(visitor_text=visitor)
print(json.dumps(items))
`, file], { encoding: "utf8" });
  const items = JSON.parse(raw) as { text: string; x: number; y: number }[];
  const at = (needle: string) => items.find((item) => item.text.includes(needle));
  const alpha = at("Alpha");
  const shift = at("SHIFT");
  const beta = at("Beta");
  const gamma = at("Gamma");
  expect(alpha && shift && beta && gamma).toBeTruthy();
  expect(alpha!.x).toBeLessThan(shift!.x);
  expect(shift!.x).toBeLessThan(beta!.x);
  expect(Math.abs(alpha!.y - beta!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(shift!.y - alpha!.y)).toBeLessThanOrEqual(5);
  expect(Math.abs(shift!.y - gamma!.y)).toBeGreaterThan(8);
});

const LAYOUT = [
  ["ok", 309, 5, 60, 23],
  ["cancel", 309, 31, 60, 23],
  ["help", 309, 57, 60, 23],
  ["size", 38, 5, 113, 21],
  ["style", 191, 5, 113, 21],
  ["color", 38, 29, 113, 20],
  ["hatch", 191, 29, 113, 20],
  ["latinFont", 95, 54, 210, 20],
  ["urduFont", 95, 83, 210, 21],
  ["language", 95, 109, 210, 21],
  ["kashida", 239, 138, 113, 21],
  ["spacing", 47, 166, 60, 20],
  ["scaling", 155, 166, 60, 20],
  ["baseline", 293, 166, 60, 20],
  ["bold", 2, 146, 13, 13],
  ["italics", 50, 146, 13, 13],
  ["outline", 105, 146, 13, 13],
  ["meem", 5, 198, 13, 13],
  ["be", 62, 198, 13, 13],
  ["jeem", 104, 199, 13, 13],
  ["ain", 155, 199, 13, 13],
  ["kaaf", 194, 199, 13, 13],
] as const;

test("character dialog layout matches InPage 3", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "character dialog is covered on desktop");
  await open(page);
  await page.locator(story).click();
  await page.keyboard.insertText("سلام");
  await openCharacter(page);
  const dialog = page.getByRole("dialog", { name: "Character", exact: true });
  await expect(dialog.getByLabel("Size", { exact: true })).toBeFocused();
  const client = await page.locator("[data-character-client]").boundingBox();
  expect(Math.abs((client?.width ?? 0) - 374)).toBeLessThanOrEqual(1);
  expect(Math.abs((client?.height ?? 0) - 232)).toBeLessThanOrEqual(1);
  await dialog.screenshot({ path: "/workspace/screenshots/character-dialog-inpage-layout.png" });
  for (const [id, x, y, w, h] of LAYOUT) {
    const box = await page.locator(`[data-character-box="${id}"]`).boundingBox();
    expect(box, id).toBeTruthy();
    expect(Math.abs(box!.x - client!.x - x), `${id} x`).toBeLessThanOrEqual(2);
    expect(Math.abs(box!.y - client!.y - y), `${id} y`).toBeLessThanOrEqual(2);
    expect(Math.abs(box!.width - w), `${id} w`).toBeLessThanOrEqual(2);
    expect(Math.abs(box!.height - h), `${id} h`).toBeLessThanOrEqual(2);
  }
  await expect(dialog.getByText("Re", { exact: true }).first()).toBeVisible();
  const urdu = dialog.getByLabel("Urdu Font Name", { exact: true });
  await expect(urdu.locator("option").first()).toContainText(/Mehr/);
  await expect(dialog.getByLabel("Language", { exact: true }).locator("option")).toHaveText(["Urdu", "English"]);
});

async function textWidth(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return page.locator(`${story} p`).first().evaluate((paragraph) => {
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    return range.getBoundingClientRect().width;
  });
}

test("scaling and spacing change the width of Urdu, Arabic and English", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "character dialog is covered on desktop");
  await open(page);
  const samples = [
    { text: "سلام دنیا", dir: "rtl", font: "Mehr Nastaliq Web", attr: "fontFamily" },
    { text: "كتاب كتاب", dir: "rtl", font: "Digital Khatt Indo-Pak", attr: "fontFamily" },
    { text: "Width", dir: "ltr", font: "Arial", attr: "latinFontFamily" },
  ];
  for (const sample of samples) {
    await page.locator(story).evaluate((el, item) => {
      const editor = (el as HTMLElement & { editor: Editor }).editor;
      editor.commands.setContent({
        type: "doc",
        content: [{
          type: "paragraph",
          attrs: { dir: item.dir },
          content: [{ type: "text", text: item.text, marks: [{ type: "textStyle", attrs: { [item.attr]: item.font } }] }],
        }],
      });
    }, sample);
    const before = await textWidth(page);
    await openCharacter(page);
    const dialog = page.getByRole("dialog", { name: "Character", exact: true });
    await dialog.getByLabel("Scaling", { exact: true }).fill("50%");
    await dialog.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page.locator(`${story} [data-char-scale="50"]`)).toHaveCount(1);
    expect(await textWidth(page), sample.font).toBeLessThan(before * 0.8);
    await page.locator(story).focus();
    await page.keyboard.press("Control+z");
    await expect(page.locator(`${story} [data-char-scale="50"]`)).toHaveCount(0);
    const restored = await textWidth(page);
    await openCharacter(page);
    await dialog.getByLabel("Spacing", { exact: true }).fill("80%");
    await dialog.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page.locator(`${story} [data-tracking="80"]`)).toHaveCount(1);
    expect(await textWidth(page), `${sample.font} spacing between words`).toBeGreaterThan(restored + 1);
  }
});



// Register the ink to its own bounds; a subpixel first-line paint adjustment
// must not masquerade as a shaping change. Missing joins change this mask.
async function glyphMask(png: Buffer) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels: { x: number; y: number }[] = [];
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100) pixels.push({ x, y });
  }
  const left = Math.min(...pixels.map(p => p.x)), top = Math.min(...pixels.map(p => p.y));
  return { width: Math.max(...pixels.map(p => p.x)) - left, height: Math.max(...pixels.map(p => p.y)) - top,
    pixels: pixels.map(p => ({ x: p.x - left, y: p.y - top })) };
}

// These exercise shaped words and actual wrapping, not just a run's total width.
for (const sample of [
  { font: "Mehr Nastaliq Web", dir: "rtl", word: "السلام", text: "پہلا حصہ درمیانی آخری حصہ اردو عبارت السلام علیکم " },
  { font: "Digital Khatt Indo-Pak", dir: "rtl", word: "اللّٰهُمَّ", text: "قُلِ اللّٰهُمَّ مَالِكَ الْمُلْكِ لَا إِلٰهَ إِلَّا اللّٰهُ " },
  { font: "Inter", dir: "ltr", word: "running", text: "The quick brown fox keeps running across the green field " },
]) {
  test(`${sample.font}: joined spacing, wrapping scale and keyboard selection`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-chrome", "character layout pixel checks use desktop");
    test.setTimeout(120_000);
    await open(page);
    await page.addStyleTag({ content: "[data-studio-caret]{visibility:hidden!important}" });
    const setText = async (text: string, trackingPercent: number, scalePercent: number) => {
      await page.locator(story).evaluate((el, data) => {
        (el as HTMLElement & { editor: Editor }).editor.commands.setContent({ type: "doc", content: [{
          type: "paragraph", attrs: { dir: data.dir }, content: [{ type: "text", text: data.text,
            marks: [{ type: "textStyle", attrs: { fontFamily: data.font, fontSize: "18pt", trackingPercent: data.trackingPercent,
              scalePercent: data.scalePercent, charScale: data.scalePercent } }],
          }],
        }] });
      }, { ...sample, text, trackingPercent, scalePercent });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
    };
    await setText(sample.word, 0, 100);
    const word = page.locator(`${story} p`);
    expect(await word.locator('[data-char-scale="100"]').evaluate(node => (node as HTMLElement).style.textRendering), "untracked text keeps its existing rendering").toBe("");
    // Hold scaling/precision constant to test joining independently of hinting.
    await setText(sample.word, 0, 80);
    const plain = await word.screenshot({ scale: "css" });
    await setText(sample.word, 20, 80);
    if (sample.dir === "rtl") {
      const a = await glyphMask(plain), b = await glyphMask(await word.screenshot({ scale: "css" }));
      expect(Math.abs(a.width - b.width), "joined word ink width").toBeLessThanOrEqual(1);
      expect(Math.abs(a.height - b.height), "joined word ink height").toBeLessThanOrEqual(1);
      for (const [source, target] of [[a, b], [b, a]]) {
        const mask = new Set(target.pixels.map(p => `${p.x},${p.y}`));
        const matches = source.pixels.filter(p => [-1, 0, 1].some(dx => [-1, 0, 1].some(dy => mask.has(`${p.x + dx},${p.y + dy}`)))).length;
        expect(source.pixels.length).toBeGreaterThan(100);
        expect(matches / source.pixels.length, "spacing preserves joined glyph shapes").toBeGreaterThan(.98);
      }
    }
    for (const scale of [100, 80, 130]) {
      await setText(sample.text.repeat(8), 20, scale);
      await expect(word.locator('[data-tracking="20"]').first()).toHaveCSS("text-rendering", "geometricprecision");
      const geometry = await word.evaluate(node => {
        const box = node.getBoundingClientRect();
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const lines: { top: number; left: number; right: number; text: string }[] = [];
        while (walker.nextNode()) {
          const text = walker.currentNode as Text;
          for (let i = 0; i < text.length; i++) {
            const range = document.createRange(); range.setStart(text, i); range.setEnd(text, i + 1);
            const r = range.getBoundingClientRect();
            let line = lines.find(line => Math.abs(line.top - r.top) < 2);
            if (!line) { line = { top: r.top, left: Infinity, right: -Infinity, text: "" }; lines.push(line); }
            line.text += text.data[i]; if (text.data[i].trim()) { line.left = Math.min(line.left, r.left); line.right = Math.max(line.right, r.right); }
          }
        }
        const words = Array.from(node.querySelectorAll<HTMLElement>("[data-studio-latin-scale]"))
          .filter(word => word.style.display === "inline-block")
          .map(word => { const r = word.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top }; });
        return { left: box.left, right: box.right, lines, words };
      });
      expect(geometry.lines.length, "scaled text wraps").toBeGreaterThan(2);
      for (const line of geometry.lines) {
        expect(line.left).toBeGreaterThanOrEqual(geometry.left - 1);
        expect(line.right).toBeLessThanOrEqual(geometry.right + 1);
      }
      for (const word of geometry.words) {
        const next = geometry.words.filter(other => other.left > word.left && Math.abs(other.top - word.top) < 2).sort((a,b) => a.left - b.left)[0];
        if (next) expect(word.right, "scaled words must not overlap").toBeLessThanOrEqual(next.left + 1);
      }
      await page.locator(story).evaluate(el => {
        const editor = (el as HTMLElement & { editor: Editor }).editor;
        editor.commands.focus(); editor.commands.setTextSelection(5);
      });
      let previousSelection = 0;
      for (let count = 1; count <= (scale === 100 ? 0 : 3); count++) {
        await page.keyboard.press(sample.dir === "rtl" ? "Shift+ArrowLeft" : "Shift+ArrowRight");
        const selectedLength = await page.locator(story).evaluate(el => {
          const { from, to } = (el as HTMLElement & { editor: Editor }).editor.state.selection;
          return to - from;
        });
        expect(selectedLength, "Shift+Arrow extends selection by a grapheme").toBeGreaterThan(previousSelection);
        previousSelection = selectedLength;
      }
      // Capture measured lines at the real API handler's final PDF paint step.
      // PDF text extraction reorders Arabic GPOS glyphs and inserts Latin spaces,
      // so it cannot reliably recover source word boundaries on these fonts.
      const payload = await page.locator(story).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
      const settings = defaultDocumentSettings();
      settings.page.margins = { preset: "custom", topMm: 12.7, bottomMm: 12.7, startMm: 12.7, endMm: 12.7 };
      let pdfLines: string[] = [];
      const launch = puppeteer.launch.bind(puppeteer);
      puppeteer.launch = async options => {
        const browser = await launch(options), newPage = browser.newPage.bind(browser);
        browser.newPage = async () => {
          const pdfPage = await newPage(), print = pdfPage.pdf.bind(pdfPage);
          pdfPage.pdf = async options => {
            pdfLines = await pdfPage.$$eval("[data-pdf-ink-line]", lines => lines.map(line => line.textContent ?? ""));
            return print(options);
          };
          return pdfPage;
        };
        return browser;
      };
      try {
        const response = await exportPdf(new NextRequest("http://localhost/api/export-pdf", {
          method: "POST", body: JSON.stringify({ doc: payload, dir: sample.dir, settings }),
        }));
        expect(response.status, response.status === 200 ? "PDF exported" : await response.text()).toBe(200);
        const compact = (text: string) => text.replace(/\s/g, "");
        expect(pdfLines.filter(line => line.trim()).map(compact), "PDF and editor line ends").toEqual(geometry.lines.filter(line => line.text.trim()).map(line => compact(line.text)));
        if (process.env.QALAM_CHARACTER_CAPTURE && scale === 130 && sample.dir === "rtl") {
          const pdf = info.outputPath("scaled.pdf"), prefix = info.outputPath("pdf-page");
          writeFileSync(pdf, Buffer.from(await response.arrayBuffer()));
          execFileSync("pdftoppm", ["-f", "1", "-singlefile", "-r", "96", "-png", pdf, prefix]);
          await page.locator(story).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.commands.setTextSelection(1));
          const editorImage = await word.screenshot({ scale: "css" });
          const { width, height } = await sharp(editorImage).metadata();
          const pdfImage = await sharp(`${prefix}.png`).extract({ left: 48, top: 48, width: width!, height: height! }).toBuffer();
          const labels = Buffer.from(`<svg width="${width! * 2 + 12}" height="24"><text x="8" y="17" font-size="14">Editor — Spacing 20 / Scaling 130</text><text x="${width! + 20}" y="17" font-size="14">Downloaded PDF — same settings</text></svg>`);
          await sharp({ create: { width: width! * 2 + 12, height: height! + 24, channels: 3, background: "#fff" } })
            .composite([{ input: labels, top: 0, left: 0 }, { input: editorImage, top: 24, left: 0 }, { input: pdfImage, top: 24, left: width! + 12 }])
            .png().toFile(info.outputPath("editor-pdf-comparison.png"));
        }
      } finally { puppeteer.launch = launch; }

    }
  });
}

for (const sample of [
  { font: "Mehr Nastaliq Web", text: "یہ ایک آزمائشی اردو عبارت ہے جس میں مختلف الفاظ شامل ہیں اور ہر سطر کا آخری لفظ ایک جیسا رہنا چاہیے۔ " },
  { font: "Digital Khatt Indo-Pak", text: "قُلِ اللّٰهُمَّ مَالِكَ الْمُلْكِ تُؤْتِي الْمُلْكَ مَنْ تَشَاءُ وَتَنْزِعُ الْمُلْكَ مِمَّنْ تَشَاءُ " },
]) {
  test(`${sample.font}: HTTP PDF preserves every spaced/scaled line end`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-chrome", "character PDF checks use desktop");
    test.setTimeout(120_000);
    await open(page);
    // A generous vertical pitch isolates printed glyph bands despite Nastaliq
    // overhang. Both renderers get the same pitch; horizontal wrapping is unchanged.
    // Plain untracked text is an accepted main baseline, outside this fix.
    for (const [scale, spacing] of [[130, 0], [80, 0], [100, 20], [130, 20], [80, 20]]) {
      await page.locator(story).evaluate((el, data) => {
        (el as HTMLElement & { editor: Editor }).editor.commands.setContent({ type: "doc", content: [{
          type: "paragraph", attrs: { dir: "rtl", leading: { mode: "points", value: 72 } }, content: [{
            type: "text", text: data.text.repeat(3), marks: [{ type: "textStyle", attrs: {
              fontFamily: data.font, fontSize: "18pt", charScale: data.scale === 100 ? null : data.scale,
              scalePercent: data.scale === 100 ? null : data.scale, trackingPercent: data.spacing || null,
            } }],
          }],
        }] });
      }, { ...sample, scale, spacing });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      const fixture = await page.locator(story).evaluate(el => {
        const e = (el as HTMLElement & { editor: Editor }).editor;
        const lines: { top: number; text: string }[] = [];
        const walker = document.createTreeWalker(el.querySelector("p")!, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const text = walker.currentNode as Text;
          for (let i = 0; i < text.length; i++) {
            if (!text.data[i].trim()) { if (lines.length) lines[lines.length - 1].text += " "; continue; }
            const r = document.createRange(); r.setStart(text, i); r.setEnd(text, i + 1);
            const top = r.getBoundingClientRect().top;
            let line = lines.find(line => Math.abs(line.top - top) < 2);
            if (!line) { line = { top, text: "" }; lines.push(line); }
            line.text += text.data[i];
          }
        }
        return { doc: e.getJSON(), lines: lines.map(line => line.text) };
      });
      const settings = defaultDocumentSettings();
      settings.page.margins = { preset: "custom", topMm: 12.7, bottomMm: 12.7, startMm: 12.7, endMm: 12.7 };
      settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false, pageNumbers: "none" };
      const words = [...new Set(sample.text.trim().split(/\s+/))];
      const paragraph = fixture.doc.content![0];
      // Reference words share the actual PDF's subset font. This avoids false
      // failures from Arabic ToUnicode aliases/reordered GPOS extraction while
      // checking the physical printed glyphs, not a pre-print DOM snapshot.
      const doc = { ...fixture.doc, content: [...fixture.doc.content!, { type: "pageBreak" }, ...words.map(text => ({
        ...paragraph, content: [{ ...paragraph.content![0], text }],
      }))] };
      const response = await page.request.post("/api/export-pdf", { data: { doc, dir: "rtl", settings } });
      expect(response.status(), response.status() === 200 ? "HTTP PDF exported" : await response.text()).toBe(200);
      const pdf = info.outputPath(`http-${scale}-${spacing}.pdf`);
      writeFileSync(pdf, await response.body());
      const signatures: string[][] = JSON.parse(execFileSync("python3", ["-c", `
import fitz,json,sys
lines=[]
for page in fitz.open(sys.argv[1]):
    chars=[(c[3][1],c[3][3],str((span["font"],c[1]))) for span in page.get_texttrace() for c in span["chars"] if not chr(c[0]).isspace()]
    groups=[]
    for top,bottom,glyph in sorted(chars):
        if not groups or top>groups[-1][1]+1: groups.append([top,bottom,[glyph]])
        else: groups[-1][1]=max(groups[-1][1],bottom);groups[-1][2].append(glyph)
    lines.extend(g[2] for g in groups)
print(json.dumps(lines))
`, pdf], { encoding: "utf8" }));
      const source = signatures.slice(0, -words.length), references = signatures.slice(-words.length);
      expect(source.length, `${sample.font} scale ${scale}, spacing ${spacing}: printed PDF line count`).toBe(fixture.lines.length);
      const reference = new Map(words.map((word, index) => [word, references[index]]));
      const expected = fixture.lines.map(line => line.trim().split(/\s+/).flatMap(word => reference.get(word)!).sort());
      expect(source.map(line => line.sort()), `${sample.font} scale ${scale}, spacing ${spacing}: every printed line ends on the editor's same word`).toEqual(expected);

    }
  });
}
