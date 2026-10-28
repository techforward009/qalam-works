import { expect, test, type Page } from '@playwright/test';
import type { Editor } from '@tiptap/core';
import { defaultDocumentSettings } from '../../app/tools/document-studio/utils/documentSettings';
const object = (page: Page, id: string) => page.locator(`[data-studio-frame-id="${id}"]`);
const box = (page: Page, id: string) => object(page, id).locator('textarea');
const story = (page: Page) => page.locator('.ProseMirror');
const snapshot = (page: Page) => story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio'); await expect(story(page)).toBeEditable({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await story(page).click();
  await story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.commands.setContent('<p dir="rtl">محفوظ مرکزی عبارت منتخب رہے</p>'));
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.save"]').click();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  const typography = { ...defaultDocumentSettings().typography, defaultRtlFontId: 'mehr-nastaliq-web' };
  await page.addInitScript(typography => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
    const base = { kind: 'text', page: 1, xMm: 25, wMm: 65, hMm: 25, flip: false, typography };
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [
      { ...base, id: 'empty', yMm: 40, text: '' },
      { ...base, id: 'single', yMm: 80, text: 'محفوظ عبارت ایک سطر' },
      { ...base, id: 'multi', yMm: 120, text: 'پہلی سطر\nدوسری سطر' },
    ] }));
  }, typography);
  await page.reload(); await expect(box(page, 'single')).toBeVisible();
});
test('empty RTL caret starts at the insertion edge in Single/Facing at 50/100/200%', async ({ page }, info) => {
  for (const facing of [false, true]) {
    if (facing) { await page.locator('[data-menu-root="view"]').click(); await page.locator('[data-menu-action="view.facing"]').click(); }
    for (const zoom of ['50', '100', '200']) {
      await page.getByRole('combobox', { name: 'Zoom', exact: true }).selectOption(zoom);
      const input = box(page, 'empty'); await input.focus(); await input.fill('');
      const caret = object(page, 'empty').locator('[data-studio-frame-caret]'); await expect(caret).toBeVisible();
      await expect.poll(async () => input.evaluate(el => {
        const input = el as HTMLTextAreaElement, r = input.getBoundingClientRect(), c = input.parentElement!.querySelector('[data-studio-frame-caret]')!.getBoundingClientRect(), s = getComputedStyle(input), scale = r.width / input.offsetWidth;
        return Math.abs(r.right - (parseFloat(s.borderRightWidth) + parseFloat(s.paddingRight)) * scale - c.right);
      })).toBeLessThanOrEqual(1.1);
      await input.pressSequentially('ب'); await expect(input).toHaveValue('ب');
      const typed = (await caret.boundingBox())!, field = (await input.boundingBox())!;
      expect(typed.x).toBeGreaterThan(field.x); expect(typed.x + typed.width).toBeLessThanOrEqual(field.x + field.width);
      await page.getByRole('textbox', { name: 'Size', exact: true }).focus(); await input.focus(); await input.fill('');
      await page.evaluate(async () => { await document.fonts.ready; document.fonts.dispatchEvent(new Event('loadingdone')); });
      await expect.poll(async () => input.evaluate(el => {
        const i=el as HTMLTextAreaElement,r=i.getBoundingClientRect(),c=i.parentElement!.querySelector('[data-studio-frame-caret]')!.getBoundingClientRect(),s=getComputedStyle(i);
        return Math.abs(r.right-(parseFloat(s.borderRightWidth)+parseFloat(s.paddingRight))*r.width/i.offsetWidth-c.right);
      })).toBeLessThanOrEqual(1.1);
      if (info.project.name === 'desktop-chrome' && !facing && zoom === '100') await page.screenshot({ path: info.outputPath('empty-rtl-caret.png'), scale: 'css' });
    }
  }
});
test('Arrow selects single-line boxes repeatedly and preserves drag and resize', async ({ page }) => {
  await page.locator('[data-studio-tool-button="select"]').click();
  for (const id of ['single', 'empty', 'multi', 'single']) {
    await object(page, id).click(); await expect(object(page, id).locator('[data-studio-frame-handle]')).toHaveCount(8);
    expect(await box(page, id).evaluate(el => document.activeElement === el)).toBe(false);
  }
  const frame = object(page, 'single'), before = (await frame.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2); await page.mouse.down(); await page.mouse.move(before.x + before.width / 2 + 12, before.y + before.height / 2 + 8, { steps: 3 }); await page.mouse.up();
  const moved = (await frame.boundingBox())!; expect(moved.x - before.x).toBeGreaterThan(8);
  const handle = (await frame.locator('[data-studio-frame-handle="se"]').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down(); await page.mouse.move(handle.x + handle.width / 2 + 12, handle.y + handle.height / 2 + 9, { steps: 3 }); await page.mouse.up();
  expect((await frame.boundingBox())!.width).toBeGreaterThan(moved.width + 5);
});
test('clicking an already-focused single-line box after Escape restores its handles and editing', async ({ page }) => {
  const input = box(page, 'single'); await input.click(); await expect(input).toBeFocused();
  await input.press('Escape'); await expect(object(page, 'single').locator('[data-studio-frame-handle]')).toHaveCount(0);
  await input.click(); await expect(object(page, 'single').locator('[data-studio-frame-handle]')).toHaveCount(8);
  await input.press('End'); await input.pressSequentially(' ب'); expect(await input.inputValue()).toContain(' ب');
  await box(page, 'multi').click(); await expect(object(page, 'multi').locator('[data-studio-frame-handle]')).toHaveCount(8);
});
test('box selection stays painted at the formatting controls, rejects formatting, and clears on dismissal', async ({ page }, info) => {
  const before = await snapshot(page), input = box(page, 'single'); await input.click(); await input.press('Control+a');
  const selected = await input.evaluate(el => { const i = el as HTMLTextAreaElement; return [i.selectionStart, i.selectionEnd]; });
  const font = page.getByRole('combobox', { name: 'Urdu font', exact: true }); await font.focus();
  await expect(object(page, 'single').locator('[data-studio-text-frame-selection]')).toBeVisible();
  expect(await input.evaluate(el => { const i = el as HTMLTextAreaElement; return [i.selectionStart, i.selectionEnd]; })).toEqual(selected);
  await font.selectOption({ label: 'Digital Khatt Indo-Pak' });
  await expect(page.locator('[data-studio-formatting-notice]')).toBeVisible(); expect(await snapshot(page)).toEqual(before);
  await expect(object(page, 'single').locator('[data-studio-text-frame-selection]')).toBeVisible();
  if (info.project.name === 'desktop-chrome') await page.screenshot({ path: info.outputPath('selection-at-toolbar.png'), scale: 'css' });
  await input.focus(); await input.press('ArrowLeft'); await expect(object(page, 'single').locator('[data-studio-text-frame-selection]')).toHaveCount(0);
  await input.press('Control+a'); await font.focus(); await box(page, 'multi').click();
  await expect(object(page, 'single').locator('[data-studio-text-frame-selection]')).toHaveCount(0);
});
test('story selection stays painted at a size field but clears when the target changes', async ({ page }) => {
  await story(page).click(); await page.keyboard.press('Control+a');
  await expect(page.locator('[data-studio-selection-layer] [data-studio-line-selection]').first()).toBeVisible();
  const before = await snapshot(page);
  const selection = await story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.state.selection.toJSON());
  const bandBefore = (await page.locator('[data-studio-selection-layer] [data-studio-line-selection]').first().boundingBox())!;
  await page.getByRole('textbox', { name: 'Size', exact: true }).focus(); await page.keyboard.press('Control+a');
  await expect(page.locator('[data-studio-selection-layer] [data-studio-line-selection]').first()).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
  expect(await story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.state.selection.toJSON())).toEqual(selection);
  const bandAfter = (await page.locator('[data-studio-selection-layer] [data-studio-line-selection]').first().boundingBox())!;
  for(const key of ['x','y','width','height'] as const) expect(Math.abs(bandBefore[key]-bandAfter[key])).toBeLessThanOrEqual(1);
  await box(page, 'single').click(); await expect(page.locator('[data-studio-selection-layer]')).toHaveCount(0);
  await box(page, 'single').press('Control+a');
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.new"]').click();
  await page.getByRole('dialog', { name: 'New Document', exact: true }).getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.locator('[data-studio-text-frame-selection], [data-studio-selection-layer]')).toHaveCount(0);
});
