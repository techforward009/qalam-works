import { expect, test, type Page } from '@playwright/test';
import type { Editor } from '@tiptap/core';
import { defaultDocumentSettings } from '../../app/tools/document-studio/utils/documentSettings';
const object = (page: Page, id: string) => page.locator(`[data-studio-frame-id="${id}"]`);
const box = (page: Page, id: string) => object(page, id).locator('textarea');
const story = (page: Page) => page.locator('.ProseMirror');
// paragraph starts: 0, 15 (empty), 16, 27
const TEXT = 'پہلا پیراگراف ہے\n\nتیسرا پیراگراف\nآخری';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio'); await expect(story(page)).toBeEditable({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await story(page).click();
  await story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.commands.setContent('<p dir="rtl">مرکزی عبارت</p>'));
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.save"]').click();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  const typography = { ...defaultDocumentSettings().typography, defaultRtlFontId: 'mehr-nastaliq-web' };
  await page.addInitScript(({ typography, text }) => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [
      { kind: 'text', page: 1, xMm: 25, yMm: 40, wMm: 65, hMm: 45, flip: false, typography, id: 'multi', text, paragraphAligns: ['center', null, 'left', null] },
    ] }));
  }, { typography, text: TEXT });
  await page.reload(); await expect(box(page, 'multi')).toBeVisible();
});
const sel = (page: Page) => box(page, 'multi').evaluate(el => { const t = el as HTMLTextAreaElement; return [t.selectionStart, t.selectionEnd]; });
test('Ctrl+Up/Down jump between paragraph starts in a multi-line text box', async ({ page }) => {
  const input = box(page, 'multi'); await input.focus();
  await input.evaluate(el => (el as HTMLTextAreaElement).setSelectionRange(5, 5));
  const starts = TEXT.split('\n').reduce<number[]>((acc, p, i) => (acc.push(i ? acc[i - 1] + TEXT.split('\n')[i - 1].length + 1 : 0), acc), []);
  for (const expected of [starts[1], starts[2], starts[3], TEXT.length]) { await page.keyboard.press('Control+ArrowDown'); await expect.poll(() => sel(page)).toEqual([expected, expected]); }
  await page.keyboard.press('Control+ArrowDown'); await expect.poll(() => sel(page)).toEqual([TEXT.length, TEXT.length]);
  for (const expected of [starts[3], starts[2], starts[1], 0, 0]) { await page.keyboard.press('Control+ArrowUp'); await expect.poll(() => sel(page)).toEqual([expected, expected]); }
  await input.evaluate((el, at) => (el as HTMLTextAreaElement).setSelectionRange(at, at), starts[2] + 3);
  await page.keyboard.press('Control+ArrowUp'); await expect.poll(() => sel(page)).toEqual([starts[2], starts[2]]);
  // Shift extends from the anchor
  await page.keyboard.press('Control+Shift+ArrowDown'); await expect.poll(() => sel(page)).toEqual([starts[2], starts[3]]);
  // painted caret follows a collapsed move (not stale)
  await page.keyboard.press('Control+ArrowDown');
  const caret = object(page, 'multi').locator('[data-studio-frame-caret]'); await expect(caret).toBeVisible();
  const lastY = (await caret.boundingBox())!.y;
  await page.keyboard.press('Control+ArrowUp'); await page.keyboard.press('Control+ArrowUp');
  await expect.poll(async () => (await caret.boundingBox())!.y).toBeLessThan(lastY - 5);
  // typing still works at the new caret and the text box keeps its paragraphs
  await page.keyboard.type('ب'); await expect(input).toHaveValue(TEXT.slice(0, starts[2]) + 'ب' + TEXT.slice(starts[2]));
  await page.keyboard.press('Control+z'); await expect(input).toHaveValue(TEXT);
});
