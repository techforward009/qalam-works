import { expect, test } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { defaultDocumentSettings } from "../../app/tools/document-studio/utils/documentSettings";

test("Digital Khatt kasra mark sets render in the editor and a real-text PDF", async ({ page }, info) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await expect(editor).toHaveAttribute("data-studio-font-layout", "ready");
  await editor.evaluate(el => {
    const e = (el as HTMLElement & { editor: Editor }).editor;
    e.commands.setContent({ type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl", textAlign: "center" }, content: [{
      type: "text", text: "رَبِّ الۡعٰلَمِیۡنَ", marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak", fontSize: "48pt" } }],
    }] }] });
    e.commands.setTextSelection(1);
  });
  await page.evaluate(async () => { await document.fonts.load('48pt "Digital Khatt Indo-Pak"'); await document.fonts.ready; });
  await page.addStyleTag({ content: "[data-studio-caret]{visibility:hidden!important}" });
  const doc = await editor.evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
  const settings = defaultDocumentSettings();
  settings.page.margins = { preset: "custom", topMm: 12.7, bottomMm: 12.7, startMm: 12.7, endMm: 12.7 };
  settings.headerFooter = { ...settings.headerFooter, headerEnabled: false, footerEnabled: false, pageNumbers: "none" };
  const response = await page.request.post("/api/export-pdf", { data: { doc, dir: "rtl", settings } });
  expect(response.status(), response.status() === 200 ? "PDF exported" : await response.text()).toBe(200);
  const pdf = info.outputPath("kasra.pdf"), prefix = info.outputPath("pdf-page");
  writeFileSync(pdf, await response.body());
  const fonts = execFileSync("pdffonts", [pdf], { encoding: "utf8" });
  const digital = fonts.split("\n").find(line => line.includes("DigitalKhattIndoPakQalam-Regular"));
  expect(digital).toContain("CID TrueType");
  expect(digital).toMatch(/Identity-H\s+yes\s+yes\s+yes/);
  expect(fonts).not.toMatch(/Type 3/);
  await info.attach("pdffonts.txt", { body: fonts, contentType: "text/plain" });
  execFileSync("pdftoppm", ["-f", "1", "-singlefile", "-r", "96", "-png", pdf, prefix]);
  const rect = (await editor.locator("p").boundingBox())!;
  const width = Math.ceil(rect.width) + 64, height = Math.ceil(rect.height) + 80;
  const editorImage = await page.screenshot({ scale: "css", clip: { x: Math.floor(rect.x) - 32, y: Math.floor(rect.y) - 20, width, height } });
  const pdfImage = await sharp(`${prefix}.png`).extract({ left: 16, top: 28, width, height }).toBuffer();
  const label = Buffer.from(`<svg width="${width * 2 + 16}" height="28"><text x="8" y="19" font-size="15">Qalam Page editor — restored Digital Khatt mark sets</text><text x="${width + 24}" y="19" font-size="15">Downloaded PDF — CID TrueType text</text></svg>`);
  await sharp({ create: { width: width * 2 + 16, height: height + 28, channels: 3, background: "#fff" } })
    .composite([{ input: label, top: 0, left: 0 }, { input: editorImage, top: 28, left: 0 }, { input: pdfImage, top: 28, left: width + 16 }])
    .png().toFile(info.outputPath("editor-vs-pdf.png"));
});
