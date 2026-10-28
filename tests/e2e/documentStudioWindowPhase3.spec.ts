import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";
const activeKey = "qalam-document-studio-active-document-v1";
const entries = (page: Page) => page.locator('[data-menu-dropdown="window"] [data-menu-action^="window.document:"]');
async function windowMenu(page: Page) { await page.locator('[data-menu-root="window"]').click(); }
async function create(page: Page) {
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.new"]').click();
  await page.getByRole('dialog', { name: 'New Document', exact: true }).getByRole('button', { name: 'OK', exact: true }).click();
}
async function rename(page: Page, name: string) {
  await page.locator('button[data-studio-document-title]').click();
  await page.locator('input[data-studio-document-title]').fill(name); await page.locator('input[data-studio-document-title]').press('Enter');
}
async function write(page: Page, text: string) {
  await page.locator('.ProseMirror').evaluate((el, value) => (el as HTMLElement & { editor: Editor }).editor.commands.insertContent(value), text);
}
async function switchTo(page: Page, index: number) {
  await windowMenu(page); await entries(page).nth(index).click();
  await expect(page.locator('[data-studio-root]')).not.toHaveAttribute('inert');
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio');
  await expect(page.locator('.ProseMirror')).toHaveAttribute('data-studio-font-layout', 'ready', { timeout: 25_000 });
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), activeKey)).not.toBeNull();
});
test('Window lists only opened documents, numbers and renames them, and safely restores rapid edits and objects', async ({ page }) => {
  await rename(page, 'First'); await page.locator('.ProseMirror').focus(); await page.keyboard.insertText('محفوظ پہلا متن');
  const first = await page.evaluate(key => localStorage.getItem(key), activeKey);
  // A stored document that was never opened is not a Window entry.
  await page.evaluate(async () => { await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('qalam-document-studio'); req.onsuccess = () => {
      const db = req.result, tx = db.transaction('documents', 'readwrite'), store = tx.objectStore('documents');
      const rows = store.getAll(); rows.onsuccess = () => store.put({ ...rows.result[0], id: 'not-opened', title: 'Closed library document' });
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
    };
  }); });
  await create(page); await rename(page, 'Second'); await page.locator('.ProseMirror').focus(); await page.keyboard.insertText('دوسرا تازہ متن');
  await windowMenu(page); await expect(entries(page)).toHaveText(['1  First', '2  Second']);
  await expect(entries(page).nth(1)).toHaveAttribute('aria-checked', 'true');
  await entries(page).nth(0).click(); await expect(page.locator('.ProseMirror')).toContainText('محفوظ پہلا متن');
  for (let i = 0; i < 3; i++) { await switchTo(page, 1); await expect(page.locator('.ProseMirror')).toContainText('دوسرا تازہ متن'); await switchTo(page, 0); }
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(first);
  await rename(page, 'Renamed first'); await windowMenu(page); await expect(entries(page)).toHaveText(['1  Renamed first', '2  Second']);
  await page.locator('[data-menu-root="window"]').press('ArrowDown');
  await expect(page.locator('[data-menu-action="window.page"]')).toBeFocused();
  await page.keyboard.press('End'); await expect(entries(page).nth(1)).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('.ProseMirror')).toContainText('دوسرا تازہ متن');
  // Reload starts a fresh open session; it does not enumerate the library.
  await page.reload(); await windowMenu(page); await expect(entries(page)).toHaveText(['1  Second']);
});
test('save failure blocks switching and preserves the active document, then retry succeeds', async ({ page }) => {
  await rename(page, 'First'); await create(page); await rename(page, 'Second'); await write(page, 'rapid unsaved text');
  const before = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as unknown as { restorePut: () => void }).restorePut = () => { IDBObjectStore.prototype.put = original; };
    IDBObjectStore.prototype.put = function () { throw new DOMException('Simulated quota failure', 'QuotaExceededError'); };
  });
  await switchTo(page, 0);
  await expect(page.getByRole('alert').filter({ hasText: 'could not be saved' })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(before);
  await expect(page.locator('.ProseMirror')).toContainText('rapid unsaved text');
  await page.evaluate(() => (window as unknown as { restorePut: () => void }).restorePut());
  await switchTo(page, 0); await switchTo(page, 1); await expect(page.locator('.ProseMirror')).toContainText('rapid unsaved text');
});
test('InPage import becomes one real open document and Page Alt+F12 activates the canvas without changing view or content', async ({ page }) => {
  await page.locator('[data-menu-root="file"]').click();
  const [picker] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-menu-action="file.upload"]').click()]);
  await picker.setFiles(path.resolve('tests/fixtures/inpage/hadiyat.inp'));
  await page.getByRole('dialog', { name: 'InPage text imported', exact: true }).getByRole('button', { name: 'Close', exact: true }).click();
  await windowMenu(page); await expect(entries(page)).toHaveCount(2); await expect(entries(page).nth(1)).toContainText('2  hadiyat');
  await expect(entries(page).nth(1)).toHaveAttribute('aria-checked', 'true');
  await page.locator('[data-menu-action="window.page"]').click();
  const width = await page.locator('[data-studio-print-root]').getAttribute('data-page-width-mm');
  await switchTo(page, 0); await switchTo(page, 1);
  await expect(page.locator('[data-studio-print-root]')).toHaveAttribute('data-page-width-mm', width!);
  await expect(page.locator('[data-studio-page-label]')).toHaveText(/^77\//);
  const before = await page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
  await page.locator('[data-menu-root="view"]').click(); await page.locator('[data-menu-action="view.pageless"]').click();
  await page.locator('[data-menu-root="window"]').focus(); await page.keyboard.press('Alt+F12');
  await expect(page.locator('[data-menu-dropdown]')).toHaveCount(0);
  expect(await page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON())).toEqual(before);
  await page.locator('[data-menu-root="view"]').click(); await expect(page.locator('[data-menu-action="view.pageless"]')).toHaveAttribute('aria-checked', 'true');
});

test('switches restore page floors and associated objects without copying them to another document', async ({ page }) => {
  await rename(page, 'With objects');
  await page.evaluate(key => {
    const id = localStorage.getItem(key)!;
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [{
      id: 'saved-frame', kind: 'text', page: 1, xMm: 20, yMm: 30,
      wMm: 60, hMm: 30, flip: false, text: 'متن باکس',
    }] }));
    localStorage.setItem('qalam-studio-minimum-pages-v1', JSON.stringify({ [id]: 3 }));
  }, activeKey);
  await page.reload();
  await expect(page.locator('[data-studio-frame]')).toHaveCount(1);
  await expect(page.locator('[data-studio-page-paper]')).toHaveCount(3);
  await create(page); await rename(page, 'No objects');
  await expect(page.locator('[data-studio-frame]')).toHaveCount(0);
  await expect(page.locator('[data-studio-page-paper]')).toHaveCount(1);
  await switchTo(page, 0);
  await expect(page.getByRole('textbox', { name: 'Text box', exact: true })).toHaveValue('متن باکس');
  await expect(page.locator('[data-studio-page-paper]')).toHaveCount(3);
  await switchTo(page, 1);
  await expect(page.locator('[data-studio-frame]')).toHaveCount(0);
  await expect(page.locator('[data-studio-page-paper]')).toHaveCount(1);
});

test('overlapping library switch requests do not race or duplicate session entries', async ({ page }) => {
  await rename(page, 'First'); await write(page, 'first document');
  await create(page); await rename(page, 'Second'); await write(page, 'second document');
  await create(page); await rename(page, 'Third'); await write(page, 'latest third edit');
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.open"]').click();
  await page.getByRole('dialog', { name: 'Document library', exact: true }).evaluate(dialog => {
    const rows = [...dialog.querySelectorAll('li')];
    rows.find(row => row.textContent?.includes('First'))!.querySelector('button')!.click();
    rows.find(row => row.textContent?.includes('Second'))!.querySelector('button')!.click();
  });
  await expect(page.locator('.ProseMirror')).toHaveText('first document');
  await windowMenu(page); await expect(entries(page)).toHaveText(['1  First', '2  Second', '3  Third']);
  await expect(entries(page).nth(0)).toHaveAttribute('aria-checked', 'true'); await page.keyboard.press('Escape');
  await switchTo(page, 2); await expect(page.locator('.ProseMirror')).toHaveText('latest third edit');
});

test('denied object-storage reads cannot silently load an empty destination', async ({ page }) => {
  await rename(page, 'First'); await create(page); await rename(page, 'Second'); await write(page, 'keep current edits');
  const before = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await page.evaluate(() => {
    const original = Storage.prototype.getItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage = () => { Storage.prototype.getItem = original; };
    Storage.prototype.getItem = function (key) {
      if (key === 'qalam-studio-frames-v1') throw new DOMException('Storage denied', 'SecurityError');
      return original.call(this, key);
    };
  });
  await switchTo(page, 0);
  await expect(page.getByRole('alert').filter({ hasText: 'could not be saved' })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(before);
  await expect(page.locator('.ProseMirror')).toHaveText('keep current edits');
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
  await switchTo(page, 0); await switchTo(page, 1); await expect(page.locator('.ProseMirror')).toHaveText('keep current edits');
});
