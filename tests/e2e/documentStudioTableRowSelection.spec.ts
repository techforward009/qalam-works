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

test("text drag inside a cell stays in that cell", async ({ page }) => {
  const editor = await insertTable(page);
  const cell = editor.locator("table td").nth(2);
  await cell.click();
  await page.keyboard.type("WXYZ");
  const points = await cell.locator("p").evaluate((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode() as Text;
    if (!node || node.length < 2) throw new Error("Cell text was not rendered");
    const range = document.createRange();
    range.setStart(node, 1); range.setEnd(node, 2);
    const rect = range.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  await page.mouse.move(points.x + 8, points.y);
  await page.mouse.down();
  await page.mouse.move(points.x - 8, points.y, { steps: 5 });
  await page.mouse.up();
  await expect(editor.locator(".qalam-row-selected, .selectedCell")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).not.toBe("");
});

test("Shift+Left selects text and reaches the single-cell boundary before row selection", async ({ page }) => {
  const editor = await insertTable(page);
  const cell = editor.locator("table td").nth(2);
  await cell.click();
  await page.keyboard.type("WXYZ");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe("Z");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe("WXYZ");
  await expect(editor.locator(".qalam-row-selected, .selectedCell")).toHaveCount(0);
  await page.keyboard.press("Shift+ArrowDown");
  await expect(editor.locator(".selectedCell")).toHaveCount(4);
});

test("Tab selects destination cell text and Shift+Down from the last row reaches trailing paragraph", async ({ page }) => {
  const editor = await insertTable(page);
  const cells = editor.locator("table td");
  await cells.nth(0).click();
  await page.keyboard.type("first");
  await page.keyboard.press("Tab");
  await page.keyboard.type("second");
  await page.keyboard.press("Shift+Tab");
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe("first");

  const lastRow = editor.locator("table tr").last();
  await lastRow.locator("td").last().click();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(editor.locator(".qalam-row-selected, .selectedCell")).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => {
    const selection = getSelection();
    const table = document.querySelector(".ProseMirror table");
    const paragraph = table?.closest(".tableWrapper")?.nextElementSibling ?? table?.nextElementSibling;
    return Boolean(selection && paragraph && selection.containsNode(paragraph, true));
  })).toBe(true);
  await expect(editor.locator(".tableWrapper + p")).toHaveCount(1);
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
