import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 15000 });
});

test("Character title bar can be dragged without changing the format form", async ({ page }) => {
  await page.locator(".ProseMirror").click();
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="format.character"]').click();
  const dlg = page.locator('[data-studio-character-dialog]');
  const handle = dlg.locator('[data-studio-character-drag-handle]');
  const before = (await dlg.boundingBox())!;
  const grip = (await handle.boundingBox())!;
  await page.mouse.move(grip.x + 85, grip.y + 12);
  await page.mouse.down();
  await page.mouse.move(grip.x + 145, grip.y + 38, { steps: 6 });
  await page.mouse.up();
  const after = (await dlg.boundingBox())!;
  expect(after.x).toBeGreaterThan(before.x + 35);
  expect(after.y).toBeGreaterThan(before.y + 12);
  await expect(dlg.getByRole("combobox", { name: "Size" })).toBeVisible();
  await dlg.getByRole("button", { name: "Cancel" }).click();
});

test("Paragraph Preferences has compact classical groups", async ({ page }) => {
  await page.locator(".ProseMirror").click();
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="format.paragraph"]').click();
  const dlg = page.locator('[data-studio-paragraph-dialog]');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole("group", { name: "Indents" })).toBeVisible();
  await expect(dlg.getByRole("group", { name: "Breaks" })).toBeVisible();
  const box = (await dlg.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(380);
  await dlg.getByRole("button", { name: "Cancel" }).click();
});

test("Format > Document opens a real Page Setup; cancel preserves the page and text", async ({ page }) => {
  const before = await page.locator(".ProseMirror").innerText();
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="file.pageSetup"]').click();
  const dlg = page.getByRole("dialog", { name: "Page Setup" });
  await expect(dlg).toBeVisible();
  const facing = dlg.getByRole("checkbox", { name: "Facing Pages" });
  const previous = await facing.isChecked();
  if (previous) await facing.uncheck(); else await facing.check();
  await expect(facing).toBeChecked({ checked: !previous });
  await dlg.getByRole("button", { name: "Cancel" }).click();
  expect(await page.locator(".ProseMirror").innerText()).toBe(before);
});

test("File > Open has a classical dialog and real saved-document / InPage actions", async ({ page }) => {
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.open"]').click();
  const dlg = page.locator('[data-studio-open-dialog]');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole("listbox", { name: "Saved documents" })).toBeVisible();
  await expect(dlg.getByRole("button", { name: "Open InPage file…" })).toBeVisible();
  await dlg.getByRole("button", { name: "Cancel" }).click();
  await expect(dlg).toHaveCount(0);
});
