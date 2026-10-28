import { expect, test, type Page } from '@playwright/test';
import type { Editor } from '@tiptap/core';
import { PDFDocument } from 'pdf-lib';
const dialog = (page: Page) => page.locator('[data-studio-pdf-recovery] [role="dialog"]');
async function exportPdf(page: Page) {
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.downloadPdf"]').click();
}
async function snapshot(page: Page) { return page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON()); }
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('qalam-site-language', 'en');
    (window as unknown as { printCalls: number }).printCalls = 0;
    window.print = () => { (window as unknown as { printCalls: number }).printCalls++; };
  });
  await page.goto('/tools/document-studio');
  await expect(page.locator('.ProseMirror')).toHaveAttribute('data-studio-font-layout', 'ready', { timeout: 25_000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: Editor }).editor.commands.setContent('<p>محفوظ دستاویز — Keep this text.</p>'));
});
test('successful server export downloads normally, without print or recovery', async ({ page }, info) => {
  const doc = await PDFDocument.create(); doc.addPage([595, 842]); const bytes = Buffer.from(await doc.save());
  let requests = 0;
  await page.route('**/api/export-pdf', async route => { requests++; await route.fulfill({ status: 200, contentType: 'application/pdf', body: bytes, headers: { 'X-Pdf-Page-Count': '1', 'X-Pdf-File-Size-Bytes': String(bytes.length) } }); });
  const before = await snapshot(page);
  const download = page.waitForEvent('download'); await exportPdf(page); const result = await download;
  expect(result.suggestedFilename()).toBe('qalam-document.pdf'); await result.saveAs(info.outputPath('successful-download.pdf'));
  await expect(dialog(page)).toHaveCount(0); expect(requests).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { printCalls: number }).printCalls)).toBe(0);
  expect(await snapshot(page)).toEqual(before);
});
for (const status of [429, 502, 503, 504]) test(`HTTP ${status} offers classic browser PDF recovery without retrying`, async ({ page }, info) => {
  let requests = 0;
  await page.route('**/api/export-pdf', async route => { requests++; await route.fulfill({ status, contentType: 'text/html', body: '<html>RAW SERVER ERROR</html>' }); });
  const before = await snapshot(page); await exportPdf(page);
  await expect(dialog(page)).toBeVisible(); await expect(dialog(page)).toContainText('The PDF service is busy or temporarily unavailable.');
  await expect(dialog(page).getByRole('button', { name: 'Save PDF using browser' })).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { printCalls: number }).printCalls)).toBe(0);
  expect(requests).toBe(1); expect(await snapshot(page)).toEqual(before);
  if (status === 429) {
    await page.setViewportSize(info.project.name === 'mobile-android' ? { width: 375, height: 800 } : { width: 1280, height: 800 });
    const box = (await dialog(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(8); expect(box.y).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width - 8);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height - 8);
    expect(await dialog(page).evaluate(el => getComputedStyle(el).borderRadius)).toBe('0px');
    await page.screenshot({ path: info.outputPath(`classic-fallback-${info.project.name}.png`), scale: 'css' });
  }
});
test('network failure offers recovery, with no automatic retry', async ({ page }) => {
  let requests = 0; await page.route('**/api/export-pdf', route => { requests++; return route.abort('connectionfailed'); });
  await exportPdf(page); await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Save PDF using browser' })).toBeVisible(); expect(requests).toBe(1);
});
for (const status of [400, 413, 422, 500]) test(`nonrecoverable HTTP ${status} keeps its explanation without a server-busy claim`, async ({ page }) => {
  const error = status === 500 ? 'Unsupported document content; export blocked' : 'Invalid document or document-size validation failed';
  await page.route('**/api/export-pdf', route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error }) }));
  const before = await snapshot(page); await exportPdf(page);
  await expect(dialog(page)).toContainText(error); await expect(dialog(page)).not.toContainText('temporarily unavailable');
  await expect(dialog(page).getByRole('button', { name: 'Save PDF using browser' })).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
});
test('keyboard Close/Escape restore focus, print button uses the existing isolated portal once', async ({ page }) => {
  await page.route('**/api/export-pdf', route => route.fulfill({ status: 503, body: 'busy' }));
  await exportPdf(page);
  const print = dialog(page).getByRole('button', { name: 'Save PDF using browser' }), close = dialog(page).getByRole('button', { name: 'Close', exact: true });
  await expect(print).toBeFocused();
  const beforeDialogKeys = await snapshot(page); await page.keyboard.press('Control+Alt+l');
  expect(await snapshot(page)).toEqual(beforeDialogKeys);
  await page.keyboard.press('Shift+Tab'); await expect(close).toBeFocused();
  await page.keyboard.press('Tab'); await expect(print).toBeFocused(); await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0); await expect(page.locator('[data-menu-root="file"]')).toBeFocused();
  await exportPdf(page); const before = await snapshot(page);
  await expect(print).toBeFocused(); await page.keyboard.press('Enter');
  await print.evaluate(button => { for (let i = 0; i < 4; i++) (button as HTMLButtonElement).click(); });
  await expect.poll(() => page.evaluate(() => (window as unknown as { printCalls: number }).printCalls)).toBe(1);
  await expect(print).toBeDisabled();
  const portal = page.locator('[data-studio-print-portal]'); await expect(portal).toHaveCount(1);
  await expect(portal).toContainText('Keep this text.');
  await expect(portal.locator('[data-menu-root], [data-studio-ruler], [data-studio-pdf-recovery]')).toHaveCount(0);
  // Closing/reopening while the native print operation is pending cannot
  // create a second portal/window, even though this is a new dialog instance.
  await close.click(); await exportPdf(page); await print.click();
  expect(await page.evaluate(() => (window as unknown as { printCalls: number }).printCalls)).toBe(1);
  await expect(portal).toHaveCount(1);
  await page.emulateMedia({ media: 'print' }); await expect(dialog(page)).toBeHidden(); await expect(portal).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint'))); await expect(portal).toHaveCount(0);
  await expect(dialog(page)).toBeVisible(); await expect(dialog(page)).not.toContainText('successfully saved');
  await close.click(); await expect(dialog(page)).toHaveCount(0); expect(await snapshot(page)).toEqual(before);
});
