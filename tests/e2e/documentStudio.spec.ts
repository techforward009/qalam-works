import { test, expect, type Page } from "@playwright/test";
import { TINY_PNG_BASE64 } from "./fixtures/tinyPng";

const URL = "/tools/document-studio";
const ENGLISH = "Document Studio browser acceptance text.";
const URDU = "یہ دستاویز اسٹوڈیو کی براؤزر جانچ ہے۔";

async function openStudio(page: Page, language: "en" | "ur" = "en") {
  await page.addInitScript((value) => {
    localStorage.setItem("qalam-site-language", value);
  }, language);
  await page.goto(URL);
  await expect(page.getByRole("textbox", { name: language === "ur" ? "دستاویز ایڈیٹر" : "Document editor" })).toBeVisible();
  await expect(page.locator(".ProseMirror")).toBeEditable();
}

async function replaceEditorContent(page: Page, text: string) {
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(text);
  await expect(editor).toContainText(text);
  return editor;
}

async function downloadAction(page: Page, action: "file.downloadDocx" | "file.downloadPdf") {
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-submenu="file.download"]').hover();
  await expect(page.locator(`[data-menu-action="${action}"]`)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(`[data-menu-action="${action}"]`).click(),
  ]);
  const stream = await download.createReadStream();
  let size = 0;
  for await (const chunk of stream ?? []) size += (chunk as Buffer).length;
  expect(size).toBeGreaterThan(0);
  return download;
}

test.describe("Document Studio v1 browser smoke", () => {
  test("loads an editable English workspace, formats it, and persists after reload", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));
    await openStudio(page);
    const editor = await replaceEditorContent(page, ENGLISH);

    await page.keyboard.press("Control+A");
    await page.getByRole("button", { name: "Bold" }).click();
    await expect(editor.locator("strong")).toContainText(ENGLISH);
    expect(await editor.getAttribute("dir")).toBe("ltr");

    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 6_000 });
    await page.reload();
    await expect(page.locator(".ProseMirror")).toContainText(ENGLISH);
    expect(errors).toEqual([]);
  });

  test("keeps Urdu and English paragraphs intact with their paragraph directions", async ({ page }) => {
    await openStudio(page, "ur");
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type(URDU);
    await page.keyboard.press("Enter");
    await page.keyboard.type(ENGLISH);
    await expect(editor).toContainText(URDU);
    await expect(editor).toContainText(ENGLISH);
    await expect(editor.locator("p").nth(0)).toHaveAttribute("dir", "rtl");
    await expect(editor.locator("p").nth(1)).toHaveAttribute("dir", "ltr");

    await editor.locator("p").nth(1).click();
    await page.getByRole("button", { name: "Left-to-right (English)" }).click();
    await expect(editor.locator("p").nth(1)).toContainText(ENGLISH);
    await expect(editor.locator("p").nth(1)).toHaveAttribute("dir", "ltr");
    await expect(editor.locator("p").nth(0)).toHaveAttribute("dir", "rtl");
  });

  test("find and replace updates visible document content", async ({ page }) => {
    await openStudio(page);
    const editor = await replaceEditorContent(page, "target target");
    await page.keyboard.press("Control+F");
    await page.getByPlaceholder("Find...").fill("target");
    await page.getByPlaceholder("Replace with...").fill("replaced");
    await page.getByRole("button", { name: "Replace All" }).click();
    await expect(editor).toContainText("replaced replaced");
    await expect(editor).not.toContainText("target");
  });

  test("creates, edits, persists, and exports a multilingual table", async ({ page }) => {
    await openStudio(page);
    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-action="insert.table"]').click();
    await page.getByRole("dialog", { name: "Insert table" }).getByLabel("Rows").fill("2");
    await page.getByRole("dialog", { name: "Insert table" }).getByLabel("Columns").fill("2");
    await page.getByRole("dialog", { name: "Insert table" }).getByRole("button", { name: "Insert" }).click();

    const table = page.locator(".ProseMirror table");
    await expect(table).toHaveCount(1);
    const cells = table.locator("td, th");
    await cells.nth(0).click();
    await page.keyboard.type("English cell");
    await cells.nth(1).click();
    await page.keyboard.type("اردو خانہ");
    await expect(table).toContainText("English cell");
    await expect(table).toContainText("اردو خانہ");

    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-submenu="insert.tableActions"]').hover();
    await page.locator('[data-menu-action="table.addRowAfter"]').click();
    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-submenu="insert.tableActions"]').hover();
    await page.locator('[data-menu-action="table.addColumnAfter"]').click();
    await expect(table.locator("tr")).toHaveCount(3);
    await expect(table.locator("tr").first().locator("td, th")).toHaveCount(3);

    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 6_000 });
    await page.reload();
    await expect(page.locator(".ProseMirror table")).toContainText("English cell");
    await expect(page.locator(".ProseMirror table")).toContainText("اردو خانہ");

    const docx = await downloadAction(page, "file.downloadDocx");
    expect(docx.suggestedFilename()).toMatch(/\.docx$/i);
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/export-pdf") && response.request().method() === "POST");
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    await page.locator('[data-menu-action="file.downloadPdf"]').click();
    expect((await responsePromise).status()).toBe(200);
    const pdf = await page.waitForEvent("download");
    const stream = await pdf.createReadStream();
    let size = 0;
    for await (const chunk of stream ?? []) size += (chunk as Buffer).length;
    expect(size).toBeGreaterThan(0);
  });

  test("inserts, edits, persists, and exports a local raster image", async ({ page }, testInfo) => {
    await openStudio(page);
    const editor = await replaceEditorContent(page, "Text before the image.");
    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-action="insert.image"]').click();
    await page.locator('[data-studio-image-input="true"]').setInputFiles({
      name: "tiny.png", mimeType: "image/png", buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
    });
    const image = page.locator(".ProseMirror img.qalam-document-image");
    await expect(image).toBeVisible();
    await editor.press("End");
    await page.keyboard.type(" Text after the image.");
    await image.click();
    const imageControls = page.locator('[data-studio-image-controls="true"]');
    await expect(imageControls).toBeVisible();
    await expect(page.locator('[data-resize-handle]')).toHaveCount(4);
    await expect(imageControls.locator('[data-studio-image-width="true"]')).toContainText("80 px");

    await page.getByRole("button", { name: "Larger", exact: true }).click();
    await expect(image).toHaveAttribute("data-width", "160");
    if (testInfo.project.name !== "mobile-android") {
      const resizeHandle = page.locator('[data-resize-handle="bottom-right"]');
      const handleBox = await resizeHandle.boundingBox();
      if (!handleBox) throw new Error("Image resize handle was not rendered.");
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + 60, handleBox.y + 60);
      await page.mouse.up();
      await expect.poll(async () => Number(await image.getAttribute("data-width"))).toBeGreaterThan(160);
    }

    await page.getByRole("button", { name: "Left", exact: true }).click();
    const leftPosition = await image.boundingBox();
    await page.getByRole("button", { name: "Center", exact: true }).click();
    const centerPosition = await image.boundingBox();
    await page.getByRole("button", { name: "Right", exact: true }).click();
    const rightPosition = await image.boundingBox();
    expect(leftPosition?.x).toBeLessThan(centerPosition?.x ?? 0);
    expect(centerPosition?.x).toBeLessThan(rightPosition?.x ?? 0);
    page.once("dialog", (dialog) => dialog.accept("Qalam mark"));
    await page.getByRole("button", { name: "Alt Text", exact: true }).click();
    await expect(image).toHaveAttribute("alt", "Qalam mark");
    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 6_000 });
    await page.reload();
    const restoredImage = page.locator(".ProseMirror img.qalam-document-image");
    await expect(restoredImage).toHaveAttribute("alt", "Qalam mark");
    await expect(restoredImage).toHaveAttribute("data-alignment", "right");
    await expect.poll(async () => Number(await restoredImage.getAttribute("data-width"))).toBeGreaterThanOrEqual(160);
    await expect(page.locator(".ProseMirror")).toContainText("Text before the image.");
    await expect(page.locator(".ProseMirror")).toContainText("Text after the image.");
    const docx = await downloadAction(page, "file.downloadDocx");
    expect(docx.suggestedFilename()).toMatch(/\.docx$/i);
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/export-pdf") && response.request().method() === "POST");
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    await page.locator('[data-menu-action="file.downloadPdf"]').click();
    expect((await responsePromise).status()).toBe(200);
    expect(await page.waitForEvent("download")).toBeTruthy();
  });

  test("inserts, persists, and exports manual page and section breaks", async ({ page }) => {
    await openStudio(page);
    const editor = await replaceEditorContent(page, "Page one text.");

    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-action="insert.pageBreak"]').click();
    await expect(editor.locator('[data-document-page-break="true"]')).toHaveCount(1);
    await page.keyboard.type("Page two text.");
    await expect(editor).toContainText("Page two text.");

    await page.locator('[data-menu-root="insert"]').click();
    await page.locator('[data-menu-submenu="insert.sectionBreak"]').hover();
    await page.locator('[data-menu-action="insert.sectionBreakNextPage"]').click();
    await expect(editor.locator('[data-document-section-break="true"]')).toHaveAttribute("data-section-break-type", "nextPage");
    await page.keyboard.type("Section two text.");
    // Wait for the save caused by the inserted section/text rather than a
    // possibly already-visible "Saved" state from the initial document load.
    await expect(page.locator('[data-studio-save-status="saving"]')).toBeVisible();
    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 6_000 });

    await page.reload();
    const restored = page.locator(".ProseMirror");
    await expect(restored.locator('[data-document-page-break="true"]')).toHaveCount(1);
    await expect(restored.locator('[data-document-section-break="true"]')).toHaveAttribute("data-section-break-type", "nextPage");
    await expect(restored).toContainText("Page one text.");
    await expect(restored).toContainText("Page two text.");
    await expect(restored).toContainText("Section two text.");

    const docx = await downloadAction(page, "file.downloadDocx");
    expect(docx.suggestedFilename()).toMatch(/\.docx$/i);
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/export-pdf") && response.request().method() === "POST");
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    await page.locator('[data-menu-action="file.downloadPdf"]').click();
    expect((await responsePromise).status()).toBe(200);
    expect(await page.waitForEvent("download")).toBeTruthy();
  });

  test("downloads non-empty DOCX and PDF exports", async ({ page }) => {
    await openStudio(page);
    await replaceEditorContent(page, "Small deterministic export document.");
    const docx = await downloadAction(page, "file.downloadDocx");
    expect(docx.suggestedFilename()).toMatch(/\.docx$/i);

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/export-pdf") && response.request().method() === "POST",
    );
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    await expect(page.locator('[data-menu-action="file.downloadPdf"]')).toBeVisible();
    await page.locator('[data-menu-action="file.downloadPdf"]').click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const pdf = await page.waitForEvent("download");
    const stream = await pdf.createReadStream();
    let pdfSize = 0;
    for await (const chunk of stream ?? []) pdfSize += (chunk as Buffer).length;
    expect(pdfSize).toBeGreaterThan(0);
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 393, height: 851 } });

    test("has no horizontal overflow and keeps the editor usable", async ({ page }) => {
      await openStudio(page);
      const editor = await replaceEditorContent(page, "Mobile editor smoke test.");
      await expect(editor).toBeVisible();
      const dimensions = await page.evaluate(() => ({ scroll: document.body.scrollWidth, client: document.body.clientWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 2);
    });
  });
});
