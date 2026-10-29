import { expect, test, type Page } from '@playwright/test';
import type { Editor } from '@tiptap/core';
const box = (page: Page, id = 'one') => page.locator(`[data-studio-frame-id="${id}"]`);
const field = (page: Page, key: string) => page.locator(`[data-studio-object-field="${key}"]`);
const snapshot = (page: Page) => page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & {
    editor: Editor;
}).editor.getJSON());
async function stored(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem('qalam-studio-frames-v1')!)[localStorage.getItem('qalam-document-studio-active-document-v1')!]); }
async function select(page: Page, id = 'one') { await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible(); await expect(box(page, id)).toBeVisible(); await page.locator('[data-studio-tool-button="select"]').click(); await box(page, id).click(); }
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
    await page.goto('/tools/document-studio');
    await expect(page.locator('.ProseMirror')).toBeEditable();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
    await page.evaluate(() => {
        const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
        const base = { kind: 'text', page: 1, wMm: 70, hMm: 30, flip: false, text: 'محفوظ باکس', inPageSource: { version: 3, storyNumber: 2, descriptorOffset: 100, runAround: 'explicit-on' } };
        localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [{ ...base, id: 'one', xMm: 30, yMm: 40 }, { ...base, id: 'two', xMm: 110, yMm: 90 }, { ...base, id: 'shape', kind: 'rect', text: '', xMm: 30, yMm: 140 }] }));
    });
    await page.reload();
    await expect(box(page)).toBeVisible();
});
test('object mode shows genuine geometry, commits only the selected frame and persists metadata', async ({ page }, info) => {
    const before = await snapshot(page);
    await select(page);
    await expect(field(page, 'xMm')).toHaveValue('30mm');
    await expect(field(page, 'wMm')).toHaveValue('70mm');
    await expect(page.locator('[data-studio-object-source]')).toContainText('explicit-on');
    await field(page, 'xMm').fill('35.125mm');
    await field(page, 'xMm').press('Enter');
    expect((await stored(page))[0].xMm).toBe(35.125);
    expect((await stored(page))[1].xMm).toBe(110);
    expect(await snapshot(page)).toEqual(before);
    await page.screenshot({ path: info.outputPath('object-toolbar.png'), scale: 'css' });
    await page.reload();
    await select(page);
    await expect(field(page, 'xMm')).toHaveValue('35.13mm');
    expect((await stored(page))[0].inPageSource.runAround).toBe('explicit-on');
    await page.locator('[data-studio-tool-button="text"]').click();
    await expect(page.locator('[data-studio-object-toolbar]')).toHaveCount(0);
    await box(page).locator('textarea').fill('باکس کی ترمیم');
    await expect(page.getByRole('combobox', { name: 'Urdu font', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('text-toolbar.png'), scale: 'css' });
});
test('invalid input, Escape and multi-selection never edit an unintended object', async ({ page }) => {
    await select(page);
    const before = await stored(page);
    for (const value of ['0', '-1', 'NaN', 'Infinity', '99abc', '300mm']) {
        await field(page, 'wMm').fill(value);
        await field(page, 'wMm').press('Enter');
        await expect(page.locator('[data-studio-object-error]')).toBeVisible();
        expect(await stored(page)).toEqual(before);
    }
    await field(page, 'wMm').fill('55');
    await field(page, 'wMm').press('Escape');
    expect(await stored(page)).toEqual(before);
    await box(page, 'two').click({ modifiers: ['Shift'] });
    await expect(page.locator('[data-studio-frame-handle]')).toHaveCount(16);
    await expect(field(page, 'xMm')).toHaveAttribute('placeholder', 'Mixed');
    await field(page, 'wMm').fill('65');
    await field(page, 'wMm').press('Enter');
    expect((await stored(page)).slice(0, 2).map((f: {
        wMm: number;
    }) => f.wMm)).toEqual([65, 65]);
    await expect(page.locator('[data-studio-frame-handle]')).toHaveCount(16);
});
test('drag and resize synchronize fields; delete, empty click and document switching clear ownership', async ({ page }) => {
    await select(page);
    const rect = (await box(page).boundingBox())!;
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + 15, rect.y + rect.height / 2 + 8);
    await page.mouse.up();
    await expect(field(page, 'xMm')).not.toHaveValue('30mm');
    const handle = page.locator('[data-studio-frame-id="one"] [data-studio-frame-handle="se"]');
    const h = (await handle.boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + 15, h.y + 10);
    await page.mouse.up();
    await expect(field(page, 'wMm')).not.toHaveValue('70mm');
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-action="file.new"]').click();
    await page.getByRole('dialog', { name: 'New Document', exact: true }).getByRole('button', { name: 'OK', exact: true }).click();
    await expect(page.locator('[data-studio-object-toolbar]')).toHaveCount(0);
    await page.locator('[data-menu-root="window"]').click();
    await page.locator('[data-menu-action^="window.document:"]').first().click();
    await expect(page.locator('[data-studio-object-toolbar]')).toHaveCount(0);
    await select(page, 'shape');
    await expect(page.locator('[data-studio-object-toolbar]')).toBeVisible();
    await page.keyboard.press('Delete');
    await expect(box(page, 'shape')).toHaveCount(0);
    await expect(page.locator('[data-studio-object-toolbar]')).toHaveCount(0);
    await select(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-studio-object-toolbar]')).toHaveCount(0);
});
test('appearance is real, persists; denied storage leaves the object and story untouched', async ({ page }) => {
    await select(page, 'shape');
    const story = await snapshot(page);
    await field(page, 'borderColor').selectOption('#FF0000');
    await field(page, 'fill').selectOption('#FFFF00');
    await field(page, 'borderStyle').selectOption('dashed');
    await field(page, 'borderWidthPt').fill('2');
    await field(page, 'borderWidthPt').press('Enter');
    const appearance = { border: true, borderWidthPt: 2, borderStyle: 'dashed', borderColor: '#FF0000', fill: '#FFFF00' };
    expect((await stored(page))[2].appearance).toEqual(appearance);
    await expect(box(page, 'shape').locator('rect').first()).toHaveAttribute('fill', '#FFFF00');
    await expect(box(page, 'shape').locator('rect').first()).toHaveAttribute('stroke', '#FF0000');
    await page.reload();
    await select(page, 'shape');
    await expect(field(page, 'borderStyle')).toHaveValue('dashed');
    const before = await stored(page);
    await page.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'qalam-studio-frames-v1')
        throw new DOMException('quota', 'QuotaExceededError'); set.call(this, key, value); }; });
    await field(page, 'xMm').fill('35');
    await field(page, 'xMm').press('Enter');
    await expect(page.locator('[data-studio-object-error]')).toBeVisible();
    expect(await stored(page)).toEqual(before);
    expect(await snapshot(page)).toEqual(story);
});
test('newly drawn text boxes and shapes use object mode only with Arrow, including view changes', async ({ page }) => {
    await page.locator('[data-studio-tool-button="textbox"]').click();
    const paper = (await page.locator('[data-studio-page-paper]').first().boundingBox())!;
    const scale = paper.width / 210;
    await page.mouse.move(paper.x + 40 * scale, paper.y + 15 * scale);
    await page.mouse.down();
    await page.mouse.move(paper.x + 100 * scale, paper.y + 30 * scale);
    await page.mouse.up();
    await expect(page.locator('[data-studio-frame="text"]')).toHaveCount(3);
    await expect(page.locator('[data-studio-tool-button="text"]')).toHaveAttribute('aria-pressed', 'true');
    const added = page.locator('[data-studio-frame="text"]').last();
    await added.locator('textarea').fill('نیا باکس');
    await page.locator('[data-studio-tool-button="select"]').click();
    await added.click();
    await expect(page.locator('[data-studio-object-toolbar]')).toBeVisible();
    await page.locator('[data-menu-root="view"]').click();
    await page.locator('[data-menu-action="view.facing"]').click();
    await expect(page.locator('[data-studio-object-toolbar]')).toHaveCount(0);
    await page.getByRole('combobox',{name:'Zoom',exact:true}).selectOption('fit-width');
    await page.locator('[data-studio-scroller]').evaluate(el=>{el.scrollTop=0;el.scrollLeft=(el.scrollWidth-el.clientWidth)/2;});
    await added.click();
    expect(Math.abs(parseFloat(await field(page, 'wMm').inputValue()) - 60)).toBeLessThan(0.5);
    await field(page, 'wMm').fill('55');
    await field(page, 'wMm').press('Enter');
    expect((await stored(page)).at(-1).wMm).toBe(55);
    await page.locator('[data-studio-objects]').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('[data-studio-object-toolbar]')).toHaveCount(0);
});
test('keyboard focus keeps object ownership and existing function-key zoom shortcuts',async({page})=>{
  await select(page);const before=await snapshot(page);
  await field(page,'xMm').focus();
  for(const [key,zoom] of [['F6','50'],['F7','100'],['F8','200']]){
    await field(page,'xMm').press(key);
    await expect(page.getByRole('combobox',{name:'Zoom',exact:true})).toHaveValue(zoom);
    await expect(page.locator('[data-studio-frame-handle]')).toHaveCount(8);
  }
  await field(page,'xMm').press('Tab');await expect(field(page,'wMm')).toBeFocused();
  await field(page,'wMm').fill('60mm');await field(page,'wMm').press('Enter');
  expect((await stored(page))[0].wMm).toBe(60);expect(await snapshot(page)).toEqual(before);
});
test('pointer movement cannot push a selected frame off its physical page',async({page})=>{
  await select(page);const before=await stored(page),rect=(await box(page).boundingBox())!;
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
  await page.mouse.move(-100,-100);await page.mouse.up();
  expect(await stored(page)).toEqual(before);await expect(page.locator('[data-studio-frame-handle]')).toHaveCount(8);
});
