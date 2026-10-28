import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { Document, Packer, Paragraph } from "docx";
import type { Editor } from "@tiptap/core";

async function importFile(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.locator('[data-menu-root="file"]').click();
  const [picker] = await Promise.all([page.waitForEvent("filechooser"), page.locator('[data-menu-action="file.upload"]').click()]);
  await picker.setFiles(file);
}
async function state(page: Page) {
  return page.locator(".ProseMirror").evaluate(el => ({
    id: localStorage.getItem("qalam-document-studio-active-document-v1"),
    doc: (el as HTMLElement & { editor: Editor }).editor.getJSON(),
    width: document.querySelector("[data-page-width-mm]")?.getAttribute("data-page-width-mm"),
  }));
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  page.on("dialog", dialog => dialog.accept());
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
});

test("File Import opens the existing real InPage fixture with Urdu and A5 page setup", async ({ page }) => {
  test.setTimeout(60_000);
  const prior = await state(page);
  await importFile(page, path.resolve("tests/fixtures/inpage/hadiyat.inp"));
  const imported = page.getByRole("dialog", { name: "InPage text imported", exact: true });
  await expect(imported).toBeVisible();
  await expect(page.locator(".ProseMirror")).toContainText("تعقیبات نماز پنجگانہ");
  await expect(page.locator(".ProseMirror")).toContainText("ایام ہفتہ کے اعمال");
  await expect(imported.getByRole("button", { name: "Copy story 6", exact: true })).toBeVisible();
  await imported.getByRole("button", { name: "Close", exact: true }).click();
  const root = page.locator("[data-studio-print-root]");
  for (const [attribute, pt] of [
    ["data-page-width-mm", 419.527], ["data-page-height-mm", 595.275],
    ["data-print-margin-left-mm", 57.6], ["data-print-margin-right-mm", 57.6],
    ["data-print-margin-top-mm", 50.976], ["data-print-margin-bottom-mm", 32.976],
  ] as const) expect(Number(await root.getAttribute(attribute)) * 72 / 25.4, attribute).toBeCloseTo(pt, 2);
  await expect(page.locator("[data-studio-page-label]")).toHaveText(/^77\//);
  const paper = (await page.locator("[data-studio-page-paper]").first().boundingBox())!;
  expect(paper.width / paper.height).toBeCloseTo(839054 / 1190550, 2);
  expect((await state(page)).id).not.toBe(prior.id);
  await page.reload();
  await expect(page.locator(".ProseMirror")).toContainText("تعقیبات نماز پنجگانہ");
  await expect(page.locator("[data-studio-page-label]")).toHaveText(/^77\//);
  await expect(page.locator("#document-studio-upload-input")).toHaveAttribute("accept", ".inp,.txt,.docx");
});

test("TXT import preserves Urdu and meaningful blank lines through the old handler", async ({ page }) => {
  const before = await state(page);
  await importFile(page, { name: "sample.txt", mimeType: "text/plain", buffer: Buffer.from("پہلا پیراگراف\n\nدوسرا پیراگراف\n", "utf8") });
  expect(await page.locator(".ProseMirror p").allTextContents()).toEqual(["پہلا پیراگراف", "", "دوسرا پیراگراف", ""]);
  expect((await state(page)).id).toBe(before.id); expect((await state(page)).width).toBe(before.width);
});

test("DOCX import still extracts Urdu text and retains the existing plain-text warning", async ({ page }) => {
  const confirmations: string[] = []; page.on("dialog", dialog => { confirmations.push(dialog.message()); });
  const before = await state(page);
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("پہلا اردو پیراگراف"), new Paragraph("دوسرا اردو پیراگراف")] }] }));
  await importFile(page, { name: "sample.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer });
  await expect(page.locator(".ProseMirror")).toContainText("پہلا اردو پیراگراف");
  expect(await page.locator(".ProseMirror p").allTextContents()).toEqual(["پہلا اردو پیراگراف", "دوسرا اردو پیراگراف"]);
  expect(confirmations.some(text => text.includes("plain text only"))).toBe(true);
  expect((await state(page)).id).toBe(before.id); expect((await state(page)).width).toBe(before.width);
});

for (const [name, data, error] of [
  ["unsupported.bin", "bad file", /Only \.inp, \.txt and \.docx/],
  ["corrupt.inp", "not an OLE compound file", /InPage|OLE|container/i],
  ["empty.inp", "", /InPage|OLE|container/i],
  ["corrupt.docx", "not a DOCX archive", /Failed to import file/i],
] as const) {
  test(`${name} gives a useful error without changing document data`, async ({ page }) => {
    await page.locator(".ProseMirror").evaluate(el => (el as HTMLElement & { editor: Editor }).editor.commands.setContent("<p>محفوظ متن</p>"));
    const before = await state(page);
    await importFile(page, { name, mimeType: "application/octet-stream", buffer: Buffer.from(data) });
    await expect(page.locator("[data-studio-import-error]")).toContainText(error);
    await expect(page.locator("[data-studio-import-error]")).toBeVisible();
    expect(await state(page)).toEqual(before);
    // A later valid import clears either error channel and still works.
    await importFile(page, { name: "recovered.txt", mimeType: "text/plain", buffer: Buffer.from("دوبارہ درست متن") });
    await expect(page.locator(".ProseMirror")).toHaveText("دوبارہ درست متن");
    await expect(page.locator("[data-studio-import-error]")).toHaveCount(0);
  });
}

test("Ctrl+Y stays Redo and the Phase 1 menu labels remain unchanged", async ({ page }) => {
  await page.locator('[data-studio-tool-button="text"]').click(); await page.locator(".ProseMirror").focus();
  await page.keyboard.insertText("اصل متن"); await page.keyboard.press("Control+z");
  await expect(page.locator(".ProseMirror")).toHaveText("");
  let picker = false; page.on("filechooser", () => { picker = true; });
  await page.keyboard.press("Control+y"); await expect(page.locator(".ProseMirror")).toHaveText("اصل متن");
  expect(picker).toBe(false);
  await expect(page.locator("[data-menu-root]")).toHaveText(["File", "Edit", "View", "Format", "Insert", "Utilities", "Window", "Help"]);
});
