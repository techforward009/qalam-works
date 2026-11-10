import fs from 'fs';
import { expect, test, type Page } from '@playwright/test';
import type { Editor } from '@tiptap/core';
import { defaultDocumentSettings } from '../../app/tools/document-studio/utils/documentSettings';

const story = (page: Page) => page.locator('.ProseMirror');
const storyJson = (page: Page) => story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
const object = (page: Page, id: string) => page.locator(`[data-studio-frame-id="${id}"]`);
const pxPerMm = 96 / 25.4;

async function storedFrames(page: Page) {
  return page.evaluate(() => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1');
    const map = JSON.parse(localStorage.getItem('qalam-studio-frames-v1') || '{}') as Record<string, Array<{ id: string; singleLine?: boolean; hMm: number; wMm: number; yMm: number; text: string }>>;
    return id ? map[id] || [] : [];
  });
}

async function inkBalance(page: Page) {
  return page.locator('[data-studio-single-line-text]').evaluate(el => {
    const node = el as HTMLElement;
    const range = document.createRange();
    range.selectNodeContents(node);
    const ink = range.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const above = ink.top - (box.top + (parseFloat(style.borderTopWidth) || 0));
    const below = box.bottom - (parseFloat(style.borderBottomWidth) || 0) - ink.bottom;
    return { above, below, inkTop: ink.top, inkBottom: ink.bottom };
  });
}

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
  const single = page.locator('textarea[data-studio-text-frame][data-studio-text-single-line="true"]');
  await expect(single).toBeVisible();
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.singleLine)?.hMm).toBeCloseTo(8.5725, 3);
  expect((await singleObject.evaluate(el => (el as HTMLElement).offsetHeight))).toBeGreaterThan(28);
  expect((await singleObject.evaluate(el => (el as HTMLElement).offsetHeight))).toBeLessThan(36);
  await single.fill('عنوان ایک سطر');
  await expect.poll(async () => {
    const gap = await inkBalance(page);
    return Math.abs(gap.above - gap.below);
  }).toBeLessThan(2);
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
  const sizeBeforeAmiri = page.getByRole('textbox', { name: 'Size', exact: true });
  await sizeBeforeAmiri.fill('24'); await sizeBeforeAmiri.press('Enter');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.singleLine)?.hMm).toBeCloseTo(15.5575, 3);
  await expect.poll(async () => {
    const gap = await inkBalance(page);
    return Math.abs(gap.above - gap.below);
  }).toBeLessThan(2);
  const textBeforeSelect = await single.inputValue();
  await single.press('Control+a');
  await expect(singleObject.locator('[data-studio-line-selection]')).toHaveCount(1);
  const selectionAligned = await singleObject.evaluate(el => {
    const inkNode = el.querySelector('[data-studio-single-line-text]');
    const band = el.querySelector('[data-studio-line-selection]');
    if (!inkNode || !band) return false;
    const range = document.createRange();
    range.selectNodeContents(inkNode);
    const ink = range.getBoundingClientRect();
    const box = band.getBoundingClientRect();
    return box.top < ink.bottom && box.bottom > ink.top && el.querySelectorAll('[data-studio-line-selection]').length === 1;
  });
  expect(selectionAligned).toBe(true);
  await single.evaluate(el => {
    const input = el as HTMLTextAreaElement;
    const end = input.value.length;
    input.setSelectionRange(end, end);
    input.dispatchEvent(new Event('select', { bubbles: true }));
  });
  await expect.poll(() => singleObject.evaluate(el => {
    const inkNode = el.querySelector('[data-studio-single-line-text]');
    const caret = el.querySelector('[data-studio-frame-caret]');
    if (!inkNode || !caret) return false;
    const range = document.createRange();
    range.selectNodeContents(inkNode);
    const ink = range.getBoundingClientRect();
    const box = caret.getBoundingClientRect();
    return box.top < ink.bottom && box.bottom > ink.top;
  })).toBe(true);
  await page.locator('.ProseMirror').click();
  await expect(single).toHaveValue(textBeforeSelect);
  await single.click();
  await expect(single).toHaveValue(textBeforeSelect);
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
  await singleObject.click();
  await expect(singleObject.locator('[data-studio-frame-handle]')).toHaveCount(2);
  await expect(singleObject.locator('[data-studio-frame-handle="n"]')).toHaveCount(0);
  await object(page, 'multiline').click();
  await expect(object(page, 'multiline').locator('[data-studio-frame-handle]')).toHaveCount(8);
  await page.locator('[data-studio-tool-button="text"]').click();
  await expect(single).toHaveCSS('white-space', 'pre-wrap');
  await expect(single).toHaveCSS('overflow-wrap', 'break-word');
  await expect(multiline).toHaveCSS('white-space', 'pre-wrap');
  await expect(page.locator('[data-studio-single-line-text]')).toHaveCSS('color', 'rgb(255, 0, 0)');
  await expect(single).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  expect(await storyJson(page)).toEqual(initialStory);
  if (fs.existsSync('/workspace/inpage-reference')) {
    await page.screenshot({ path: '/workspace/inpage-reference/qalam-singleline-multiline-format.png', scale: 'css' });
  }
  expect(await singleObject.count()).toBe(1);
});

test('a horizontal single-line drag is one line tall and a multiline drag keeps its height', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio');
  await expect(story(page)).toBeEditable({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  const objects = page.locator('[data-studio-objects]');
  const bounds = (await objects.boundingBox())!;
  await page.locator('[data-studio-tool-button="title-text"]').click();
  const x = bounds.x + 30 * pxPerMm, y = bounds.y + 110 * pxPerMm;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 70 * pxPerMm, y, { steps: 3 }); await page.mouse.up();
  const single = page.locator('textarea[data-studio-text-single-line="true"]');
  await expect(single).toBeVisible();
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.singleLine)?.hMm).toBeCloseTo(8.5725, 3);
  expect((await storedFrames(page)).find(frame => frame.singleLine)?.wMm).toBeGreaterThan(60);

  await page.locator('[data-studio-tool-button="textbox"]').click();
  const mx = bounds.x + 30 * pxPerMm, my = bounds.y + 140 * pxPerMm;
  await page.mouse.move(mx, my); await page.mouse.down(); await page.mouse.move(mx + 80 * pxPerMm, my + 20 * pxPerMm, { steps: 4 }); await page.mouse.up();
  const multiline = page.getByRole('textbox', { name: 'Text box', exact: true });
  await expect(multiline).toBeVisible();
  const multiHeight = (await storedFrames(page)).find(frame => !frame.singleLine)?.hMm ?? 0;
  expect(multiHeight).toBeGreaterThan(18);
  expect(multiHeight).toBeLessThan(22);
});

test('loading a saved single-line frame fits its content height', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio');
  await expect(story(page)).toBeEditable({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  const typography = { ...defaultDocumentSettings().typography, defaultRtlFontId: 'mehr-nastaliq-web' as const };
  await page.evaluate(typography => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [
      { id: 'saved-title', kind: 'text', page: 1, xMm: 25, yMm: 40, wMm: 80, hMm: 25, flip: false, text: 'محفوظ عنوان', singleLine: true, typography },
    ] }));
  }, typography);
  await page.reload();
  await expect(page.locator('textarea[data-studio-text-single-line="true"]')).toHaveValue('محفوظ عنوان');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === 'saved-title')?.hMm).toBeCloseTo(8.5725, 3);
  expect((await storedFrames(page)).find(frame => frame.id === 'saved-title')?.yMm).toBe(40);
  await expect(page.locator('[data-studio-frame-overflow]')).toHaveCount(0);
});
