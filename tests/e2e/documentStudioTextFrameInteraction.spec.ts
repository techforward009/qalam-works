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
test('Text tool edits single-line boxes after Escape without showing object handles', async ({ page }) => {
  const input = box(page, 'single'), handles = object(page, 'single').locator('[data-studio-frame-handle]');
  await input.click(); await expect(input).toBeFocused();
  await expect(handles).toHaveCount(0);
  await input.press('Escape'); await expect(handles).toHaveCount(0);
  await input.click(); await expect(input).toBeFocused(); await expect(handles).toHaveCount(0);
  await input.press('End'); await input.pressSequentially(' ب');
  expect(await input.inputValue()).toContain(' ب');
  await box(page, 'multi').click();
  await expect(object(page, 'multi').locator('[data-studio-frame-handle]')).toHaveCount(0);
});
test('Arrow alone shows handles; clicking an empty page area or switching to Text dismisses them', async ({ page }, info) => {
  const single = object(page, 'single'), handles = single.locator('[data-studio-frame-handle]');
  const arrow = page.locator('[data-studio-tool-button="select"]');
  const textTool = page.locator('[data-studio-tool-button="text"]');
  const input = box(page, 'single');

  // Editing is not frame selection.
  await input.click(); await expect(input).toBeFocused(); await expect(handles).toHaveCount(0);

  await arrow.click(); await single.click(); await expect(handles).toHaveCount(8);
  // Empty paper inside the object layer must clear the eight handles.
  await page.locator('[data-studio-objects]').click({ position: { x: 8, y: 8 } });
  await expect(handles).toHaveCount(0);
  await single.click(); await expect(handles).toHaveCount(8);

  // Changing to the text insertion tool also immediately clears the object.
  await textTool.click(); await expect(handles).toHaveCount(0);
  await input.click(); await expect(input).toBeFocused(); await expect(handles).toHaveCount(0);
  await story(page).click(); await expect(handles).toHaveCount(0);

  // Returning to Arrow does not resurrect an old selection.
  await arrow.click(); await expect(handles).toHaveCount(0);
  await single.click(); await expect(handles).toHaveCount(8);
  await object(page, 'multi').click(); await expect(handles).toHaveCount(0);
  await expect(object(page, 'multi').locator('[data-studio-frame-handle]')).toHaveCount(8);
  if (info.project.name === 'desktop-chrome') await page.screenshot({ path: info.outputPath('arrow-selection-only.png'), scale: 'css' });
});
test('box selection stays painted at the formatting controls, applies whole-box font, and clears on dismissal', async ({ page }, info) => {
  const before = await snapshot(page), input = box(page, 'single'); await input.click(); await input.press('Control+a');
  const selected = await input.evaluate(el => { const i = el as HTMLTextAreaElement; return [i.selectionStart, i.selectionEnd]; });
  const font = page.getByRole('combobox', { name: 'Urdu font', exact: true }); await font.focus();
  await expect(object(page, 'single').locator('[data-studio-text-frame-selection]')).toBeVisible();
  expect(await input.evaluate(el => { const i = el as HTMLTextAreaElement; return [i.selectionStart, i.selectionEnd]; })).toEqual(selected);
  await font.selectOption({ label: 'Digital Khatt Indo-Pak' });
  await expect(page.locator('[data-studio-formatting-notice]')).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  await expect(input).toHaveAttribute('data-studio-frame-font-family', 'Digital Khatt Indo-Pak');
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

async function caretMetrics(input: ReturnType<typeof box>) {
  return input.evaluate(el => {
    const field = el as HTMLTextAreaElement;
    const caret = field.parentElement!.querySelector('[data-studio-frame-caret]')!.getBoundingClientRect();
    const bounds = field.getBoundingClientRect();
    const style = getComputedStyle(field);
    const scale = bounds.width / field.offsetWidth;
    const rightInset = (parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight)) * scale;
    const leftInset = (parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)) * scale;
    return {
      value: field.value,
      start: field.selectionStart,
      end: field.selectionEnd,
      fromRight: bounds.right - rightInset - caret.right,
      fromLeft: caret.left - (bounds.left + leftInset),
      fromCenter: caret.left + caret.width / 2 - (bounds.left + bounds.width / 2),
      top: caret.top - bounds.top,
      scrollTop: field.scrollTop,
      scrollHeight: field.scrollHeight,
      clientHeight: field.clientHeight,
      scrollbarWidth: style.scrollbarWidth,
      overflowY: style.overflowY,
      borderTop: style.borderTopWidth,
      offsetHeight: field.offsetHeight,
    };
  });
}

test('a multi-line box hides its scrollbar and still scrolls', async ({ page }) => {
  const before = await snapshot(page);
  const input = box(page, 'multi');
  const heightBefore = await input.evaluate(el => (el as HTMLTextAreaElement).offsetHeight);
  await input.click();
  const lines = Array.from({ length: 14 }, (_, index) => `سطر ${index + 1}`).join('\n');
  await input.fill(lines);
  await expect.poll(async () => (await caretMetrics(input)).scrollHeight).toBeGreaterThan((await caretMetrics(input)).clientHeight);
  const fitted = await caretMetrics(input);
  expect(fitted.scrollbarWidth).toBe('none');
  expect(fitted.overflowY).toBe('auto');
  expect(fitted.borderTop).toBe('1px');
  expect(fitted.offsetHeight).toBe(heightBefore);
  expect(fitted.value).toBe(lines);
  await input.evaluate(el => { (el as HTMLTextAreaElement).scrollTop = 36; });
  await expect.poll(async () => (await caretMetrics(input)).scrollTop).toBeGreaterThan(20);
  await input.evaluate(el => { (el as HTMLTextAreaElement).scrollTop = 0; });
  await input.hover();
  await page.mouse.wheel(0, 120);
  await expect.poll(async () => (await caretMetrics(input)).scrollTop).toBeGreaterThan(10);
  await input.press('Control+End');
  await expect.poll(async () => (await caretMetrics(input)).scrollTop).toBeGreaterThan(20);
  expect(await input.inputValue()).toBe(lines);
  expect(await snapshot(page)).toEqual(before);
});

test('Enter places the empty-line caret from the frame alignment', async ({ page }) => {
  const before = await snapshot(page);
  const input = box(page, 'multi');
  const align = (name: string) => page.getByRole('button', { name, exact: true }).click();
  await input.click();
  await input.fill('عنوان');
  await align('Align right');
  await input.press('End');
  await input.press('Enter');
  await expect.poll(async () => (await caretMetrics(input)).fromRight).toBeLessThanOrEqual(2);
  let metrics = await caretMetrics(input);
  expect(metrics.value).toBe('عنوان\n');
  expect([metrics.start, metrics.end]).toEqual([6, 6]);
  const firstTop = metrics.top;
  await input.press('Enter');
  await expect.poll(async () => (await caretMetrics(input)).top).toBeGreaterThan(firstTop + 16);
  metrics = await caretMetrics(input);
  expect(metrics.value).toBe('عنوان\n\n');
  expect(metrics.fromRight).toBeLessThanOrEqual(2);
  await input.pressSequentially('ب');
  await expect(input).toHaveValue('عنوان\n\nب');
  await expect.poll(async () => (await caretMetrics(input)).fromRight).toBeGreaterThan(8);

  await input.fill('عنوان');
  await align('Align center');
  await input.press('End');
  await input.press('Enter');
  await expect.poll(async () => Math.abs((await caretMetrics(input)).fromCenter)).toBeLessThanOrEqual(4);
  expect(await input.inputValue()).toBe('عنوان\n');

  await input.fill('عنوان');
  await align('Justify');
  await input.press('End');
  await input.press('Enter');
  await expect.poll(async () => (await caretMetrics(input)).fromRight).toBeLessThanOrEqual(2);
  metrics = await caretMetrics(input);
  expect(Math.abs(metrics.fromCenter)).toBeGreaterThan(20);
  expect(metrics.value).toBe('عنوان\n');

  await input.fill('عنوان');
  await align('Full justify');
  await input.press('End');
  await input.press('Enter');
  await expect.poll(async () => (await caretMetrics(input)).fromRight).toBeLessThanOrEqual(2);

  await input.fill('Hello');
  await align('Align left');
  await input.press('End');
  await input.press('Enter');
  await expect.poll(async () => (await caretMetrics(input)).fromLeft).toBeLessThanOrEqual(4);
  expect(await input.inputValue()).toBe('Hello\n');
  await input.pressSequentially('A');
  await expect(input).toHaveValue('Hello\nA');
  await expect.poll(async () => (await caretMetrics(input)).fromLeft).toBeGreaterThan(6);
  expect(await snapshot(page)).toEqual(before);
});

test('the first animation frame after Enter paints the caret on the new line', async ({ page }) => {
  const input = box(page, 'multi');
  await input.click();
  await input.fill('یہ ایک لمبا پیراگراف ہے جو کئی سطروں میں بٹ جائے گا اور اس کے بعد ایک نئی سطر بنے گی۔');
  await page.getByRole('button', { name: 'Justify', exact: true }).click();
  await input.press('End');
  await page.waitForTimeout(80);
  const before = await caretMetrics(input);
  await input.evaluate(el => {
    const target = el as HTMLTextAreaElement & { __enterCaret?: unknown[] };
    target.__enterCaret = [];
    el.addEventListener('keydown', () => {
      requestAnimationFrame(() => {
        const caret = el.parentElement?.querySelector('[data-studio-frame-caret]');
        const bounds = el.getBoundingClientRect();
        const box = caret?.getBoundingClientRect();
        const style = getComputedStyle(el);
        const scale = bounds.width / (el as HTMLTextAreaElement).offsetWidth;
        const rightInset = (parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight)) * scale;
        target.__enterCaret?.push({
          value: (el as HTMLTextAreaElement).value,
          start: (el as HTMLTextAreaElement).selectionStart,
          end: (el as HTMLTextAreaElement).selectionEnd,
          top: box ? box.top - bounds.top : null,
          fromRight: box ? bounds.right - rightInset - box.right : null,
        });
      });
    }, true);
  });
  await input.press('Enter');
  const trace = await input.evaluate(el => (el as HTMLTextAreaElement & { __enterCaret: Array<{ value: string; start: number; end: number; top: number | null; fromRight: number | null }> }).__enterCaret);
  expect(trace.length).toBeGreaterThan(0);
  expect(trace[0].value.endsWith('\n')).toBe(true);
  expect(trace[0].start).toBe(trace[0].value.length);
  expect(trace[0].end).toBe(trace[0].start);
  expect(trace[0].top).not.toBeNull();
  expect(trace[0].top!).toBeGreaterThan(before.top + 16);
  expect(trace[0].fromRight!).toBeLessThanOrEqual(4);
  await input.pressSequentially('ب');
  await expect(input).toHaveValue(`${trace[0].value}ب`);
  await input.press('Enter');
  const second = await caretMetrics(input);
  expect(second.value.endsWith('\n')).toBe(true);
  expect([second.start, second.end]).toEqual([second.value.length, second.value.length]);
  expect(second.fromRight).toBeLessThanOrEqual(4);
  // A 25mm frame scrolls once the wrapped paragraph passes the visible bottom.
  // The painted top is then the scrolled line, not another raw +16px content step.
  const linePitch = (trace[0].top ?? 0) - before.top;
  const visualTop = (trace[0].top ?? 0) + linePitch - second.scrollTop;
  expect(Math.abs(second.top - visualTop)).toBeLessThanOrEqual(4);
});

test('each multiline paragraph keeps its own alignment', async ({ page }) => {
  const before = await snapshot(page);
  const input = box(page, 'multi');
  const height = await input.evaluate(el => (el as HTMLTextAreaElement).offsetHeight);
  const align = (name: string) => page.getByRole('button', { name, exact: true }).click();
  const paragraphs = () => object(page, 'multi').locator('[data-studio-frame-paragraphs] [data-studio-frame-paragraph]');
  await input.click();
  await input.press('Control+Home');
  await align('Align left');
  await input.press('Control+End');
  await align('Align right');
  await expect.poll(async () => input.getAttribute('data-studio-frame-text-align')).toBe('right');
  await expect(paragraphs()).toHaveCount(2);
  await expect(paragraphs().first()).toHaveCSS('text-align', 'left');
  await expect(paragraphs().nth(1)).toHaveCSS('text-align', 'right');
  const stored = async () => page.evaluate(() => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1');
    const frames = JSON.parse(localStorage.getItem('qalam-studio-frames-v1') || '{}')[id!] as Array<{ id: string; textAlign?: string; paragraphAligns?: Array<string | null>; hMm: number; text: string }>;
    return frames.find(frame => frame.id === 'multi');
  });
  await expect.poll(async () => (await stored())?.paragraphAligns).toEqual(['left', 'right']);
  expect((await stored())?.text).toBe('پہلی سطر\nدوسری سطر');
  expect((await stored())?.hMm).toBe(25);
  await input.press('Control+Home');
  await expect.poll(async () => input.getAttribute('data-studio-frame-text-align')).toBe('left');
  await expect(page.getByRole('button', { name: 'Align left', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Align right', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await input.press('Control+a');
  await expect.poll(async () => input.getAttribute('data-studio-frame-text-align')).toBe('mixed');
  await expect(page.getByRole('button', { name: 'Align left', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Align right', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await input.press('Control+Home');
  await input.press('End');
  await input.press('Enter');
  await expect.poll(async () => (await stored())?.paragraphAligns).toEqual(['left', 'left', 'right']);
  expect((await stored())?.text).toBe('پہلی سطر\n\nدوسری سطر');
  await input.press('Control+End');
  await input.press('Home');
  await input.press('Backspace');
  await expect.poll(async () => (await stored())?.text).toBe('پہلی سطر\nدوسری سطر');
  expect((await stored())?.paragraphAligns).toEqual(['left', 'right']);
  await input.press('Control+z');
  await expect.poll(async () => (await stored())?.text).toBe('پہلی سطر\n\nدوسری سطر');
  expect((await stored())?.paragraphAligns).toEqual(['left', 'left', 'right']);
  await input.press('Control+Shift+z');
  await expect.poll(async () => (await stored())?.text).toBe('پہلی سطر\nدوسری سطر');
  expect((await stored())?.paragraphAligns).toEqual(['left', 'right']);
  expect(await input.evaluate(el => (el as HTMLTextAreaElement).offsetHeight)).toBe(height);
  expect(await snapshot(page)).toEqual(before);
});

test('filled multi-line navigation keeps the caret on its glyphs', async ({ page }) => {
  const before = await snapshot(page);
  const input = box(page, 'multi');
  await input.click();
  await input.press('Control+Home');
  await expect.poll(async () => (await caretMetrics(input)).fromRight).toBeLessThanOrEqual(2);
  const lineTop = (await caretMetrics(input)).top;
  await input.press('End');
  await expect.poll(async () => (await caretMetrics(input)).fromRight).toBeGreaterThan(8);
  expect((await caretMetrics(input)).top).toBeLessThan(lineTop + 8);
  await input.press('ArrowDown');
  await expect.poll(async () => (await caretMetrics(input)).top).toBeGreaterThan(lineTop + 16);
  expect(await input.inputValue()).toBe('پہلی سطر\nدوسری سطر');
  await input.press('ArrowUp');
  await expect.poll(async () => (await caretMetrics(input)).top).toBeLessThan(lineTop + 8);
  await input.press('End');
  await input.press('Backspace');
  await expect(input).toHaveValue('پہلی سط\nدوسری سطر');
  await expect.poll(async () => (await caretMetrics(input)).top).toBeLessThan(lineTop + 8);
  expect(await snapshot(page)).toEqual(before);
});
