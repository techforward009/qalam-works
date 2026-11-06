import { expect, test } from "@playwright/test";

async function insertTable(page: import("@playwright/test").Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeEditable({ timeout: 30_000 });
  await editor.click();
  await page.keyboard.type("ABOVE");
  await page.keyboard.press("Enter");
  await page.locator('[data-menu-root="insert"]').click();
  await page.locator('[data-menu-action="insert.table"]').click();
  const dialog = page.getByRole("dialog", { name: "Insert Table" });
  await dialog.getByRole("spinbutton", { name: "Rows" }).fill("3");
  await dialog.getByRole("spinbutton", { name: "Columns" }).fill("2");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  return editor;
}

test("Shift+Down selects table rows while keeping preceding text selected", async ({ page }) => {
  const editor = await insertTable(page);
  const cells = editor.locator("table td");
  await expect(cells).toHaveCount(6);
  // Caret at end of ABOVE, then grow into the table one row at a time.
  await editor.locator("p", { hasText: "ABOVE" }).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(editor.locator(".selectedCell, .qalam-row-selected")).toHaveCount(6);
  await expect(editor).toContainText("ABOVE");
});

test("Shift+Down inside a cell selects full rows", async ({ page }) => {
  const editor = await insertTable(page);
  const cells = editor.locator("table td");
  await cells.nth(2).click();
  await page.keyboard.press("Shift+ArrowDown");
  await expect(editor.locator(".selectedCell")).toHaveCount(4);
});

test("dragging from surrounding text highlights every reached table row", async ({ page }) => {
  const editor = await insertTable(page);
  const above = editor.locator("p", { hasText: "ABOVE" });
  const rows = editor.locator("table tr");
  await expect(rows).toHaveCount(3);
  const start = await above.boundingBox();
  const third = await rows.nth(2).boundingBox();
  if (!start || !third) throw new Error("Bounds unavailable");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(third.x + third.width / 2, third.y + third.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(editor.locator(".selectedCell, .qalam-row-selected")).toHaveCount(6);
});
