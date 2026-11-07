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

async function dragCellToCell(page: import("@playwright/test").Page, from: import("@playwright/test").Locator, to: import("@playwright/test").Locator) {
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error("Cell bounds unavailable");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
}

async function middleRowVisualCells(editor: import("@playwright/test").Locator) {
  const cells = editor.locator("table tr").nth(1).locator("td");
  await expect(cells).toHaveCount(2);
  const bounds = await Promise.all([cells.nth(0).boundingBox(), cells.nth(1).boundingBox()]);
  if (!bounds[0] || !bounds[1]) throw new Error("Cell bounds unavailable");
  return {
    left: cells.nth(bounds[0].x < bounds[1].x ? 0 : 1),
    right: cells.nth(bounds[0].x > bounds[1].x ? 0 : 1),
  };
}

async function caretCellText(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const selection = document.getSelection();
    const node = selection?.anchorNode;
    const element = node instanceof Element ? node : node?.parentElement;
    return element?.closest("td")?.textContent ?? null;
  });
}

async function placeCaretInCell(page: import("@playwright/test").Page, cell: import("@playwright/test").Locator) {
  await cell.click();
  await page.keyboard.press("Home");
}

test("mouse drag across an empty row keeps both cells selected after release", async ({ page }) => {
  const editor = await insertTable(page);
  const cells = editor.locator("table td");
  await expect(cells).toHaveCount(6);
  await dragCellToCell(page, cells.nth(2), cells.nth(3));
  await expect(editor.locator(".selectedCell")).toHaveCount(2);
  await page.mouse.up();
  await expect.poll(() => editor.locator(".selectedCell").count(), { timeout: 2_000 }).toBe(2);
});

test("mouse drag down an empty column keeps both cells selected after release", async ({ page }) => {
  const editor = await insertTable(page);
  const cells = editor.locator("table td");
  await expect(cells).toHaveCount(6);
  await dragCellToCell(page, cells.nth(0), cells.nth(2));
  await expect(editor.locator(".selectedCell")).toHaveCount(2);
  await page.mouse.up();
  await expect.poll(() => editor.locator(".selectedCell").count(), { timeout: 2_000 }).toBe(2);
});

test("mouse drag across populated Urdu cells keeps both cells selected after release", async ({ page }) => {
  const editor = await insertTable(page);
  const cells = editor.locator("table td");
  await cells.nth(2).click();
  await page.keyboard.type("یہ قلم");
  await cells.nth(3).click();
  await page.keyboard.type("دوسرا");
  await dragCellToCell(page, cells.nth(2), cells.nth(3));
  await page.mouse.up();
  await expect.poll(() => editor.locator(".selectedCell").count(), { timeout: 2_000 }).toBe(2);
});

test("drag within filled Urdu text remains a text selection", async ({ page }) => {
  const editor = await insertTable(page);
  const cell = editor.locator("table td").nth(2);
  await cell.click();
  await page.keyboard.type("یہ قلم کی آزمائش ہے");
  const points = await cell.locator("p").evaluate((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode() as Text;
    if (!node || node.length < 12) throw new Error("Cell text was not rendered");
    const range = document.createRange();
    range.setStart(node, 2); range.setEnd(node, 12);
    const rect = range.getBoundingClientRect();
    return { left: rect.left, right: rect.right, y: rect.top + rect.height / 2 };
  });
  await page.mouse.move(points.right - 3, points.y);
  await page.mouse.down();
  await page.mouse.move(points.left + 3, points.y, { steps: 6 });
  await page.mouse.up();
  await expect(editor.locator(".selectedCell, .qalam-row-selected")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).not.toBe("");
});

test("clicking an empty cell leaves a caret without selected cells", async ({ page }) => {
  const editor = await insertTable(page);
  const cell = editor.locator("table td").nth(2);
  await cell.click();
  await expect.poll(() => page.evaluate(() => getSelection()?.isCollapsed)).toBe(true);
  await expect(editor.locator(".selectedCell, .qalam-row-selected")).toHaveCount(0);
});

test("mouse drag within one empty cell selects that cell", async ({ page }) => {
  const editor = await insertTable(page);
  const cell = editor.locator("table tr").nth(1).locator("td").first();
  const box = await cell.boundingBox();
  if (!box) throw new Error("Cell bounds unavailable");
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(editor.locator(".selectedCell")).toHaveCount(1);
});

test("bare horizontal arrows move between visual neighbours within the middle row", async ({ page }) => {
  const editor = await insertTable(page);
  const { left, right } = await middleRowVisualCells(editor);
  await placeCaretInCell(page, right);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => caretCellText(page)).toBe("");
  const activeAfterLeft = await page.evaluate(() => {
    const s = document.getSelection();
    const n = s?.anchorNode;
    const rect = (n instanceof Element ? n : n?.parentElement)?.closest("td")?.getBoundingClientRect();
    return rect ? { x: rect.x, y: rect.y } : null;
  });
  const leftBox = await left.boundingBox();
  expect(activeAfterLeft).toEqual({ x: leftBox?.x, y: leftBox?.y });

  await placeCaretInCell(page, left);
  await page.keyboard.press("ArrowRight");
  const activeAfterRight = await page.evaluate(() => {
    const s = document.getSelection();
    const n = s?.anchorNode;
    const rect = (n instanceof Element ? n : n?.parentElement)?.closest("td")?.getBoundingClientRect();
    return rect ? { x: rect.x, y: rect.y } : null;
  });
  const rightBox = await right.boundingBox();
  expect(activeAfterRight).toEqual({ x: rightBox?.x, y: rightBox?.y });
});

test("bare ArrowLeft at the visually-left row edge stays in the same cell", async ({ page }) => {
  const editor = await insertTable(page);
  const { left } = await middleRowVisualCells(editor);
  await placeCaretInCell(page, left);
  const before = await left.boundingBox();
  await page.keyboard.press("ArrowLeft");
  const after = await page.evaluate(() => {
    const s = document.getSelection();
    const n = s?.anchorNode;
    const rect = (n instanceof Element ? n : n?.parentElement)?.closest("td")?.getBoundingClientRect();
    return rect ? { x: rect.x, y: rect.y } : null;
  });
  expect(after).toEqual({ x: before?.x, y: before?.y });
});

test("ArrowLeft in the middle of filled Urdu text keeps the caret in its cell", async ({ page }) => {
  const editor = await insertTable(page);
  const cell = editor.locator("table tr").nth(1).locator("td").first();
  await cell.click();
  await page.keyboard.type("یہ قلم");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => caretCellText(page)).toBe("یہ قلم");
});

test("Shift+horizontal arrows select and extend visual neighbours in an empty row", async ({ page }) => {
  const editor = await insertTable(page);
  const { left, right } = await middleRowVisualCells(editor);
  await placeCaretInCell(page, right);
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(right).toHaveClass(/selectedCell/);
  await expect(editor.locator(".selectedCell")).toHaveCount(1);
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(editor.locator(".selectedCell")).toHaveCount(2);
  await page.keyboard.press("Shift+ArrowRight");
  await expect(editor.locator(".selectedCell")).toHaveCount(1);

  await placeCaretInCell(page, right);
  await placeCaretInCell(page, left);
  await expect.poll(() => page.evaluate(() => getSelection()?.isCollapsed)).toBe(true);
  await expect(editor.locator(".selectedCell")).toHaveCount(0);
  await page.keyboard.press("Shift+ArrowRight");
  await expect(left).toHaveClass(/selectedCell/);
  await expect(editor.locator(".selectedCell")).toHaveCount(1);
  await page.keyboard.press("Shift+ArrowRight");
  await expect(editor.locator(".selectedCell")).toHaveCount(2);
});

test("LTR horizontal navigation uses visual neighbours", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeEditable({ timeout: 30_000 });
  await editor.click();
  await page.getByRole("button", { name: "Left to right", exact: true }).click();
  await page.locator('[data-menu-root="insert"]').click();
  await page.locator('[data-menu-action="insert.table"]').click();
  const dialog = page.getByRole("dialog", { name: "Insert Table" });
  await dialog.getByRole("spinbutton", { name: "Rows" }).fill("3");
  await dialog.getByRole("spinbutton", { name: "Columns" }).fill("2");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  const table = editor.locator("table");
  await expect(table).toHaveCount(1);
  await expect.poll(() => table.evaluate((el) => getComputedStyle(el).direction)).toBe("ltr");

  const { left, right } = await middleRowVisualCells(editor);
  const activeCell = () => page.evaluate(() => {
    const selection = document.getSelection();
    const node = selection?.anchorNode;
    const rect = (node instanceof Element ? node : node?.parentElement)?.closest("td")?.getBoundingClientRect();
    return rect ? { x: rect.x, y: rect.y } : null;
  });
  const boxOf = async (cell: import("@playwright/test").Locator) => {
    const box = await cell.boundingBox();
    if (!box) throw new Error("Cell bounds unavailable");
    return { x: box.x, y: box.y };
  };

  await placeCaretInCell(page, left);
  await page.keyboard.press("ArrowRight");
  await expect.poll(activeCell).toEqual(await boxOf(right));
  await page.keyboard.press("ArrowLeft");
  await expect.poll(activeCell).toEqual(await boxOf(left));

  await placeCaretInCell(page, left);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(activeCell).toEqual(await boxOf(left));

  await placeCaretInCell(page, right);
  await page.waitForTimeout(600);
  await placeCaretInCell(page, left);
  await expect.poll(() => page.evaluate(() => { const s = (document.querySelector('.ProseMirror') as any).editor.state.selection; return s.constructor.name + ':' + s.empty; })).toBe('TextSelection:true');
  await expect(editor.locator('.selectedCell')).toHaveCount(0);
  await page.keyboard.press("Shift+ArrowRight");
  await expect(left).toHaveClass(/selectedCell/);
  await expect(editor.locator(".selectedCell")).toHaveCount(1);
  await page.keyboard.press("Shift+ArrowRight");
  await expect(editor.locator(".selectedCell")).toHaveCount(2);
});

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
