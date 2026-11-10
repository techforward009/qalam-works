import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import { defaultDocumentSettings } from "../../app/tools/document-studio/utils/documentSettings";

const object = (page: Page, id: string) => page.locator(`[data-studio-frame-id="${id}"]`);
const box = (page: Page, id: string) => object(page, id).locator("textarea");
const story = (page: Page) => page.locator("[data-studio-selection-host] .ProseMirror:not([data-studio-frame-editor])");
const frameEditor = (page: Page, id: string) => object(page, id).locator("[data-studio-frame-editor]");

test("flagged PM text box clips overflow and keeps a bottom mark", async ({ page }) => {
  const lines = Array.from({ length: 12 }, (_, index) => `سطر ${index + 1}`).join("\n");
  await page.addInitScript(() => {
    localStorage.setItem("qalam-site-language", "en");
    localStorage.setItem("qalam.textboxPm", "1");
  });
  await page.goto("/tools/document-studio?textboxPm=1");
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
  await page.evaluate(({ typography: type, lines: text }) => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1");
    if (!id) return;
    const key = "qalam-studio-frames-v1";
    const map = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown>;
    map[id] = [{ kind: "text", page: 1, xMm: 25, yMm: 40, wMm: 80, hMm: 25, flip: false, typography: type, id: "multi", text }];
    localStorage.setItem(key, JSON.stringify(map));
  }, { typography, lines });
  await page.reload();
  await expect(box(page, "multi")).toBeVisible();
  const host = object(page, "multi");
  const mark = host.locator('[data-studio-frame-overflow="bottom"]');
  await expect(mark).toBeVisible();
  await expect.poll(async () => box(page, "multi").evaluate((el) => (el as HTMLTextAreaElement).scrollTop)).toBe(0);
  const bounds = await host.boundingBox();
  if (!bounds) throw new Error("text frame has no box");
  await page.mouse.click(bounds.x + bounds.width - 8, bounds.y + 14);
  const editor = frameEditor(page, "multi");
  await expect(editor).toBeVisible();
  await expect(mark).toBeVisible();
  const scrollTop = () => editor.evaluate((el) => (el as HTMLElement).scrollTop);
  await editor.evaluate((el) => { (el as HTMLElement).scrollTop = 48; });
  await expect.poll(scrollTop).toBe(0);
  await editor.hover();
  await page.mouse.wheel(0, 140);
  await page.keyboard.press("Control+End");
  await expect.poll(scrollTop).toBe(0);
  await expect(host.locator("[data-studio-frame-caret]")).toHaveCount(0);
  const docText = () => editor.evaluate((el) => {
    const pm = (el as HTMLElement & { editor: Editor }).editor;
    return pm.state.doc.textBetween(0, pm.state.doc.content.size, "\n");
  });
  expect(await docText()).toBe(lines);
  await editor.evaluate((el) => {
    (el as HTMLElement & { editor: Editor }).editor.commands.setContent("<p dir=\"rtl\">مختصر</p>");
  });
  await expect(host.locator("[data-studio-frame-overflow]")).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expect.poll(docText).toBe(lines);
  await expect(mark).toBeVisible();
  await expect.poll(scrollTop).toBe(0);
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(box(page, "multi")).toHaveValue(lines);
  await expect(mark).toBeVisible();
});
