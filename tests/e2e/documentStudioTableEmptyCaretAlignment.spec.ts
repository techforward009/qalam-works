import { expect, test } from "@playwright/test";

test("empty table-cell caret follows paragraph center and left alignment", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeEditable({ timeout: 30_000 });
  await editor.click();

  await page.locator('[data-menu-root="insert"]').click();
  await page.locator('[data-menu-action="insert.table"]').click();
  const dialog = page.getByRole("dialog", { name: "Insert Table" });
  await dialog.getByRole("spinbutton", { name: "Rows" }).fill("1");
  await dialog.getByRole("spinbutton", { name: "Columns" }).fill("1");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();

  const cell = editor.locator("table td").first();
  await expect(cell).toBeVisible();
  await cell.click({ position: { x: 20, y: 12 } });
  const caret = page.locator("[data-studio-caret]");
  await expect(caret).toBeVisible();
  const alignButton = (name: string) => page.getByRole("button", { name, exact: true });

  await alignButton("Align center").click();
  await expect.poll(async () => {
    const [c, k] = await Promise.all([cell.boundingBox(), caret.boundingBox()]);
    return c && k ? Math.abs(k.x + k.width / 2 - (c.x + c.width / 2)) : Infinity;
  }).toBeLessThan(5);

  await alignButton("Align left").click();
  await expect.poll(async () => {
    const [c, k] = await Promise.all([cell.boundingBox(), caret.boundingBox()]);
    return c && k ? Math.abs(k.x - (c.x + 5)) : Infinity;
  }).toBeLessThan(8);
});
