import { chromium as playwrightChromium, expect, test } from '@playwright/test';
import type { Editor } from '@tiptap/core';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { POST } from '../../app/api/export-pdf/route';
import { PdfExportTestRequest } from '../helpers/pdfExportRequest';

test('compare existing browser and real server PDF output without changing either renderer', async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => { localStorage.setItem('qalam-site-language', 'en'); window.print = () => {}; });
  await page.goto('/tools/document-studio');
  await expect(page.locator('.ProseMirror')).toBeEditable();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.new"]').click();
  const setup = page.getByRole('dialog', { name: 'New Document', exact: true });
  await setup.getByRole('combobox', { name: 'Page size' }).selectOption('a5');
  await setup.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.locator('[data-studio-print-root]')).toHaveAttribute('data-print-page-width-mm', '148');
  await expect(page.locator('.ProseMirror')).toBeEditable();
  const png = await sharp({ create: { width: 80, height: 24, channels: 3, background: '#184cb5' } }).png().toBuffer();
  const img = `data:image/png;base64,${png.toString('base64')}`;
  const p = (text: string, dir: string, font: string, color = '#000000') => ({ type: 'paragraph', attrs: { dir, directionMode: dir }, content: [{ type: 'text', text, marks: [{ type: 'textStyle', attrs: { fontFamily: font, color, fontSize: '12pt' } }] }] });
  const doc = { type: 'doc', content: [
    p('محفوظ اردو عبارت، براؤزر اور سرور سے پی ڈی ایف کی جانچ۔', 'rtl', 'Mehr Nastaliq Web'),
    p('رَبِّ الۡعٰلَمِیۡنَ، قُلِ اللّٰھُمَّ', 'rtl', 'Digital Khatt Indo-Pak'),
    p('First page: colored text, image and a table.', 'ltr', 'Inter', '#b02030'),
    { type: 'image', attrs: { src: img, alt: 'Blue test image', width: 80, height: 24, alignment: 'center', wrapMode: 'break' } },
    { type: 'table', content: [
      { type: 'tableRow', content: ['Table A', 'Table B'].map(text => ({ type: 'tableCell', content: [p(text, 'ltr', 'Inter')] })) },
      { type: 'tableRow', content: ['Table C', 'Table D'].map(text => ({ type: 'tableCell', content: [p(text, 'ltr', 'Inter')] })) },
    ] },
    { type: 'pageBreak' }, p('Second page: no unexpected trailing blank page.', 'ltr', 'Inter'),
    p('دوسرا صفحہ محفوظ رہے۔', 'rtl', 'Mehr Nastaliq Web'),
  ] };
  await page.locator('.ProseMirror').evaluate((el, value) => (el as HTMLElement & { editor: Editor }).editor.commands.setContent(value), doc);
  await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.save"]').click();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  // Characterize existing separate drawing objects as well as story content.
  await page.evaluate(() => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [{ id: 'review-object', kind: 'rect', page: 1, xMm: 20, yMm: 90, wMm: 40, hMm: 15, flip: false, text: '' }] }));
  });
  await page.reload();
  await expect(page.locator('[data-studio-frame-id="review-object"]')).toHaveCount(1);
  await expect(page.locator('.ProseMirror')).toHaveAttribute('data-studio-font-layout', 'ready');
  const before = await page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
  let fallback = false;
  const originalPath = chromium.executablePath;
  const launch = puppeteer.launch.bind(puppeteer);
  const originalLaunch = puppeteer.launch;
  chromium.executablePath = async () => process.env.PLAYWRIGHT_CHROMIUM_PATH || playwrightChromium.executablePath();
  puppeteer.launch = options => launch({ ...options, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    await page.route('**/api/export-pdf', async route => {
      if (fallback) { await route.fulfill({ status: 503, body: 'busy' }); return; }
      const response = await POST(new PdfExportTestRequest('http://localhost/api/export-pdf', { method: 'POST', body: route.request().postData()!, headers: { 'content-type': 'application/json' } }));
      expect(response.status, response.status === 200 ? 'real server export' : await response.text()).toBe(200);
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    });
    const downloading = page.waitForEvent('download');
    await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.downloadPdf"]').click();
    const downloaded = await downloading, serverPath = info.outputPath('server.pdf'); await downloaded.saveAs(serverPath);
    await expect(page.locator('[data-studio-pdf-recovery]')).toHaveCount(0);
    fallback = true;
    await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.downloadPdf"]').click();
    await page.getByRole('button', { name: 'Save PDF using browser' }).click();
    const portal = page.locator('[data-studio-print-portal]'); await expect(portal).toHaveAttribute('data-print-waited-fonts', 'true');
    await expect(portal.locator('img')).toHaveCount(1); await expect(portal.locator('td')).toHaveCount(4);
    await expect(portal.locator('[dir="rtl"]')).not.toHaveCount(0);
    await expect(portal.locator('[data-print-frame]')).toHaveCount(1); // Phase 5 now includes the saved object.
    const printStyle = await portal.locator('style').textContent();
    expect(printStyle).toContain('size: 148mm 210mm'); expect(printStyle).toContain('margin: 12.7mm 0 12.7mm 0');
    const color = await portal.locator('[data-studio-latin-run]').filter({ hasText: 'First page:' }).evaluate(el => getComputedStyle(el).color);
    expect(color).toBe('rgb(176, 32, 48)');
    const browserTableCells = await portal.locator('td').count();
    const browserPath = info.outputPath('browser.pdf');
    await page.pdf({ path: browserPath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    const server = await PDFDocument.load(readFileSync(serverPath)), browser = await PDFDocument.load(readFileSync(browserPath));
    const report = { serverPages: server.getPageCount(), browserPages: browser.getPageCount(),
      serverSizes: server.getPages().map(p => p.getSize()), browserSizes: browser.getPages().map(p => p.getSize()),
      existingSeparateObjectOmission: false, browserTableCells,
      browserText: (execFileSync('pdftotext', ['-layout', browserPath, '-'])).toString(), serverText: (execFileSync('pdftotext', ['-layout', serverPath, '-'])).toString(),
    };
    writeFileSync(info.outputPath('comparison.json'), JSON.stringify(report, null, 2));
    expect(report.serverPages).toBe(2); expect(report.browserPages).toBe(2);
    for (const document of [server, browser]) for (const p of document.getPages()) {
      // Chromium rounds physical pages differently for mm vs CSS @page input.
      expect(Math.abs(p.getWidth() - 148 * 72 / 25.4)).toBeLessThan(1);
      expect(Math.abs(p.getHeight() - 210 * 72 / 25.4)).toBeLessThan(1);
    }
    for (const text of [report.serverText, report.browserText]) {
      expect(text).toContain('First page:'); expect(text).toContain('Second page:'); expect(text).toContain('Table A');
      expect(text).not.toContain('Qalam Page'); expect(text).not.toContain('Save PDF using browser');
    }
    for (const [name, file] of [['server', serverPath], ['browser', browserPath]]) {
      execFileSync('pdftoppm', ['-f', '1', '-singlefile', '-scale-to-x', '560', '-scale-to-y', '-1', '-png', file, info.outputPath(name)]);
    }
    const a = await sharp(info.outputPath('server.png')).toBuffer(), b = await sharp(info.outputPath('browser.png')).toBuffer();
    const { width, height } = await sharp(a).metadata();
    const labels = Buffer.from(`<svg width="${width! * 2 + 12}" height="28"><text x="8" y="18" font-size="14">Existing server PDF</text><text x="${width! + 20}" y="18" font-size="14">Existing browser print PDF</text></svg>`);
    await sharp({ create: { width: width! * 2 + 12, height: height! + 28, channels: 3, background: '#ffffff' } }).composite([{ input: labels, left: 0, top: 0 }, { input: a, left: 0, top: 28 }, { input: b, left: width! + 12, top: 28 }]).png().toFile(info.outputPath('server-browser-comparison.png'));
    expect(await page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON())).toEqual(before);
  } finally { chromium.executablePath = originalPath; puppeteer.launch = originalLaunch; }
});
