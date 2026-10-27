import { expect, test } from '@playwright/test';

test('Tab inserts a visible character at the Urdu caret and undo removes it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio');
  const editor = page.locator('.ProseMirror');
  await expect(editor).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await page.locator('[data-studio-tool-button="text"]').click();
  await editor.evaluate((root) => {
    const e = (root as any).editor;
    e.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', attrs: { dir: 'rtl' }, content: [{ type: 'text', text: 'سلام دنیا' }] }] });
  });
  await editor.locator('p').first().click();
  await editor.evaluate((root) => (root as any).editor.commands.setTextSelection(5));
  const width = () => editor.locator('p').first().evaluate((p) => {
    const range = document.createRange(); range.selectNodeContents(p); return range.getBoundingClientRect().width;
  });
  const before = await width();
  if (process.env.TAB_SCREENSHOTS) await editor.locator('p').first().screenshot({ path: `${process.env.TAB_SCREENSHOTS}/tab-before.png` });
  await page.keyboard.press('Tab');
  await expect.poll(() => editor.evaluate((root) => (root as any).editor.getJSON().content[0].content.map((n: any) => n.text).join(''))).toBe('سلام\t دنیا');
  expect(await width()).toBeGreaterThan(before + 2);
  if (process.env.TAB_SCREENSHOTS) await editor.locator('p').first().screenshot({ path: `${process.env.TAB_SCREENSHOTS}/tab-after.png` });
  await page.keyboard.press('Control+z');
  await expect.poll(() => editor.evaluate((root) => (root as any).editor.getText())).toBe('سلام دنیا');
});

for (const mode of ['pages', 'facing'] as const) {
  for (const sample of [{ dir: 'rtl', text: 'سلام دنیا' }, { dir: 'ltr', text: 'Hello world' }] as const) {
    test(`${mode} ${sample.dir}: selection is replaced, Shift+Tab stays, undo is one step`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
      await page.goto('/tools/document-studio');
      const editor = page.locator('.ProseMirror');
      await expect(editor).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
      if (mode === 'facing') {
        await page.locator('[data-menu-root="view"]').click();
        await page.locator('[data-menu-action="view.facing"]').click();
        await expect(page.locator('[data-studio-view]')).toHaveAttribute('data-studio-view', 'facing');
      }
      await editor.evaluate((root, sample) => {
        const e = (root as any).editor;
        e.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', attrs: { dir: sample.dir }, content: [{ type: 'text', text: sample.text }] }] });
      }, sample);
      await editor.focus();
      await editor.evaluate(root => (root as any).editor.commands.setTextSelection({ from: 2, to: 4 }));
      await page.keyboard.press('Tab');
      await expect.poll(() => editor.evaluate(root => (root as any).editor.getText())).toBe(sample.text.slice(0, 1) + '\t' + sample.text.slice(3));
      expect(await editor.evaluate(root => (root as any).editor.state.selection.from)).toBe(3);
      await page.keyboard.press('Shift+Tab');
      await expect(editor).toBeFocused();
      await expect.poll(() => editor.evaluate(root => (root as any).editor.getText())).toBe(sample.text.slice(0, 1) + '\t' + sample.text.slice(3));
      await page.keyboard.press('Control+z');
      await expect.poll(() => editor.evaluate(root => (root as any).editor.getText())).toBe(sample.text);
    });
  }
}

test('Tab and Shift+Tab move focus through toolbar and dialog inputs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qalam-site-language', 'en'));
  await page.goto('/tools/document-studio');
  const editor = page.locator('.ProseMirror');
  await expect(editor).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  const font = page.locator('[data-studio-font-family]');
  await font.focus();
  await page.keyboard.press('Tab');
  await expect(font).not.toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(font).toBeFocused();
  for (const name of ['Character', 'Paragraph'] as const) {
    await editor.evaluate(root => {
      const e = (root as any).editor;
      e.commands.focus();
      const rect = root.getBoundingClientRect();
      root.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: rect.left + 24, clientY: rect.top + 14 }));
    });
    await page.getByRole('menuitem', { name: `${name}…`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: name === 'Character' ? 'Character' : 'Paragraph Preferences', exact: true });
    await expect(dialog).toBeVisible();
    const input = dialog.locator('input:visible').first();
    await input.focus();
    await page.keyboard.press('Tab');
    await expect(input).not.toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(input).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  }
});

test.fixme('PDF preserves tab spacing', async ({ page }, info) => {
  // Follow-up: PDF pagination currently collapses tabs to ordinary spaces.
  const { defaultDocumentSettings } = await import('../../app/tools/document-studio/utils/documentSettings');
  const { writeFileSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const positions: number[] = [];
  for (const text of ['Alpha Beta', 'Alpha\tBeta']) {
    const doc = { type: 'doc', content: [{ type: 'paragraph', attrs: { dir: 'ltr' }, content: [{ type: 'text', text }] }] };
    const response = await page.request.post('/api/export-pdf', { data: { doc, dir: 'ltr', settings: defaultDocumentSettings() }, timeout: 60000 });
    expect(response.status()).toBe(200);
    const file = info.outputPath(`${positions.length}.pdf`);
    writeFileSync(file, await response.body());
    const bbox = execFileSync('pdftotext', ['-bbox', file, '-'], { encoding: 'utf8' });
    const match = bbox.match(/<word xMin="([\d.]+)"[^>]*>Beta<\/word>/);
    expect(match).not.toBeNull();
    positions.push(Number(match![1]));
  }
  expect(positions[1]).toBeGreaterThan(positions[0] + 1);
});
