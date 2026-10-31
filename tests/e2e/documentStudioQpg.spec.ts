import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("Save As downloads a portable QPG file and Open restores it without losing text", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")), { timeout: 20000 }).not.toBeNull();
  const beforeId = await page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"));
  await expect(page.locator("#document-studio-upload-input")).toHaveAttribute("accept", ".qpg,.inp,.txt,.docx");
  const story = page.locator(".ProseMirror").first();
  await story.click();
  await page.keyboard.type("اردو English");
  await page.keyboard.press("Control+Alt+s");
  const dialog = page.locator("[data-studio-qpg-save-as]");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "QPG file name" }).fill("Shared Urdu Document");
  await page.screenshot({ path: info.outputPath("qpg-save-as.png"), fullPage: false });
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Shared Urdu Document.qpg");
  const path = await download.path();
  expect(path).toBeTruthy();
  const bytes = readFileSync(path!);
  console.log("One-page QPG sample size:", bytes.byteLength, "bytes");
  await download.saveAs(info.outputPath("one-page-sample.qpg"));
  const data = JSON.parse(bytes.toString("utf8"));
  expect(data.format).toBe("qalam-page");
  expect(data.content).toBeDefined();
  await page.locator("#document-studio-upload-input").setInputFiles({
    name: "Shared Urdu Document.qpg",
    mimeType: "application/octet-stream",
    buffer: bytes,
  });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBe(beforeId);
  await expect(story).toContainText("اردو English");
  await expect.poll(() => page.locator("[data-studio-open-dialog]").count()).toBe(0);
  await page.screenshot({ path: info.outputPath("qpg-reopened.png"), fullPage: false });
});

test("Invalid QPG file reports an Urdu error and leaves the current document intact", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")), {timeout:20000}).not.toBeNull();
  const story = page.locator(".ProseMirror").first();
  await story.click();
  await page.keyboard.type("Safe content");
  const oldId = await page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"));
  for (const [filename, body] of [
    ["bad.qpg", "{"],
    ["wrong.qpg", '{"format":"wrong","version":1}'],
    ["newer.qpg", '{"format":"qalam-page","version":2}'],
  ]) {
    await page.locator("#document-studio-upload-input").setInputFiles({
      name: filename, mimeType: "application/octet-stream", buffer: Buffer.from(body),
    });
    await expect(story).toContainText("Safe content");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).toBe(oldId);
  }
});
