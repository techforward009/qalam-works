import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test, expect, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import { arabicAyat, urduAyat, arabicWords, urduWords } from "../fixtures/digitalKhatt/aalImran";

const evidence = process.env.QALAM_FONT_EVIDENCE_DIR ?? join(tmpdir(), "qalam-digital-khatt-evidence");
async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await expect(page.locator(".ProseMirror")).toBeEditable();
}
async function setDigital(page: Page, texts: string[]) {
  await page.locator(".ProseMirror").evaluate((element, values) => {
    const editor = (element as HTMLElement & { editor: Editor }).editor;
    editor.commands.setContent({ type: "doc", content: values.map(text => ({
      type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text,
        marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak", fontSize: "24pt" } }] }],
    })) });
    editor.commands.setTextSelection(1);
    editor.commands.blur();
  }, texts);
  await page.evaluate(async () => {
    await document.fonts.load('24pt "Digital Khatt Indo-Pak"');
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await expect(page.locator(".ProseMirror")).toHaveText(texts.join(""));
}
async function fonts(page: Page) {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("DOM.enable"); await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeIds } = await session.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: ".ProseMirror p, .ProseMirror p *" });
    const used = [];
    for (const nodeId of nodeIds) {
      const result = await session.send("CSS.getPlatformFontsForNode", { nodeId });
      used.push(...result.fonts.filter(face => face.glyphCount > 0));
    }
    expect(used.length).toBeGreaterThan(0);
    expect(used.every(face => /DigitalKhattIndoPakQalam/i.test(face.postScriptName))).toBe(true);
    return used;
  } finally { await session.detach(); }
}

test("Digital Khatt Urdu Quran uses one font and matches Arabic pixels", async ({ page }) => {
  await open(page); mkdirSync(evidence, { recursive: true });
  await page.addStyleTag({ content: "[data-studio-caret],[data-studio-line-selection]{visibility:hidden!important}.ProseMirror{caret-color:transparent!important}" });
  const editor = page.locator(".ProseMirror");
  await setDigital(page, urduAyat);
  const before = await page.addStyleTag({ content: '@font-face{font-family:"DigitalKhattBefore";src:url("/fonts/DigitalKhattIndoPakRegular.woff2")} .ProseMirror,.ProseMirror *{font-family:"DigitalKhattBefore","Noto Naskh Arabic",serif!important}' });
  await page.evaluate(async () => { await document.fonts.load('24pt "DigitalKhattBefore"'); await document.fonts.ready; });
  const beforePixels = await editor.screenshot({ path: join(evidence, "aal-imran-before.png"), animations: "disabled" });
  await before.evaluate(element => element.parentNode?.removeChild(element));
  await setDigital(page, urduAyat);
  const used = await fonts(page);
  const after = await editor.screenshot({ path: join(evidence, "aal-imran-after.png"), animations: "disabled" });
  expect(beforePixels.equals(after)).toBe(false);
  await setDigital(page, arabicAyat);
  const arabic = await editor.screenshot({ path: join(evidence, "aal-imran-arabic.png"), animations: "disabled" });
  expect(after.equals(arabic)).toBe(true);
  await setDigital(page, [urduWords]); await fonts(page);
  const words = await editor.screenshot({ animations: "disabled" });
  await setDigital(page, [arabicWords]); await fonts(page);
  expect(words.equals(await editor.screenshot({ animations: "disabled" }))).toBe(true);
  writeFileSync(join(evidence, "platform-fonts.json"), JSON.stringify(used, null, 2));
});

test("everyday editor use and digital PDF export", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  const editor = page.locator(".ProseMirror");
  await editor.focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.insertText("یہ اردو کی عبارت ہے جسے ہم روز لکھتے اور پڑھتے ہیں");
    await page.keyboard.press("Enter");
  }
  await page.locator('[data-studio-font-family]').selectOption({ label: "Digital Khatt Indo-Pak" });
  await editor.focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.insertText("یہ کلام اللہ کا ہے"); await page.keyboard.press("Enter");
  }
  // Actual Enter key pagination, rather than injecting a page break.
  for (let i = 0; i < 55; i++) await page.keyboard.press("Enter");
  await page.keyboard.insertText("یہ کلام اللہ کا ہے");
  await expect.poll(() => page.locator('[data-studio-page-sheet]').count()).toBeGreaterThanOrEqual(2);
  // Separate the rapid synthetic typing from deletion into a normal undo step.
  await page.waitForTimeout(600);
  const beforeDelete = await editor.textContent();
  await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace");
  await expect(editor).toHaveText("");
  await page.keyboard.press("Control+Z"); await expect(editor).toHaveText(beforeDelete ?? "");
  const menus = await page.locator('[data-menu-root]').evaluateAll(elements => elements.map(e => e.getAttribute("data-menu-root")!));
  for (const menu of menus) {
    await page.locator(`[data-menu-root="${menu}"]`).click();
    await expect(page.getByRole("menu").first()).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.locator('[data-menu-root="view"]').click();
  await page.locator('[data-menu-action="view.fullscreen"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await editor.focus(); await page.keyboard.press("Control+A");
  await page.locator('[data-studio-font-size]').selectOption("20");
  await page.getByLabel("Colour", { exact: true }).selectOption("#1D4ED8");
  await expect(editor.locator('span[style*="color"]').first()).toHaveCSS("color", "rgb(29, 78, 216)");
  await page.getByRole("button", { name: "Text direction", exact: true }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("dir", "ltr");
  await page.getByRole("button", { name: "Right to left", exact: true }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("dir", "rtl");
  for (const value of ["50", "100", "200"]) {
    await page.locator('[data-studio-zoom-control]').selectOption(value);
    await expect(page.locator('[data-studio-print-root]')).toHaveAttribute("data-studio-zoom", value);
  }
  for (const view of ["pageless", "pages"]) {
    await page.locator('[data-menu-root="view"]').click();
    await page.locator(`[data-menu-action="view.${view}"]`).click();
    await expect(page.locator('[data-studio-print-root]')).toHaveAttribute("data-studio-view", view);
  }
  await setDigital(page, urduAyat);
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-submenu="file.download"]').hover();
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator('[data-menu-action="file.downloadPdf"]').click()]);
  expect(await download.failure()).toBeNull();
  mkdirSync(evidence, { recursive: true });
  await download.saveAs(join(evidence, "aal-imran-digital.pdf"));
});
