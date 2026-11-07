import { expect, test, type Page } from '@playwright/test';
import type { Editor } from '@tiptap/core';
import { defaultDocumentSettings } from '../../app/tools/document-studio/utils/documentSettings';

const frame = (page: Page) => page.locator('[data-studio-frame-id="multi"]');
const box = (page: Page) => frame(page).locator('textarea[data-studio-text-frame]');
const story = (page: Page) => page.locator('.ProseMirror');
const storyJson = (page: Page) => story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());

test('formats multiline text boxes as whole boxes and leaves story formatting independent', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio');
  await expect(story(page)).toBeEditable({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await story(page).click();
  await story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.commands.setContent('<p dir="rtl">محفوظ مرکزی عبارت منتخب رہے</p>'));
  const initialStory = await storyJson(page);
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.save"]').click();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  const typography = { ...defaultDocumentSettings().typography, defaultRtlFontId: 'mehr-nastaliq-web' };
  await page.evaluate(typography => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
    const base = { kind: 'text', page: 1, xMm: 25, wMm: 65, hMm: 25, flip: false, typography };
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [
      { ...base, id: 'empty', yMm: 40, text: '' },
      { ...base, id: 'single', yMm: 80, text: 'محفوظ عبارت ایک سطر' },
      { ...base, id: 'multi', yMm: 120, text: 'پہلی سطر\nدوسری سطر' },
    ] }));
  }, typography);
  await page.reload();
  await expect(box(page)).toBeVisible();
  await expect(story(page)).toBeEditable();
  const original = await storyJson(page);

  const empty = page.locator('[data-studio-frame-id="empty"] textarea[data-studio-text-frame]');
  await empty.click();
  await page.locator('[data-studio-geom="align-center"]').click();
  const emptyCaret = page.locator('[data-studio-frame-id="empty"] [data-studio-frame-caret]');
  await expect(emptyCaret).toBeVisible();
  await expect.poll(async () => {
    const inputBox = await empty.boundingBox();
    const caretBox = await emptyCaret.boundingBox();
    return inputBox && caretBox ? Math.abs((caretBox.x + caretBox.width / 2) - (inputBox.x + inputBox.width / 2)) : Infinity;
  }).toBeLessThanOrEqual(2);

  await box(page).click();
  await box(page).press('End');
  await box(page).press('Enter');
  await box(page).pressSequentially('تیسری سطر');
  await expect(box(page)).toHaveValue(/\n/);
  await page.locator('#studio-font-family').selectOption({ label: 'Amiri' });
  const size = page.getByRole('textbox', { name: 'Size', exact: true });
  await size.fill('24');
  await size.press('Enter');
  await page.getByRole('button', { name: 'Colour', exact: true }).click();
  await page.locator('[data-studio-colour-option="Red"]').click();
  await page.locator('[data-studio-geom="align-center"]').click();

  await expect(box(page)).toHaveAttribute('data-studio-frame-font-family', 'Amiri');
  await expect(box(page)).toHaveAttribute('data-studio-frame-font-size-pt', '24');
  await expect(box(page)).toHaveAttribute('data-studio-frame-text-color', '#FF0000');
  await expect(box(page)).toHaveAttribute('data-studio-frame-text-align', 'center');
  await expect(box(page)).toHaveCSS('color', 'rgb(255, 0, 0)');
  await expect(box(page)).toHaveCSS('text-align', 'center');
  expect(await storyJson(page)).toEqual(original);
  await page.screenshot({ path: '/workspace/inpage-reference/qalam-multiline-textbox-format.png', scale: 'css' });

  await story(page).click();
  await expect(page.locator('#studio-font-family')).toBeEnabled();
  await expect(page.locator('#studio-font-family')).not.toHaveValue('Amiri');
  expect(await storyJson(page)).toEqual(initialStory);
});
