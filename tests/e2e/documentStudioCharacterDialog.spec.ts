import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";

const story = ".ProseMirror";

async function open(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(story)).toBeEditable();
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
