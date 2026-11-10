import { expect, test, type Page } from "@playwright/test";

async function openStudio(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")), { timeout: 20000 }).not.toBeNull();
}

async function seed(page: Page) {
  await page.evaluate(() => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const title = "عنوان عنوان عنوان عنوان عنوان عنوان عنوان عنوان";
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify({
      [id]: [
        { id: "multi", kind: "text", page: 1, xMm: 20, yMm: 28, wMm: 90, hMm: 36, flip: false, text: "پہلا کالم" },
        { id: "title", kind: "text", page: 1, xMm: 20, yMm: 78, wMm: 90, hMm: 12, flip: false, text: title, singleLine: true },
        { id: "pic", kind: "picture-rect", page: 1, xMm: 130, yMm: 28, wMm: 36, hMm: 28, flip: false, text: "" },
      ],
    }));
  });
  await page.reload();
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect(page.locator('[data-studio-frame-id="multi"]')).toBeVisible();
}

async function stored(page: Page, id: string) {
  return page.evaluate(frameId => {
    const doc = localStorage.getItem("qalam-document-studio-active-document-v1");
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, Array<Record<string, unknown>>>;
    return doc ? (map[doc] || []).find(frame => frame.id === frameId) : undefined;
  }, id);
}

async function choose(page: Page, id: string) {
  await page.locator('[data-studio-tool-button="select"]').click();
  await page.locator(`[data-studio-frame-id="${id}"]`).click();
}

test("multiline text uses the object ribbon and keeps columns, gutter, inset and direction", async ({ page }) => {
  await openStudio(page);
  await seed(page);
  const box = page.locator('[data-studio-frame-id="multi"]');
  await expect(box.locator("[data-studio-frame-guide='true']")).toBeVisible();
  await expect(box.locator("textarea")).toHaveCSS("border-top-style", "solid");
  await choose(page, "multi");
  const ribbon = page.locator('[data-studio-object-ribbon="true"]');
  await expect(ribbon).toBeVisible();
  await expect(ribbon.locator("[data-object-field='columns']")).toBeEnabled();
  await expect(ribbon.locator("[data-object-field='h']")).toBeEnabled();
  await expect(ribbon.getByRole("button", { name: "Rectangular Text Box" })).toBeVisible();
  await expect(ribbon.getByRole("button", { name: "Rounded Rectangular Picture Box" })).toHaveCount(0);
  await box.click({ button: "right" });
  await page.locator('[data-object-menu="format"]').click();
  const dialog = page.locator('[data-studio-format-object-dialog="true"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-modify-object-window", "true");
  await expect(dialog.getByLabel("Origin Across")).toHaveCount(0);
  await dialog.getByLabel("Column count").fill("2");
  await dialog.getByLabel("Column gutter").fill("4mm");
  await dialog.getByLabel("Inset").fill("3mm");
  await dialog.getByLabel("Left to Right").check();
  await dialog.getByLabel("Border Pattern").selectOption("solid");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => stored(page, "multi")).toMatchObject({ columnCount: 2, columnGutterMm: 4, insetMm: 3, columnDirection: "ltr", borderPattern: "solid" });
  await page.reload();
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect.poll(async () => stored(page, "multi")).toMatchObject({ columnCount: 2, columnDirection: "ltr", insetMm: 3 });
  const again = page.locator('[data-studio-frame-id="multi"]');
  await expect(again.locator("[data-studio-text-columns='2']").first()).toBeVisible();
  await expect(again.locator("[data-studio-column-direction='ltr']").first()).toBeVisible();
  await expect(again.locator("[data-studio-frame-guide='true']")).toHaveCount(0);
  await expect(again.locator("textarea")).toHaveCSS("border-top-style", "solid");
});

test("single-line text disables height, columns and gutter while width still refits the height", async ({ page }) => {
  await openStudio(page);
  await seed(page);
  await expect.poll(async () => Number((await stored(page, "title"))?.hMm)).toBeGreaterThan(3);
  const before = Number((await stored(page, "title"))?.hMm);
  await choose(page, "title");
  const ribbon = page.locator('[data-studio-object-ribbon="true"]');
  await expect(ribbon.locator("[data-object-field='h']")).toBeDisabled();
  await expect(ribbon.locator("[data-object-field='columns']")).toBeDisabled();
  await expect(ribbon.locator("[data-object-field='gutter']")).toBeDisabled();
  await expect(ribbon.locator("[data-object-field='w']")).toBeEnabled();
  await expect(ribbon.locator("[data-object-field='x']")).toBeEnabled();
  const title = page.locator('[data-studio-frame-id="title"]');
  await title.click({ button: "right" });
  await page.locator('[data-object-menu="format"]').click();
  const dialog = page.locator('[data-studio-format-object-dialog="true"]');
  await expect(dialog.locator("[data-object-field='h']")).toBeDisabled();
  await expect(dialog.locator("[data-object-field='columns']")).toBeDisabled();
  await expect(dialog.locator("[data-object-field='gutter']")).toBeDisabled();
  await expect(dialog.getByLabel("Inset")).toBeEnabled();
  await expect(dialog.getByLabel("Left to Right")).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  const width = ribbon.locator("[data-object-field='w']");
  await width.fill("18mm");
  await width.press("Enter");
  await expect.poll(async () => Number((await stored(page, "title"))?.hMm)).toBeGreaterThan(before + 2);
  await expect.poll(async () => Number((await stored(page, "title"))?.wMm)).toBeCloseTo(18, 1);
  expect((await stored(page, "title"))?.columnCount).toBeUndefined();

  await choose(page, "pic");
  await expect(ribbon.getByRole("button", { name: "Rectangular Picture Box", exact: true })).toBeVisible();
  await expect(ribbon.locator("[data-object-field='columns']")).toHaveCount(0);
  await page.locator('[data-studio-frame-id="pic"]').click({ button: "right" });
  await page.locator('[data-object-menu="format"]').click();
  const picture = page.locator('[data-studio-format-object-dialog="true"]');
  await expect(picture.getByLabel("Origin Across")).toBeVisible();
  await expect(picture.getByLabel("Column count")).toHaveCount(0);
  await expect(picture.getByRole("radio", { name: "Rounded Rectangular Picture Box" })).toBeEnabled();
});
