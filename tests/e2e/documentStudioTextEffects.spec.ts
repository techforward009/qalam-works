import { expect, test } from "@playwright/test";
import { join } from "node:path";

test("Arabic font selection makes one box per visual line and uninterrupted underlines", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeEditable();
  await page.locator('[data-studio-tool-button="text"]').click();
  await editor.click();
  await page.keyboard.insertText("قُلِ اللّٰهُمَّ مَالِكَ الْمُلْكِ تُؤْتِي الْمُلْكَ مَنْ تَشَاءُ وَتَنْزِعُ الْمُلْكَ مِمَّنْ تَشَاءُ");
  await page.keyboard.press("Control+A");
  await page.locator('[data-studio-font-family]').selectOption({ label: "Digital Khatt Indo-Pak" });
  await page.locator('[data-studio-text-style]').click();
  await page.locator('[data-studio-text-style-option="box"]').click();
  await expect.poll(() => editor.locator('[data-text-effect="box"]').count()).toBeGreaterThan(0);
  const box = page.locator('[data-studio-effect-line="box"]');
  await expect(box).toHaveCount(1);
  await expect(box).toHaveCSS("border-top-style", "solid");
  const boxHeight = (await box.boundingBox())!.height;
  const lineHeight = await editor.locator("p").first().evaluate(node => parseFloat(getComputedStyle(node).lineHeight));
  const boxFitsLine = boxHeight <= lineHeight + 1;
  expect(boxFitsLine).toBe(true);
  await page.locator('[data-studio-text-style]').click();
  await page.locator('[data-studio-text-style-option="single"]').click();
  const underlined = editor.locator('[data-text-effect="single"]').first();
  await expect(underlined).toHaveCSS("text-decoration-skip-ink", "none");
});

test("saved split runs have continuous line-height effects and track first-line paint", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await editor.evaluate((element) => {
    const editor = (element as HTMLElement & { editor: { commands: { setContent: (content: unknown) => void } } }).editor;
    const paragraph = (effect: string, words: string[]) => ({ type: "paragraph", attrs: { dir: "rtl" }, content: words.map((text, index) => ({
      type: "text", text, marks: [{ type: "textStyle", attrs: { textEffect: effect, fontFamily: "Digital Khatt Indo-Pak", fontSize: "24pt", color: index % 2 ? "#222222" : "#000000" } }],
    })) });
    editor.commands.setContent({ type: "doc", content: [
      paragraph("box", ["قُلِ اللّٰهُمَّ ", "مَالِكَ ", "الْمُلْكِ"]),
      paragraph("overline", ["تُؤْتِي ", "الْمُلْكَ ", "مَنْ تَشَاءُ"]),
      paragraph("pattern", ["وَتَنْزِعُ ", "الْمُلْكَ ", "مِمَّنْ تَشَاءُ"]),
      paragraph("reverse", ["بِيَدِكَ ", "الْخَيْرُ ", "إِنَّكَ قَدِيرٌ"]),
      paragraph("single", ["اردو عبارت ", "English words ", "Arabic يَهْدِي"]),
    ] });
  });
  await expect(editor).toHaveAttribute("data-studio-font-layout", "ready");
  for (const [index, effect] of ["box", "overline", "pattern", "reverse"].entries()) {
    const line = page.locator(`[data-studio-effect-line="${effect}"]`);
    await expect(line).toHaveCount(1);
    const paragraph = editor.locator("p").nth(index);
    expect(await paragraph.locator(`[data-text-effect="${effect}"]`).count()).toBeGreaterThan(1);
    const lineBox = (await line.boundingBox())!;
    const bounds = await paragraph.evaluate(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 1 && rect.height > 1);
      const text = document.createTreeWalker(node, NodeFilter.SHOW_TEXT).nextNode() as Text;
      const textRange = document.createRange(); textRange.selectNodeContents(text);
      const style = getComputedStyle(text.parentElement!);
      const canvas = document.createElement("canvas").getContext("2d")!; canvas.font = style.font;
      const baseline = textRange.getBoundingClientRect().top + canvas.measureText(text.data).fontBoundingBoxAscent;
      return { left: Math.min(...rects.map(rect => rect.left)), right: Math.max(...rects.map(rect => rect.right)),
        lineHeight: parseFloat(getComputedStyle(node).lineHeight), top: node.getBoundingClientRect().top, baseline };
    });
    expect(lineBox.height).toBeLessThanOrEqual(bounds.lineHeight + 1);
    expect(Math.abs(lineBox.x - bounds.left)).toBeLessThan(3);
    expect(Math.abs(lineBox.x + lineBox.width - bounds.right)).toBeLessThan(3);
    expect(Math.abs(lineBox.y - bounds.top)).toBeLessThan(bounds.lineHeight);
    expect(Math.abs(lineBox.y + lineBox.height * 0.8 - bounds.baseline)).toBeLessThan(2);
  }
  await expect(editor.locator('[data-text-effect="single"]').first()).toHaveCSS("text-decoration-skip-ink", "none");
  if (process.env.QALAM_EFFECTS_SCREENSHOT_DIR) {
    await editor.screenshot({ path: join(process.env.QALAM_EFFECTS_SCREENSHOT_DIR, "text-effects.png") });
  }
});

test("saved split box stays continuous on every wrapped line", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await editor.evaluate((element) => {
    const editor = (element as HTMLElement & { editor: { commands: { setContent: (content: unknown) => void } } }).editor;
    const words = Array.from({ length: 28 }, (_, index) => index % 2 ? "مَالِكَ الْمُلْكِ " : "قُلِ اللّٰهُمَّ ");
    editor.commands.setContent({ type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: words.map((text, index) => ({
      type: "text", text, marks: [{ type: "textStyle", attrs: { textEffect: "box", fontFamily: "Digital Khatt Indo-Pak", fontSize: "24pt", color: index % 2 ? "#222222" : "#000000" } }],
    })) }] });
  });
  await page.locator("[data-studio-scroller]").evaluate(element => { element.scrollTop = 0; });
  await expect(editor).toHaveAttribute("data-studio-font-layout", "ready");
  const boxes = page.locator('[data-studio-effect-line="box"]');
  await expect.poll(() => boxes.count()).toBeGreaterThan(1);
  const metrics = await editor.locator("p").first().evaluate(node => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const baselines: number[] = [];
    const canvas = document.createElement("canvas").getContext("2d")!;
    while (walker.nextNode()) {
      const text = walker.currentNode as Text;
      const style = getComputedStyle(text.parentElement!); canvas.font = style.font;
      const ascent = canvas.measureText(text.data).fontBoundingBoxAscent;
      const range = document.createRange(); range.selectNodeContents(text);
      for (const rect of range.getClientRects()) if (rect.width > 0 && !baselines.some(value => Math.abs(value - (rect.top + ascent)) < 10)) baselines.push(rect.top + ascent);
    }
    baselines.sort((a, b) => a - b);
    return { baselines, lineHeight: parseFloat(getComputedStyle(node).lineHeight) };
  });
  expect(metrics.baselines.length).toBeGreaterThan(1);
  const collision = Array.from({ length: Math.ceil(metrics.lineHeight * 2) }, (_, i) => i + 1).find(offset =>
    Math.round((metrics.baselines[0] - offset) / metrics.lineHeight) === Math.round((metrics.baselines[1] - offset) / metrics.lineHeight),
  );
  expect(collision).toBeDefined();
  const scroller = page.locator("[data-studio-scroller]");
  for (const offset of [0, collision!, collision! + 15]) {
    await scroller.evaluate((element, y) => { element.scrollTop = y; }, offset);
    await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(offset);
    await expect.poll(() => boxes.count()).toBe(metrics.baselines.length);
    const data = await boxes.evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom };
    }));
    data.sort((a, b) => a.top - b.top);
    expect(new Set(data.map(rect => Math.round(rect.top))).size).toBe(data.length);
  }
  if (process.env.QALAM_EFFECTS_SCROLL_SCREENSHOT_DIR) {
    await page.screenshot({ path: join(process.env.QALAM_EFFECTS_SCROLL_SCREENSHOT_DIR, "wrapped-effects.png") });
  }
});
