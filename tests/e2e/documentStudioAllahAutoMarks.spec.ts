import { expect, test, type Page } from "@playwright/test";

async function clear(page: Page) {
  await page.locator('[data-studio-tool-button="text"]').click();
  await page.locator(".ProseMirror").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
}

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await clear(page);
});

test("typed complete Allah words get only the missing marks; other words stay unchanged", async ({ page }, testInfo) => {
  const cases = [
    ["اللہ", "اللّٰہ"], ["الله", "اللّٰه"], ["ٱللہ", "ٱللّٰہ"],
    ["واللہ", "واللّٰہ"], ["باللہ", "باللّٰہ"], ["للہ", "للّٰہ"], ["اللہم", "اللّٰہم"],
    ["اللّٰہ", "اللّٰہ"], ["اللّہ", "اللّٰہ"], ["اللّٰہ", "اللّٰہ"],
    ["اللَّهْو", "اللَّهْو"], ["اللَّهَب", "اللَّهَب"], ["الٰہ", "الٰہ"], ["الہام", "الہام"],
  ];
  for (const [input, output] of cases) {
    await clear(page);
    await page.keyboard.insertText(input);
    expect(await page.locator(".ProseMirror").textContent()).toBe(input);
    await page.keyboard.press("Space");
    await expect(page.locator(".ProseMirror")).toHaveText(output + " ", { useInnerText: false });
    expect(await page.locator(".ProseMirror").textContent()).toBe(output + " ");
  }
  await clear(page);
  await page.keyboard.insertText("اللہ الله ٱللہ واللہ باللہ للہ اللہم");
  await page.keyboard.press("Space");
  await page.screenshot({ path: testInfo.outputPath("allah-auto-marks.png") });
});

test("auto marks are one separate undo step after space, punctuation and Enter", async ({ page }) => {
  for (const key of ["Space", "Enter", "،"]) {
    await clear(page);
    await page.keyboard.insertText("اللہ");
    if (key === "،") await page.keyboard.insertText(key);
    else await page.keyboard.press(key);
    await expect(page.locator(".ProseMirror")).toContainText("اللّٰہ");
    await page.keyboard.press("Control+z");
    await expect(page.locator(".ProseMirror")).toContainText("اللہ");
    expect(await page.locator(".ProseMirror").textContent()).not.toContain("ّٰ");
    if (key === "Enter") expect(await page.locator(".ProseMirror p").count()).toBe(2);
    else expect(await page.locator(".ProseMirror").textContent()).toBe("اللہ" + (key === "Space" ? " " : key));
    await page.keyboard.press("Control+Shift+z");
    await expect(page.locator(".ProseMirror")).toContainText("اللّٰہ");
  }
});

test("real clipboard paste handles multiple paragraphs and can undo only the auto marks", async ({ page }) => {
  const original = "اللہ الله\nاللّہ اللَّهَب\nواللہ";
  await page.evaluate(text => navigator.clipboard.writeText(text), original);
  await page.keyboard.press("Control+v");
  await expect(page.locator(".ProseMirror")).toContainText("اللّٰہ اللّٰه");
  await expect(page.locator(".ProseMirror")).toContainText("واللّٰہ");
  expect(await page.locator(".ProseMirror p").allTextContents()).toEqual(["اللّٰہ اللّٰه", "اللّٰہ اللَّهَب", "واللّٰہ"]);
  await page.keyboard.press("Control+z");
  expect(await page.locator(".ProseMirror p").allTextContents()).toEqual(original.split("\n"));
});
