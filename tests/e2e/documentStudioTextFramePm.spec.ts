import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import { defaultDocumentSettings } from "../../app/tools/document-studio/utils/documentSettings";
import { renderPrintFrame } from "../../app/tools/document-studio/utils/printableFrames";

const object = (page: Page, id: string) => page.locator(`[data-studio-frame-id="${id}"]`);
const box = (page: Page, id: string) => object(page, id).locator("textarea");
const story = (page: Page) => page.locator("[data-studio-selection-host] .ProseMirror:not([data-studio-frame-editor])");
const frameEditor = (page: Page, id: string) => object(page, id).locator("[data-studio-frame-editor]");

async function openStudio(page: Page, flag: boolean) {
  await page.addInitScript((enabled) => {
    localStorage.setItem("qalam-site-language", "en");
    if (enabled) {
      localStorage.setItem("qalam.keyboard.layout", "inpageMonotype");
      localStorage.setItem("qalam.textboxPm", "1");
    } else {
      localStorage.removeItem("qalam.textboxPm");
    }
  }, flag);
  await page.goto(flag ? "/tools/document-studio?textboxPm=1" : "/tools/document-studio");
  await expect(story(page)).toBeEditable({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await story(page).click();
  await story(page).evaluate((el) => {
    (el as HTMLElement & { editor: Editor }).editor.commands.setContent('<p dir="rtl">مرکزی عبارت</p>');
  });
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.save"]').click();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  const typography = { ...defaultDocumentSettings().typography, defaultRtlFontId: "mehr-nastaliq-web" };
  await page.addInitScript(({ typography: type }) => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1");
    if (!id) return;
    const key = "qalam-studio-frames-v1";
    const map = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown>;
    const existing = map[id];
    if (Array.isArray(existing) && existing.some((frame) => frame && typeof frame === "object" && (frame as { id?: string }).id === "multi")) return;
    map[id] = [{ kind: "text", page: 1, xMm: 25, yMm: 40, wMm: 80, hMm: 40, flip: false, typography: type, id: "multi", text: "پہلی" }];
    localStorage.setItem(key, JSON.stringify(map));
  }, { typography });
  await page.reload();
  await expect(box(page, "multi")).toBeVisible();
}

async function docText(page: Page, id: string) {
  return frameEditor(page, id).evaluate((el) => {
    const editor = (el as HTMLElement & { editor: Editor }).editor;
    return editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
  });
}

async function storyJson(page: Page) {
  return story(page).evaluate((el) => JSON.stringify((el as HTMLElement & { editor: Editor }).editor.getJSON()));
}

test("flag on: type, paragraph, undo, and escape stay inside the box", async ({ page }) => {
  await openStudio(page, true);
  await expect(page.locator("[data-studio-keyboard-status]")).toHaveText("Monotype Keyboard");
  await expect(frameEditor(page, "multi")).toHaveCount(0);
  const host = object(page, "multi");
  const bounds = await host.boundingBox();
  if (!bounds) throw new Error("text frame has no box");
  await page.mouse.click(bounds.x + bounds.width - 8, bounds.y + 14);
  const editor = frameEditor(page, "multi");
  await expect(editor).toBeVisible();
  await expect(box(page, "multi")).toHaveCount(0);
  await editor.click();
  await page.keyboard.press("Control+End");
  const storyBefore = await storyJson(page);
  await page.keyboard.press("a");
  await expect.poll(() => docText(page, "multi")).toContain("ق");
  await page.keyboard.press("Enter");
  await expect.poll(() => docText(page, "multi")).toMatch(/ق\n/);
  const afterEnter = await docText(page, "multi");
  await page.keyboard.press("Control+z");
  await expect.poll(() => docText(page, "multi")).not.toMatch(/\n/);
  const afterUndo = await docText(page, "multi");
  expect(afterUndo).not.toBe(afterEnter);
  expect(await storyJson(page)).toBe(storyBefore);
  await page.keyboard.press("Control+y");
  await expect.poll(() => docText(page, "multi")).toMatch(/ق\n/);
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(() => docText(page, "multi")).not.toMatch(/\n/);
  await page.locator("[data-studio-document-language]").click();
  await expect(editor).toBeVisible();
  await page.locator("[data-studio-document-language]").selectOption("en");
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("a");
  await expect.poll(() => docText(page, "multi")).toMatch(/a$/);
  await page.locator('[data-menu-root="file"]').click();
  await expect(editor).toBeVisible();
  await page.locator('[data-menu-action="file.save"]').click();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  const saved = await page.evaluate(() => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1");
    const frames = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}")[id!] as Array<{ id: string; text: string; paragraphAligns?: unknown }>;
    return frames.find((frame) => frame.id === "multi");
  });
  expect(saved?.text).toBe(await docText(page, "multi"));
  expect(saved?.paragraphAligns).toBeUndefined();
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(object(page, "multi").locator(".ProseMirror")).toHaveCount(0);
  await expect(box(page, "multi")).toHaveValue(saved?.text ?? "");
});

test("flag off keeps the textarea path", async ({ page }) => {
  await openStudio(page, false);
  const host = object(page, "multi");
  await box(page, "multi").click();
  await expect(box(page, "multi")).toBeFocused();
  await expect(frameEditor(page, "multi")).toHaveCount(0);
  await expect(host.locator(".ProseMirror")).toHaveCount(0);
  await page.keyboard.press("End");
  await page.keyboard.type("x");
  await expect(box(page, "multi")).toHaveValue("پہلیx");
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="format.paragraph"]').click();
  await expect(page.locator('[data-studio-paragraph-dialog="true"]')).toHaveCount(0);
  await expect(page.locator('[data-studio-formatting-notice]')).toBeVisible();
});

test("flag on: set space-before on a box paragraph, leave edit, reload, and assert print HTML contains margin-block-start", async ({ page }) => {
  await openStudio(page, true);
  const host = object(page, "multi");
  const bounds = await host.boundingBox();
  if (!bounds) throw new Error("text frame has no box");
  await page.mouse.click(bounds.x + bounds.width - 8, bounds.y + 14);
  const editor = frameEditor(page, "multi");
  await expect(editor).toBeVisible();
  await editor.click();

  // Open paragraph preferences dialog from Format menu
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="format.paragraph"]').click();
  const dialog = page.locator('[data-studio-paragraph-dialog="true"]');
  await expect(dialog).toBeVisible();

  // Set space-before to 14
  const beforeInput = dialog.locator('input[name="before"]');
  await beforeInput.fill("14");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toHaveCount(0);

  // Save the document
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.save"]').click();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();

  // Leave edit mode
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);

  // Reload page
  await page.reload();
  await expect(box(page, "multi")).toBeVisible();

  // Read saved frame from localStorage and verify print HTML
  const saved = await page.evaluate(() => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1");
    const frames = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}")[id!] as Array<any>;
    return frames.find((frame) => frame.id === "multi");
  });
  expect(saved).toBeDefined();
  expect(saved?.paragraphFormats?.[0]?.spaceBeforePt).toBeGreaterThan(0);
  const printHtml = renderPrintFrame(saved);
  expect(printHtml).toContain("margin-block-start");
  expect(printHtml).toContain("--qalam-space-before");
});
