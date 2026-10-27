import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";

const story = ".ProseMirror";

async function open(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(story)).toBeEditable();
}

async function twoParagraphs(page: Page) {
  await page.locator(story).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText("پہلا پیراگراف");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("دوسرا پیراگراف");
  await expect(page.locator(`${story} p`)).toHaveCount(2);
}

async function openParagraph(page: Page) {
  await page.locator(story).evaluate((el) => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.selectAll();
    const rect = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.left + 28, clientY: rect.top + 16 }));
  });
  await page.getByRole("menuitem", { name: "Paragraph…", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Paragraph Preferences", exact: true })).toBeVisible();
}

test("paragraph preferences apply to both paragraphs, undo once, and cancel", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "paragraph dialog is covered on desktop");
  await open(page);
  await twoParagraphs(page);
  await openParagraph(page);
  const dialog = page.getByRole("dialog", { name: "Paragraph Preferences" });
  await dialog.getByLabel("First Line", { exact: true }).fill("10mm");
  await dialog.getByLabel("Before", { exact: true }).fill("5mm");
  await dialog.getByLabel("Alignment", { exact: true }).selectOption("center");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(dialog).toBeHidden();
  const paragraphs = page.locator(`${story} p`);
  const before = String(Math.round(5 * 72 / 25.4 * 1000) / 1000);
  for (const nth of [0, 1]) {
    const paragraph = paragraphs.nth(nth);
    await expect(paragraph).toHaveCSS("text-align", "center");
    await expect(paragraph).toHaveAttribute("data-first-line-indent-mm", "10");
    await expect(paragraph).toHaveAttribute("data-space-before-pt", before);
  }
  await expect(page.getByRole("button", { name: "Align center", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.locator(story).focus();
  await page.keyboard.press("Control+Z");
  for (const nth of [0, 1]) {
    const paragraph = paragraphs.nth(nth);
    await expect(paragraph).not.toHaveAttribute("data-text-align", "center");
    await expect(paragraph).not.toHaveAttribute("data-first-line-indent-mm");
    await expect(paragraph).not.toHaveAttribute("data-space-before-pt");
  }
  await openParagraph(page);
  await dialog.getByLabel("First Line", { exact: true }).fill("22mm");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(paragraphs.first()).not.toHaveAttribute("data-first-line-indent-mm");
  await openParagraph(page);
  await dialog.getByLabel("Alignment", { exact: true }).selectOption("left");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(paragraphs.first()).not.toHaveAttribute("data-text-align", "left");
  await expect(paragraphs.nth(1)).not.toHaveCSS("text-align", "left");
});
