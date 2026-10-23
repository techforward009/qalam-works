import { expect, test } from "@playwright/test";

for (const zoom of [100, 200]) {
  test(`first line and selection start at the frame top at ${zoom}%`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/tools/document-studio");
    const story = page.locator(".ProseMirror");
    await expect(story).toBeEditable();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
    await page.locator('[data-studio-tool-button="text"]').click();
    await story.click();
    await page.keyboard.type("ترجمہ قرآن");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("السلام علیکم اللہ وبرکاتہ");
    await page.keyboard.press("Control+A");
    await page.locator('[data-studio-font-family]').selectOption({ label: "Mehr Nastaliq Web" });
    await page.locator('[data-studio-font-size]').selectOption("24");
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    // Exercise the same sheet transform at 200% without adding a new UI preset.
    await page.locator('[data-studio-zoom-surface]').evaluate((surface, zoom) => {
      (surface as HTMLElement).style.transform = `scale(${zoom / 100})`;
      window.dispatchEvent(new Event("resize"));
      document.dispatchEvent(new Event("selectionchange"));
    }, zoom);
    await expect.poll(() => page.evaluate(() => {
      const prose = document.querySelector<HTMLElement>(".ProseMirror")!;
      const naturalWidth = parseFloat(getComputedStyle(prose).width);
      const scale = prose.getBoundingClientRect().width / naturalWidth;
      const frameTop = prose.getBoundingClientRect().top + parseFloat(getComputedStyle(prose).paddingTop) * scale;
      const paragraph = prose.querySelector("p")!;
      const range = document.createRange(); range.selectNodeContents(paragraph);
      const lineTop = Math.min(...[...range.getClientRects()].filter(rect => rect.width > 0).map(rect => rect.top));
      const boxes = [...document.querySelectorAll("[data-studio-line-selection]")].map(el => el.getBoundingClientRect()).sort((a,b) => a.top-b.top);
      if (boxes.length !== 2) return false;
      return Math.abs(lineTop - frameTop) <= 1 && Math.abs(boxes[0].top - frameTop) <= 1
        && boxes[0].bottom <= boxes[1].top + 0.1;
    })).toBe(true);
    await expect(story).toHaveText("ترجمہ قرآنالسلام علیکم اللہ وبرکاتہ");
  });

  test(`text box retains padding and native selection at ${zoom}%`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/tools/document-studio");
    await expect(page.locator(".ProseMirror")).toBeEditable();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
    await page.locator('[data-studio-tool-button="textbox"]').click();
    const paper = (await page.locator('[data-studio-page-paper]').first().boundingBox())!;
    await page.mouse.move(paper.x + 100, paper.y + 100);
    await page.mouse.down();
    await page.mouse.move(paper.x + 380, paper.y + 250, { steps: 8 });
    await page.mouse.up();
    const box = page.getByRole("textbox", { name: "Text box", exact: true });
    await expect(box).toBeFocused();
    await page.keyboard.type("ترجمہ قرآن\nالسلام علیکم");
    await page.keyboard.press("Control+A");
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.locator('[data-studio-zoom-surface]').evaluate((surface, zoom) => {
      (surface as HTMLElement).style.transform = `scale(${zoom / 100})`;
      window.dispatchEvent(new Event("resize"));
      document.dispatchEvent(new Event("selectionchange"));
    }, zoom);
    // Textareas retain their original inset/wrapping and native selection.
    await expect(box).toHaveCSS("padding", "2px");
    await expect(page.locator("[data-studio-line-selection]")).toHaveCount(0);
    await expect(box).toHaveValue("ترجمہ قرآن\nالسلام علیکم");
    expect(await box.evaluate(el => (el as HTMLTextAreaElement).selectionEnd - (el as HTMLTextAreaElement).selectionStart)).toBeGreaterThan(0);
  });
}

test("a new page starts its first selected line at the top margin", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/tools/document-studio");
  const story = page.locator(".ProseMirror");
  await expect(story).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await page.locator('[data-studio-tool-button="text"]').click();
  await story.click();
  await page.keyboard.insertText(Array(65).fill("السلام علیکم اللہ وبرکاتہ").join("\n"));
  await page.keyboard.press("Control+A");
  await expect(page.locator('[data-studio-page-paper="2"]')).toBeAttached();
  await page.locator('[data-studio-page-paper="2"]').evaluate(paper => {
    const scroller = document.querySelector<HTMLElement>('[data-studio-scroller]')!;
    scroller.scrollTop += paper.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 10;
  });
  await expect.poll(() => page.evaluate(() => {
    const prose = document.querySelector<HTMLElement>(".ProseMirror")!;
    const paper = document.querySelectorAll("[data-studio-page-paper]")[1].getBoundingClientRect();
    const top = paper.top + parseFloat(getComputedStyle(prose).paddingTop);
    const boxes = [...document.querySelectorAll("[data-studio-line-selection]")].map(el => el.getBoundingClientRect());
    return boxes.length ? Math.min(...boxes.map(box => Math.abs(box.top - top))) : 999;
  })).toBeLessThanOrEqual(1);
});
