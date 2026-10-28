import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";

const root = (page: Page, id: string) => page.locator(`[data-menu-root="${id}"]`);
const action = (page: Page, id: string) => page.locator(`[data-menu-action="${id}"]`);
const dropdown = (page: Page) => page.locator("[data-menu-dropdown]");
test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "ur"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready");
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
});

test("InPage top-level order and a ready New action", async ({ page }) => {
  await expect(page.locator("[data-menu-root]")).toHaveText(["File", "Edit", "View", "Format", "Insert", "Utilities", "Window", "Help"]);
  await root(page, "file").click();
  await action(page, "file.new").click();
  await expect(dropdown(page)).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "New Document", exact: true })).toBeVisible();
});

test("unbuilt Close is disabled, grey, Coming soon and harmless", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await root(page, "file").click();
  const item = page.locator('[data-menu-unavailable="file.close"]');
  await expect(item).toBeVisible(); await expect(item).toBeDisabled();
  await expect(item).toHaveAttribute("aria-disabled", "true");
  await expect(item).toHaveAttribute("title", "Coming soon");
  await expect(item).toHaveCSS("color", "rgb(128, 128, 128)");
  const before = await page.locator(".ProseMirror").textContent();
  const box = (await item.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(dropdown(page)).toBeVisible();
  expect(await page.locator(".ProseMirror").textContent()).toBe(before);
  expect(errors).toEqual([]);
});

test("Escape and outside click close; hover changes only an already-open menu", async ({ page }) => {
  await root(page, "edit").hover(); await expect(dropdown(page)).toHaveCount(0);
  await root(page, "file").click();
  await root(page, "edit").hover();
  if (!test.info().project.use.isMobile) await expect(page.locator('[data-menu-dropdown="edit"]')).toBeVisible();
  await page.keyboard.press("Escape"); await expect(dropdown(page)).toHaveCount(0);
  await root(page, "file").click(); await page.mouse.click(3, 250);
  await expect(dropdown(page)).toHaveCount(0);
});

test("Up/Down skip disabled items and Enter activates Save", async ({ page }) => {
  await root(page, "file").focus(); await page.keyboard.press("ArrowDown");
  await expect(action(page, "file.new")).toBeFocused();
  await page.keyboard.press("ArrowDown"); await expect(action(page, "file.open")).toBeFocused();
  await page.keyboard.press("ArrowDown"); await expect(action(page, "file.save")).toBeFocused();
  await page.keyboard.press("ArrowUp"); await expect(action(page, "file.open")).toBeFocused();
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
  await expect(dropdown(page)).toHaveCount(0);
});

test("submenu keyboard skips unbuilt rows and Escape returns focus", async ({ page }) => {
  await root(page, "edit").focus(); await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  const preferences = page.locator('[data-menu-submenu="edit.preferences"]');
  await expect(preferences).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(action(page, "window.settings")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(preferences).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dropdown(page)).toHaveCount(0);
  await expect(root(page, "edit")).toBeFocused();
});

test("Text dialogs, Page insertion and existing zoom shortcuts run existing actions", async ({ page }) => {
  await root(page, "format").click(); await action(page, "format.character").click();
  await expect(page.getByRole("dialog", { name: "Character", exact: true })).toBeVisible(); await page.keyboard.press("Escape");
  await root(page, "format").click(); await action(page, "format.paragraph").click();
  await expect(page.getByRole("dialog", { name: "Paragraph Preferences", exact: true })).toBeVisible(); await page.keyboard.press("Escape");
  await root(page, "insert").click(); await action(page, "insert.pageBreak").click();
  await expect(page.locator('.ProseMirror [data-document-page-break="true"]')).toHaveCount(1);
  await page.locator('[data-studio-tool-button="text"]').click(); await page.locator(".ProseMirror").focus();
  for (const [key, zoom] of [["F6", "50"], ["F7", "100"], ["F8", "200"]]) {
    await page.keyboard.press(key); await expect(page.locator("[data-studio-zoom]").first()).toHaveAttribute("data-studio-zoom", zoom);
  }
});

test("Edit uses existing selected-text clipboard and Clear actions", async ({ page }) => {
  await page.locator(".ProseMirror").evaluate(el => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    editor.commands.setContent("<p>سلام</p>"); editor.commands.selectAll();
  });
  await root(page, "edit").click(); await action(page, "edit.copy").click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("سلام");
  await root(page, "edit").click(); await action(page, "edit.clear").click();
  await expect(page.locator(".ProseMirror")).toHaveText("");
  await root(page, "edit").click(); await action(page, "edit.paste").click();
  await expect(page.locator(".ProseMirror")).toHaveText("سلام");
});

test("shown dialog shortcuts run existing actions without changing undo or zoom keys", async ({ page }) => {
  await page.locator(".ProseMirror").focus();
  await page.keyboard.insertText("Shortcut sample");
  await page.keyboard.press("Control+z");
  await expect(page.locator(".ProseMirror")).toHaveText("");
  await page.keyboard.press("Control+Shift+z");
  await expect(page.locator(".ProseMirror")).toHaveText("Shortcut sample");
  await page.keyboard.press("Control+h");
  await expect(page.getByRole("dialog", { name: "Character", exact: true })).toBeVisible();
  await page.keyboard.press("Escape"); await page.keyboard.press("Control+g");
  await expect(page.getByRole("dialog", { name: "Paragraph Preferences", exact: true })).toBeVisible();
  await page.keyboard.press("Escape"); await page.keyboard.press("Control+n");
  await expect(page.getByRole("dialog", { name: "New Document", exact: true })).toBeVisible();
});

test("menus stay on screen at narrow widths and screenshots", async ({ page }, info) => {
  await page.setViewportSize(info.project.name === "mobile-android" ? { width: 375, height: 667 } : { width: 1280, height: 800 });
  for (const id of ["file", "edit", "view", "format", "insert", "tools", "window", "help"]) {
    await root(page, id).click();
    const box = (await dropdown(page).boundingBox())!, viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    await page.keyboard.press("Escape");
  }
  await root(page, "edit").click();
  await page.screenshot({ path: info.outputPath("inpage-edit-menu.png") });
});
