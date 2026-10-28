import { expect, test, type Page } from '@playwright/test';
import type { Editor } from '@tiptap/core';
const message = 'Formatting selected text inside a text box is not yet available.';
const story = (page: Page) => page.locator('.ProseMirror');
const snapshot = (page: Page) => story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
const frame = (page: Page, id = 'safety-one') => page.locator(`[data-studio-frame-id="${id}"] textarea`);
async function selectBox(page: Page, id = 'safety-one') {
  await page.locator('[data-studio-tool-button="text"]').click();
  await frame(page, id).focus();
  await frame(page, id).evaluate(el => { (el as HTMLTextAreaElement).setSelectionRange(0, 6); el.dispatchEvent(new Event('select', { bubbles: true })); });
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio');
  await expect(story(page)).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await story(page).click();
  await story(page).evaluate(el => { const ed = (el as HTMLElement & { editor: Editor }).editor; ed.commands.setContent('<p dir="rtl">باہر کا محفوظ متن</p>'); ed.commands.selectAll(); });
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.save"]').click();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  await page.addInitScript(() => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
    const base = { kind: 'text', page: 1, xMm: 30, wMm: 80, hMm: 30, flip: false, text: 'محفوظ عبارت ایک سطر' };
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [{ ...base, id: 'safety-one', yMm: 40 }, { ...base, id: 'safety-two', yMm: 80 }] }));
  });
  await page.reload(); await expect(frame(page)).toBeVisible();
  await story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.commands.selectAll());
});
test('box font attempt cannot format a stale story selection, and explains the rejection', async ({ page }, info) => {
  const before = await snapshot(page), text = await frame(page).inputValue();
  await selectBox(page);
  await page.getByRole('combobox', { name: 'Urdu font', exact: true }).selectOption({ label: 'Digital Khatt Indo-Pak' });
  expect(await snapshot(page)).toEqual(before);
  expect(await frame(page).inputValue()).toBe(text);
  await expect(page.locator('[data-studio-formatting-notice]')).toContainText(message);
  await page.screenshot({ path: info.outputPath('rejected-box-formatting.png'), scale: 'css' });
});
test('menu dialogs, shortcuts, toolbar buttons and repeated focus changes retain the box target', async ({ page }) => {
  const before = await snapshot(page);
  await selectBox(page);
  for (const action of ['format.character', 'format.paragraph']) {
    await page.locator('[data-menu-root="format"]').click(); await page.locator(`[data-menu-action="${action}"]`).click();
    await expect(page.locator('[data-studio-formatting-notice]')).toContainText(message);
    await expect(page.getByRole('dialog', { name: action.endsWith('character') ? 'Character' : 'Paragraph', exact: true })).toHaveCount(0);
  }
  await frame(page).focus(); await page.keyboard.press('Control+h');
  await expect(page.getByRole('dialog', { name: 'Character', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await page.getByRole('textbox', { name: 'Size', exact: true }).focus(); await page.keyboard.press('Tab');
  await page.getByRole('combobox', { name: 'Urdu font', exact: true }).selectOption({ label: 'Mehr Nastaliq Web' });
  await selectBox(page, 'safety-two'); await frame(page, 'safety-two').press('Control+b');
  expect(await snapshot(page)).toEqual(before);
  expect(await frame(page).inputValue()).toBe('محفوظ عبارت ایک سطر');
  expect(await frame(page, 'safety-two').inputValue()).toBe('محفوظ عبارت ایک سطر');
});
test('explicit story selection restores ordinary formatting; legacy frame storage stays unchanged on reload', async ({ page }) => {
  const stored = await page.evaluate(() => localStorage.getItem('qalam-studio-frames-v1'));
  await selectBox(page);
  await page.getByRole('combobox', { name: 'Urdu font', exact: true }).selectOption({ label: 'Digital Khatt Indo-Pak' });
  await story(page).click(); await page.keyboard.press('Control+a');
  const before = await snapshot(page);
  await page.getByRole('combobox', { name: 'Urdu font', exact: true }).selectOption({ label: 'Digital Khatt Indo-Pak' });
  expect(await snapshot(page)).not.toEqual(before);
  expect(JSON.stringify(await snapshot(page))).toContain('Digital Khatt');
  expect(await page.evaluate(() => localStorage.getItem('qalam-studio-frames-v1'))).toBe(stored);
  await page.reload(); await expect(frame(page)).toHaveValue('محفوظ عبارت ایک سطر');
});
test('switching documents invalidates the old box target before delayed formatting', async ({ page }) => {
  const old = await snapshot(page);
  await selectBox(page);
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.new"]').click();
  await page.getByRole('dialog', { name: 'New Document', exact: true }).getByRole('button', { name: 'OK', exact: true }).click();
  await expect(frame(page)).toHaveCount(0);
  const fresh = await snapshot(page);
  await page.getByRole('combobox', { name: 'Urdu font', exact: true }).selectOption({ label: 'Digital Khatt Indo-Pak' });
  expect(await snapshot(page)).toEqual(fresh);
  await expect(page.locator('[data-studio-formatting-notice]')).toContainText(message);
  await page.locator('[data-menu-root="window"]').click();
  await page.locator('[data-menu-action^="window.document:"]').first().click();
  expect(await snapshot(page)).toEqual(old); await expect(frame(page)).toHaveValue('محفوظ عبارت ایک سطر');
  await page.getByRole('button', { name: 'Bold', exact: true }).click(); expect(await snapshot(page)).toEqual(old);
});
test('deleting a box or dismissing its selection never revives the previous story selection', async ({ page }) => {
  const before = await snapshot(page); await selectBox(page); await frame(page).press('Escape');
  await page.getByRole('button', { name: 'Bold', exact: true }).click(); expect(await snapshot(page)).toEqual(before);
  await page.locator('[data-studio-tool-button="select"]').click();
  await page.locator('[data-studio-frame-id="safety-one"]').click(); await page.keyboard.press('Delete');
  await expect(frame(page)).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Urdu font', exact: true }).selectOption({ label: 'Digital Khatt Indo-Pak' });
  expect(await snapshot(page)).toEqual(before); await expect(frame(page, 'safety-two')).toHaveValue('محفوظ عبارت ایک سطر');
});
test('an unsupported size edit cannot be committed to the story on blur', async ({ page }) => {
  const before = await snapshot(page); await selectBox(page);
  await page.getByRole('textbox', { name: 'Size', exact: true }).fill('40pt');
  await story(page).click();
  expect(await snapshot(page)).toEqual(before);
});
test('a story selection in document A cannot format document B until explicitly reselected', async ({ page }) => {
  // Start with a real main-story selection (rather than a text-box selection).
  await story(page).click(); await page.keyboard.press('Control+a');
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.new"]').click();
  await page.getByRole('dialog', { name: 'New Document', exact: true }).getByRole('button', { name: 'OK', exact: true }).click();
  await expect(frame(page)).toHaveCount(0);
  const fresh = await snapshot(page);
  await page.getByRole('combobox', { name: 'Urdu font', exact: true }).selectOption({ label: 'Digital Khatt Indo-Pak' });
  expect(await snapshot(page)).toEqual(fresh);
  await expect(page.locator('[data-studio-formatting-notice]')).toContainText(message);
  const marks = await story(page).evaluate(el => (el as HTMLElement & { editor: Editor }).editor.state.storedMarks);
  expect(marks).toBeNull();

  // A fresh explicit interaction with B restores ordinary formatting.
  await story(page).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('New story text');
  await page.keyboard.press('Control+a');
  const selectedB = await snapshot(page);
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  expect(await snapshot(page)).not.toEqual(selectedB);
});
