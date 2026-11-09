import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import { defaultDocumentSettings } from "../../app/tools/document-studio/utils/documentSettings";

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
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify({
      [id]: [{ kind: "text", page: 1, xMm: 25, yMm: 40, wMm: 80, hMm: 40, flip: false, typography: type, id: "multi", text: "پہلی" }],
    }));
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
});
