import { test, expect, type Page } from "@playwright/test";

/** A normal U+0020 must be stored, and the *painted* caret must advance.
 * This is not a visual-space glyph: InPage shows movement, not a dot. */
async function paintedCaret(page: Page) {
  return page.locator("[data-studio-caret]").evaluate((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.left, y: r.top, pos: Number(node.getAttribute("data-studio-caret-pos")) };
  });
}

test("RTL trailing space advances the visible caret after a word", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.insertText("سلام");
  await expect(page.locator("[data-studio-caret]")).toBeVisible();
  let previous = await paintedCaret(page);
  for (let i = 1; i <= 3; i++) {
    await page.keyboard.press("Space");
    await expect.poll(async () => (await paintedCaret(page)).pos).toBe(previous.pos + 1);
    const next = await paintedCaret(page);
    // In RTL the caret moves left, without adding a visible symbol or changing ink.
    expect(next.x, `space #${i} did not visibly move the caret`).toBeLessThan(previous.x - 0.75);
    previous = next;
  }
  const content = await editor.evaluate(element => {
    const view = (element as HTMLElement & { editor: import("@tiptap/core").Editor }).editor;
    return view.getJSON().content?.[0]?.content?.map(node => node.text ?? "").join("") ?? "";
  });
  expect(content.endsWith("سلام   ")).toBe(true);
  // Real spaces are present in the document; the workaround is only caret paint.
  await page.keyboard.press("Backspace");
  await expect.poll(async () => (await paintedCaret(page)).pos).toBe(previous.pos - 1);
});

test("visible space caret adjustment does not alter regular typing or stored marks", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.insertText("یہ ایک");
  const before = await paintedCaret(page);
  await page.keyboard.press("Space");
  const after = await paintedCaret(page);
  await expect.poll(async () => (await paintedCaret(page)).pos).toBe(before.pos + 1);
  expect(after.x).toBeLessThan(before.x - 0.75);
  await page.keyboard.insertText("آزمائش");
  await expect(editor).toContainText("یہ ایک آزمائش");
});
