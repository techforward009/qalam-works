import { expect, test, type Page } from '@playwright/test';
import type { Editor } from '@tiptap/core';
import { defaultDocumentSettings } from '../../app/tools/document-studio/utils/documentSettings';

const story = (page: Page) => page.locator('.ProseMirror');
const storyJson = (page: Page) => story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
const object = (page: Page, id: string) => page.locator(`[data-studio-frame-id="${id}"]`);

test('creates a single-line title box beside an independently styled multiline box', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio');
  await expect(story(page)).toBeEditable({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  const typography = { ...defaultDocumentSettings().typography, defaultRtlFontId: 'mehr-nastaliq-web' };
  await page.evaluate(typography => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [
      { id: 'multiline', kind: 'text', page: 1, xMm: 25, yMm: 35, wMm: 90, hMm: 25, flip: false, text: 'پہلی سطر', typography },
    ] }));
  }, typography);
  await page.reload();
  const multiline = object(page, 'multiline').locator('textarea[data-studio-text-frame]');
  await expect(multiline).toBeVisible();
  const initialStory = await storyJson(page);

  await page.locator('[data-studio-tool-button="title-text"]').click();
  const objects = page.locator('[data-studio-objects]');
  const bounds = (await objects.boundingBox())!;
  const pxPerMm = 96 / 25.4;
  const x = bounds.x + 25 * pxPerMm, y = bounds.y + 75 * pxPerMm;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 90 * pxPerMm, y + 20 * pxPerMm, { steps: 4 }); await page.mouse.up();
  const singleObject = page.locator('[data-studio-text-single-line="true"]').locator('..');
  const single = page.locator('input[data-studio-text-frame][data-studio-text-single-line="true"]');
  await expect(single).toBeVisible();
  await single.fill('عنوان ایک سطر');
  await single.press('Enter');
  await expect(single).toHaveValue('عنوان ایک سطر');
  await single.evaluate(el => {
    const data = new DataTransfer();
    data.setData('text/plain', 'پہلی\nدوسری');
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await expect(single).toHaveValue(/پہلی دوسری/);
  expect(await storyJson(page)).toEqual(initialStory);

  await single.click();
  await page.locator('#studio-font-family').selectOption({ label: 'Amiri' });
  const size = page.getByRole('textbox', { name: 'Size', exact: true });
  await size.fill('24'); await size.press('Enter');
  await page.getByRole('button', { name: 'Colour', exact: true }).click();
  await page.locator('[data-studio-colour-option="Red"]').click();
  await page.locator('[data-studio-geom="align-center"]').click();
  await expect(single).toHaveAttribute('data-studio-frame-font-family', 'Amiri');
  await expect(single).toHaveAttribute('data-studio-frame-font-size-pt', '24');
  await expect(single).toHaveAttribute('data-studio-frame-text-color', '#FF0000');
  await expect(single).toHaveAttribute('data-studio-frame-text-align', 'center');

  await multiline.click(); await multiline.press('End'); await multiline.press('Enter'); await multiline.pressSequentially('دوسری سطر');
  await expect(multiline).toHaveValue(/\n/);
  await page.locator('[data-studio-tool-button="select"]').click();
  await object(page, 'multiline').click();
  await expect(object(page, 'multiline').locator('[data-studio-frame-handle]')).toHaveCount(8);
  await page.locator('[data-studio-tool-button="text"]').click();
  await expect(single).toHaveCSS('white-space', 'nowrap');
  await expect(multiline).toHaveCSS('white-space', 'pre-wrap');
  await expect(single).toHaveCSS('color', 'rgb(255, 0, 0)');
  expect(await storyJson(page)).toEqual(initialStory);
  await page.screenshot({ path: '/workspace/inpage-reference/qalam-singleline-multiline-format.png', scale: 'css' });
  expect(await singleObject.count()).toBe(1);
});
