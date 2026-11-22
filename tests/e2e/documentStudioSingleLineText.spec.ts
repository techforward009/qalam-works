import fs from 'fs';
import { expect, test, type Page } from '@playwright/test';
import type { Editor } from '@tiptap/core';
import { defaultDocumentSettings } from '../../app/tools/document-studio/utils/documentSettings';

const story = (page: Page) => page.locator('.ProseMirror');
const storyJson = (page: Page) => story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
const object = (page: Page, id: string) => page.locator(`[data-studio-frame-id="${id}"]`);
const pxPerMm = 96 / 25.4;

type StoredFrame = {
  id: string;
  singleLine?: boolean;
  xMm: number;
  yMm: number;
  hMm: number;
  wMm: number;
  text: string;
  textAlign?: string;
};

async function storedFrames(page: Page): Promise<StoredFrame[]> {
  return page.evaluate(() => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1');
    const map = JSON.parse(localStorage.getItem('qalam-studio-frames-v1') || '{}') as Record<string, StoredFrame[]>;
    return id ? map[id] || [] : [];
  });
}

async function frameBoxMetrics(page: Page, id: string) {
  return object(page, id).evaluate(frameEl => {
    const ta = frameEl.querySelector('textarea[data-studio-text-single-line="true"]') as HTMLTextAreaElement;
    const style = getComputedStyle(ta);
    const frameRect = frameEl.getBoundingClientRect();
    const objectsRect = frameEl.closest('[data-studio-objects]')!.getBoundingClientRect();
    return {
      x: frameRect.x - objectsRect.x,
      y: frameRect.y - objectsRect.y,
      width: frameRect.width,
      height: frameRect.height,
      bottom: frameRect.bottom - objectsRect.y,
      scrollWidth: ta.scrollWidth,
      clientWidth: ta.clientWidth,
      scrollLeft: ta.scrollLeft,
      scrollHeight: ta.scrollHeight,
      clientHeight: ta.clientHeight,
      scrollTop: ta.scrollTop,
      whiteSpace: style.whiteSpace,
      overflowWrap: style.overflowWrap,
      direction: style.direction,
      alignAttr: ta.getAttribute('data-studio-frame-text-align') ?? '',
    };
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
  const x = bounds.x + 25 * pxPerMm, y = bounds.y + 75 * pxPerMm;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 90 * pxPerMm, y + 20 * pxPerMm, { steps: 4 }); await page.mouse.up();
  const single = page.locator('textarea[data-studio-text-frame][data-studio-text-single-line="true"]');
  const singleObject = single.locator('..');
  await expect(single).toBeVisible();
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.singleLine)?.hMm).toBeCloseTo(8.5725, 3);
  expect((await singleObject.evaluate(el => (el as HTMLElement).offsetHeight))).toBeGreaterThan(28);
  expect((await singleObject.evaluate(el => (el as HTMLElement).offsetHeight))).toBeLessThan(36);
  const initialTitle = (await storedFrames(page)).find(frame => frame.singleLine)!;

  await single.fill('عنوان ایک سطر');
  await page.waitForTimeout(80);
  const afterShort = (await storedFrames(page)).find(frame => frame.id === initialTitle.id)!;
  expect(afterShort.wMm).toBeCloseTo(initialTitle.wMm, 3);
  expect(afterShort.hMm).toBeCloseTo(8.5725, 3);
  expect(afterShort.xMm).toBeCloseTo(initialTitle.xMm, 3);
  expect(afterShort.yMm).toBeCloseTo(initialTitle.yMm, 3);

  await single.evaluate(el => {
    const data = new DataTransfer();
    data.setData('text/plain', 'پہلی\nدوسری');
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await expect(single).toHaveValue(/پہلی\nدوسری/);
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === initialTitle.id)?.hMm ?? 0).toBeGreaterThan(initialTitle.hMm + 4);
  const afterPaste = (await storedFrames(page)).find(frame => frame.id === initialTitle.id)!;
  expect(afterPaste.wMm).toBeCloseTo(initialTitle.wMm, 3);
  expect(afterPaste.xMm).toBeCloseTo(initialTitle.xMm, 3);
  expect(afterPaste.yMm).toBeCloseTo(initialTitle.yMm, 3);

  await single.fill('عنوان ایک سطر');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === initialTitle.id)?.hMm ?? 0).toBeCloseTo(8.5725, 3);
  expect(await storyJson(page)).toEqual(initialStory);

  await single.click();
  const sizeBeforeAmiri = page.getByRole('textbox', { name: 'Size', exact: true });
  await sizeBeforeAmiri.fill('24'); await sizeBeforeAmiri.press('Enter');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === initialTitle.id)?.hMm ?? 0).toBeGreaterThanOrEqual(15.55);
  const after24pt = (await storedFrames(page)).find(frame => frame.id === initialTitle.id)!;
  expect(after24pt.hMm).toBeLessThan(17);
  expect(await single.evaluate(el => (el as HTMLTextAreaElement).scrollHeight <= (el as HTMLTextAreaElement).clientHeight + 1)).toBe(true);
  const textBeforeSelect = await single.inputValue();
  await single.press('Control+a');
  await expect(singleObject.locator('[data-studio-line-selection]')).toHaveCount(1);
  const selectionInsideFrame = await singleObject.evaluate(el => {
    const ta = el.querySelector('textarea[data-studio-text-single-line="true"]');
    const band = el.querySelector('[data-studio-line-selection]');
    if (!ta || !band) return false;
    const taBox = ta.getBoundingClientRect();
    const bandBox = band.getBoundingClientRect();
    return bandBox.top >= taBox.top && bandBox.bottom <= taBox.bottom && bandBox.width > 5;
  });
  expect(selectionInsideFrame).toBe(true);
  await single.evaluate(el => {
    const ta = el as HTMLTextAreaElement;
    const end = ta.value.length;
    ta.setSelectionRange(end, end);
    ta.dispatchEvent(new Event('select', { bubbles: true }));
  });
  await expect.poll(() => singleObject.evaluate(el => {
    const ta = el.querySelector('textarea[data-studio-text-single-line="true"]');
    const caret = el.querySelector('[data-studio-frame-caret]');
    if (!ta || !caret) return false;
    const taBox = ta.getBoundingClientRect();
    const caretBox = caret.getBoundingClientRect();
    return caretBox.top >= taBox.top && caretBox.bottom <= taBox.bottom;
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
  await expect(multiline).toHaveCSS('white-space', 'pre-wrap');
  await expect(single).toHaveCSS('color', 'rgb(255, 0, 0)');
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
  const titleBefore = (await storedFrames(page)).find(frame => frame.singleLine)!;
  await single.fill('ایک بہت طویل اردو عنوان with a deliberately long English title');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === titleBefore.id)?.hMm ?? 0).toBeGreaterThan(titleBefore.hMm + 4);
  const titleAfter = (await storedFrames(page)).find(frame => frame.id === titleBefore.id)!;
  expect(titleAfter.wMm).toBeCloseTo(titleBefore.wMm, 3);
  expect(titleAfter.xMm).toBeCloseTo(titleBefore.xMm, 3);
  expect(titleAfter.yMm).toBeCloseTo(titleBefore.yMm, 3);
  expect(await single.evaluate(el => {
    const ta = el as HTMLTextAreaElement;
    return ta.scrollWidth <= ta.clientWidth + 1 && ta.scrollHeight <= ta.clientHeight + 1 && ta.scrollLeft === 0;
  })).toBe(true);

  await page.locator('[data-studio-tool-button="textbox"]').click();
  const mx = bounds.x + 30 * pxPerMm, my = bounds.y + 150 * pxPerMm;
  await page.mouse.move(mx, my); await page.mouse.down(); await page.mouse.move(mx + 80 * pxPerMm, my + 20 * pxPerMm, { steps: 4 }); await page.mouse.up();
  const multiline = page.getByRole('textbox', { name: 'Text box', exact: true });
  await expect(multiline).toBeVisible();
  const multiHeight = (await storedFrames(page)).find(frame => !frame.singleLine)?.hMm ?? 0;
  expect(multiHeight).toBeGreaterThan(18);
  expect(multiHeight).toBeLessThan(22);
});

test('loading a saved single-line frame does not change its height', async ({ page }) => {
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
  expect((await storedFrames(page)).find(frame => frame.id === 'saved-title')?.hMm).toBe(25);
});

test('fixed-width title box wraps and expands exclusively downward across Urdu, English, mixed, paste, and deletion', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio');
  await expect(story(page)).toBeEditable({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await page.evaluate(async () => { await document.fonts.ready; });
  const initialStory = await storyJson(page);
  const bounds = (await page.locator('[data-studio-objects]').boundingBox())!;

  // Seed one pre-configured tall title box (25mm) alongside fresh title-text tool boxes
  const typography = { ...defaultDocumentSettings().typography, defaultRtlFontId: 'mehr-nastaliq-web' as const };
  await page.evaluate(typography => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [
      { id: 'custom-min-title', kind: 'text', page: 1, xMm: 115, yMm: 185, wMm: 70, hMm: 25, flip: false, text: 'مختصر عنوان', singleLine: true, typography },
    ] }));
  }, typography);
  await page.reload();
  await expect(story(page)).toBeEditable({ timeout: 15000 });
  await page.evaluate(async () => { await document.fonts.ready; });

  const createTitleFrame = async (xStartMm: number, xEndMm: number, yMm: number, alignGeom: string | null, expectedAlign: string) => {
    const existingIds = new Set((await storedFrames(page)).map(frame => frame.id));
    await page.locator('[data-studio-tool-button="title-text"]').click();
    await page.mouse.move(bounds.x + xStartMm * pxPerMm, bounds.y + yMm * pxPerMm);
    await page.mouse.down();
    await page.mouse.move(bounds.x + xEndMm * pxPerMm, bounds.y + yMm * pxPerMm, { steps: 4 });
    await page.mouse.up();

    let createdId = '';
    await expect.poll(async () => {
      const created = (await storedFrames(page)).find(frame => frame.singleLine && !existingIds.has(frame.id));
      createdId = created?.id ?? '';
      return createdId;
    }).not.toBe('');

    const ta = object(page, createdId).locator('textarea[data-studio-text-single-line="true"]');
    await expect(ta).toBeVisible();
    await ta.click();
    if (alignGeom) {
      await page.locator(`[data-studio-geom="${alignGeom}"]`).click();
      await expect(ta).toHaveAttribute('data-studio-frame-text-align', expectedAlign);
    }
    const stored = (await storedFrames(page)).find(frame => frame.id === createdId)!;
    const dom = await frameBoxMetrics(page, createdId);
    return { id: createdId, ta, initialStored: stored, initialDom: dom };
  };

  const assertFixedWidthAndTop = async (
    id: string,
    initialStored: StoredFrame,
    initialDom: Awaited<ReturnType<typeof frameBoxMetrics>>,
    label: string,
    expectedMinBottomGrowthMm: number,
  ) => {
    await page.waitForTimeout(80);
    const current = (await storedFrames(page)).find(frame => frame.id === id)!;
    const dom = await frameBoxMetrics(page, id);

    expect(current.wMm, `${label}: stored width unchanged`).toBeCloseTo(initialStored.wMm, 3);
    expect(current.xMm, `${label}: stored xMm unchanged`).toBeCloseTo(initialStored.xMm, 3);
    expect(current.yMm, `${label}: stored yMm unchanged`).toBeCloseTo(initialStored.yMm, 3);
    expect(Math.abs(dom.width - initialDom.width), `${label}: DOM width unchanged`).toBeLessThanOrEqual(1);
    expect(Math.abs(dom.x - initialDom.x), `${label}: DOM left unchanged`).toBeLessThanOrEqual(1);
    expect(Math.abs(dom.y - initialDom.y), `${label}: DOM top unchanged`).toBeLessThanOrEqual(1);

    if (expectedMinBottomGrowthMm > 0) {
      expect(current.yMm + current.hMm, `${label}: bottom edge moved downward`).toBeGreaterThan(initialStored.yMm + initialStored.hMm + expectedMinBottomGrowthMm);
      expect(dom.bottom, `${label}: DOM bottom edge moved downward`).toBeGreaterThan(initialDom.bottom + expectedMinBottomGrowthMm * pxPerMm * 0.8);
    }

    expect(dom.whiteSpace, `${label}: pre-wrap`).toBe('pre-wrap');
    expect(dom.overflowWrap, `${label}: break-word`).toBe('break-word');
    expect(dom.direction, `${label}: rtl direction`).toBe('rtl');
    expect(dom.scrollWidth, `${label}: no horizontal overflow`).toBeLessThanOrEqual(dom.clientWidth + 1);
    expect(dom.scrollLeft, `${label}: scrollLeft === 0`).toBe(0);
    expect(dom.scrollHeight, `${label}: no vertical clipping`).toBeLessThanOrEqual(dom.clientHeight + 1);
    expect(dom.scrollTop, `${label}: scrollTop === 0`).toBe(0);
    return { current, dom };
  };

  // 1. Short Urdu text keeps original width and minimum height, then long Urdu wraps & expands downward, then shrinks on deletion
  const urduBox = await createTitleFrame(125, 185, 30, null, '');
  await urduBox.ta.fill('مختصر عنوان');
  const shortCheck = await assertFixedWidthAndTop(urduBox.id, urduBox.initialStored, urduBox.initialDom, 'short Urdu', 0);
  expect(shortCheck.current.hMm).toBeCloseTo(urduBox.initialStored.hMm, 3);

  await urduBox.ta.fill('یہ ایک بہت طویل اردو عنوان ہے جو مقررہ چوڑائی کے اندر رہتے ہوئے خودکار طور پر اگلی سطور پر منتقل ہو کر صرف نیچے کی طرف پھیلے گا');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === urduBox.id)?.hMm ?? 0).toBeGreaterThan(urduBox.initialStored.hMm + 10);
  const longUrdu = await assertFixedWidthAndTop(urduBox.id, urduBox.initialStored, urduBox.initialDom, 'long Urdu wrapped', 10);

  // Delete wrapped text -> height shrinks upward from bottom back to initial minimum height while preserving top-left & width
  await urduBox.ta.fill('مختصر');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === urduBox.id)?.hMm ?? 999).toBeCloseTo(urduBox.initialStored.hMm, 2);
  const shrunkUrdu = await assertFixedWidthAndTop(urduBox.id, urduBox.initialStored, urduBox.initialDom, 'shrunk Urdu after deletion', 0);
  expect(shrunkUrdu.dom.bottom).toBeLessThan(longUrdu.dom.bottom - 20);

  // 2. Long English text wraps and expands exclusively downward
  const engBox = await createTitleFrame(25, 85, 70, 'align-left', 'left');
  await engBox.ta.fill('A deliberately long English title that must wrap cleanly across multiple lines without changing the frame width or moving the top edge upward');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === engBox.id)?.hMm ?? 0).toBeGreaterThan(engBox.initialStored.hMm + 10);
  const longEng = await assertFixedWidthAndTop(engBox.id, engBox.initialStored, engBox.initialDom, 'long English wrapped', 10);
  expect(longEng.dom.alignAttr).toBe('left');

  // 3. Mixed Urdu/English text under center alignment wraps and expands exclusively downward
  const mixedBox = await createTitleFrame(95, 160, 70, 'align-center', 'center');
  await mixedBox.ta.fill('مرکزی طویل اردو عنوان with mixed English words wrapping cleanly inside fixed width');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === mixedBox.id)?.hMm ?? 0).toBeGreaterThan(mixedBox.initialStored.hMm + 8);
  const longMixed = await assertFixedWidthAndTop(mixedBox.id, mixedBox.initialStored, mixedBox.initialDom, 'mixed center wrapped', 8);
  expect(longMixed.dom.alignAttr).toBe('center');

  // 4. Pasted multiline content expands downward, and deleting reduces back to minimum
  const pasteBox = await createTitleFrame(25, 90, 125, null, '');
  await pasteBox.ta.click();
  await pasteBox.ta.evaluate(el => {
    const data = new DataTransfer();
    data.setData('text/plain', 'پہلی سطر\nدوسری سطر\nتیسری سطر\nچوتھی سطر');
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await expect(pasteBox.ta).toHaveValue('پہلی سطر\nدوسری سطر\nتیسری سطر\nچوتھی سطر');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === pasteBox.id)?.hMm ?? 0).toBeGreaterThan(pasteBox.initialStored.hMm + 15);
  await assertFixedWidthAndTop(pasteBox.id, pasteBox.initialStored, pasteBox.initialDom, 'pasted multiline', 15);

  // 5. Custom minimum configured height (25mm) expands downward on multiline paste and shrinks back to 25mm (never below 25mm)
  const customTa = object(page, 'custom-min-title').locator('textarea[data-studio-text-single-line="true"]');
  const customStored0 = (await storedFrames(page)).find(frame => frame.id === 'custom-min-title')!;
  const customDom0 = await frameBoxMetrics(page, 'custom-min-title');
  await customTa.click();
  await customTa.fill('سطر ۱\nسطر ۲\nسطر ۳\nسطر ۴\nسطر ۵\nسطر ۶');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === 'custom-min-title')?.hMm ?? 0).toBeGreaterThan(32);
  await assertFixedWidthAndTop('custom-min-title', customStored0, customDom0, 'custom min height expanded', 7);
  await customTa.fill('مختصر');
  await expect.poll(async () => (await storedFrames(page)).find(frame => frame.id === 'custom-min-title')?.hMm ?? 0).toBeCloseTo(25, 2);
  await assertFixedWidthAndTop('custom-min-title', customStored0, customDom0, 'custom min height preserved after delete', 0);

  expect(await storyJson(page)).toEqual(initialStory);
});
