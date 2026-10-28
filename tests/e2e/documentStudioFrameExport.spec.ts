import { studioPrintFrames } from '../fixtures/studioPrintFrames';
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

test('drawing objects appear on their physical pages in real server and browser PDFs', async ({ page }, info) => {
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
  await page.addInitScript(frames => {
    const id = localStorage.getItem('qalam-document-studio-active-document-v1')!;
    localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: frames }));
  }, studioPrintFrames);
  await page.reload();
  await expect(page.locator('.ProseMirror')).toHaveAttribute('data-studio-font-layout', 'ready', { timeout: 25_000 });
  await expect(page.locator('[data-studio-frame-id="review-object"]')).toHaveCount(1);
  const before = await page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON());
  let fallback = false;
  let exportedFrames = studioPrintFrames;
  let editorGeometry: { id: string; xMm: number; yMm: number; wMm: number; hMm: number }[] = [];
  const originalPath = chromium.executablePath;
  const launch = puppeteer.launch.bind(puppeteer);
  const originalLaunch = puppeteer.launch;
  chromium.executablePath = async () => process.env.PLAYWRIGHT_CHROMIUM_PATH || playwrightChromium.executablePath();
  const frameStyles = () => Array.from(document.querySelectorAll<HTMLElement>('[data-print-frame="text"]')).map(node => {
    const s = getComputedStyle(node), span = node.querySelector('span');
    const range = document.createRange(); range.selectNodeContents(node); const r = range.getBoundingClientRect();
    return { id: node.dataset.printFrameId, text: node.textContent, font: s.fontFamily, size: s.fontSize, line: s.lineHeight, bidi: s.unicodeBidi, rect: { width: r.width, height: r.height }, child: span ? { font: getComputedStyle(span).fontFamily, size: getComputedStyle(span).fontSize, line: getComputedStyle(span).lineHeight } : null };
  });
  puppeteer.launch = async options => {
    const browser = await launch({ ...options, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const newPage = browser.newPage.bind(browser);
    browser.newPage = async () => {
      const paper = await newPage(), pdf = paper.pdf.bind(paper);
      paper.pdf = async options => { const styles = await paper.evaluate(frameStyles); if (styles.length) writeFileSync(info.outputPath('server-frame-styles.json'), JSON.stringify(styles, null, 2)); return pdf(options); };
      return paper;
    }; return browser;
  };
  try {
    await page.route('**/api/export-pdf', async route => {
      if (fallback) { await route.fulfill({ status: 503, body: 'busy' }); return; }
      exportedFrames = route.request().postDataJSON().frames;
      expect(exportedFrames).toHaveLength(studioPrintFrames.length);
      expect(exportedFrames[0].xMm).toBeGreaterThan(20.5);
      expect(exportedFrames.find(f => f.id === 'english-two')?.text).toContain('changed before export');
      for (const frame of exportedFrames) {
        const shown = editorGeometry.find(item => item.id === frame.id)!;
        for (const key of ['xMm', 'yMm', 'wMm', 'hMm'] as const) expect(Math.abs(shown[key] - frame[key]), `${frame.id}: editor ${key}`).toBeLessThan(.4);
      }
      const response = await POST(new PdfExportTestRequest('http://localhost/api/export-pdf', { method: 'POST', body: route.request().postData()!, headers: { 'content-type': 'application/json' } }));
      expect(response.status, response.status === 200 ? 'real server export' : await response.text()).toBe(200);
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    });
    // Suppress only storage writes in this test, then make real unsaved UI
    // changes. The request and print path must use current React frame state.
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (key === 'qalam-studio-frames-v1') return; original.call(this, key, value); };
    });
    await page.locator('[data-studio-tool-button="select"]').click();
    const moved = page.locator('[data-studio-frame-id="review-object"]'); await moved.scrollIntoViewIfNeeded();
    const box = (await moved.boundingBox())!; await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2, { steps: 3 }); await page.mouse.up();
    await page.locator('[data-studio-tool-button="text"]').click();
    await page.locator('[data-studio-frame-id="english-two"] textarea').fill('English frame content changed before export.');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('qalam-studio-frames-v1')!)[localStorage.getItem('qalam-document-studio-active-document-v1')!][0].xMm)).toBe(20);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    editorGeometry = await page.evaluate(frames => frames.map(frame => {
      const object = document.querySelector<HTMLElement>(`[data-studio-frame-id="${frame.id}"]`)!.getBoundingClientRect();
      const paper = document.querySelector<HTMLElement>(`[data-studio-page-paper="${frame.page}"]`)!.getBoundingClientRect();
      // Paper backdrop includes a rounded/bordered screen-pixel edge. The
      // natural-size zoom surface is the actual frame coordinate system.
      const factor = document.querySelector<HTMLElement>('[data-studio-zoom-surface]')!.getBoundingClientRect().width / 148;
      return { id: frame.id, xMm: (object.left - paper.left) / factor, yMm: (object.top - paper.top) / factor, wMm: object.width / factor, hMm: object.height / factor };
    }), studioPrintFrames);
    writeFileSync(info.outputPath('editor-geometry.json'), JSON.stringify(editorGeometry, null, 2));
    await page.screenshot({ path: info.outputPath('editor-single.png'), scale: 'css' });
    await page.locator('[data-menu-root="view"]').click(); await page.locator('[data-menu-action="view.facing"]').click();
    await page.getByRole('combobox', { name: 'Zoom', exact: true }).selectOption('200');
    const downloading = page.waitForEvent('download');
    await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.downloadPdf"]').click();
    const downloaded = await downloading, serverPath = info.outputPath('server.pdf'); await downloaded.saveAs(serverPath);
    await expect(page.locator('[data-studio-pdf-recovery]')).toHaveCount(0);
    const legacyBody = { doc: before, dir: 'rtl', settings: JSON.parse(await page.evaluate(() => localStorage.getItem('qalam-document-studio-settings-v1')) || '{}') };
    const legacy = await POST(new PdfExportTestRequest('http://localhost/api/export-pdf', { method: 'POST', body: JSON.stringify(legacyBody) }));
    expect(legacy.status, legacy.status === 200 ? 'legacy request without frames' : await legacy.text()).toBe(200);
    const legacyBytes = Buffer.from(await legacy.arrayBuffer()); writeFileSync(info.outputPath('legacy-without-frames.pdf'), legacyBytes);
    expect((await PDFDocument.load(legacyBytes)).getPageCount()).toBe(2);
    fallback = true;
    await page.getByRole('combobox', { name: 'Zoom', exact: true }).selectOption('50');
    await page.locator('[data-menu-root="file"]').click(); await page.locator('[data-menu-action="file.downloadPdf"]').click();
    await page.getByRole('button', { name: 'Save PDF using browser' }).click();
    const portal = page.locator('[data-studio-print-portal]'); await expect(portal).toHaveAttribute('data-print-waited-fonts', 'true');
    await expect(portal.locator('img')).toHaveCount(1); await expect(portal.locator('td')).toHaveCount(4);
    await expect(portal.locator('[dir="rtl"]')).not.toHaveCount(0);
    await expect(portal.locator('[data-print-frame]')).toHaveCount(studioPrintFrames.length);
    for (const [id, family] of [['urdu-one', 'Mehr Nastaliq Web'], ['arabic-two', 'Digital Khatt Indo-Pak'], ['english-two', 'Inter']]) {
      expect(await portal.locator(`[data-print-frame-id="${id}"]`).evaluate(el => getComputedStyle(el).fontFamily)).toMatch(new RegExp('^"?' + family, 'i'));
    }
    await expect(portal.locator('[data-studio-frame-handle],textarea')).toHaveCount(0);
    const printStyle = await portal.locator('style').textContent();
    expect(printStyle).toContain('size: 148mm 210mm'); expect(printStyle).toContain('margin: 12.7mm 0 12.7mm 0');
    const color = await portal.locator('[data-studio-latin-run]').filter({ hasText: 'First page:' }).evaluate(el => getComputedStyle(el).color);
    expect(color).toBe('rgb(176, 32, 48)');
    const browserTableCells = await portal.locator('td').count();
    const browserPath = info.outputPath('browser.pdf');
    await page.emulateMedia({ media: 'print' });
    const browserStyles = await page.evaluate(frameStyles);
    writeFileSync(info.outputPath('browser-frame-styles.json'), JSON.stringify(browserStyles, null, 2));
    const serverStyles = JSON.parse(readFileSync(info.outputPath('server-frame-styles.json'), 'utf8')) as typeof browserStyles;
    for (const frame of browserStyles) {
      const other = serverStyles.find(item => item.id === frame.id)!;
      expect(frame.size).toBe(other.size); expect(frame.line).toBe(other.line);
      expect(Math.abs(frame.rect.width - other.rect.width), `${frame.id}: same shaped text width`).toBeLessThan(1);
      expect(Math.abs(frame.rect.height - other.rect.height), `${frame.id}: same wrapped text height`).toBeLessThan(2);
    }
    await page.pdf({ path: browserPath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    await page.emulateMedia({ media: 'screen' });
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
    const measurements: { name: string; pageNumber: number; id: string; black: number; inside: number; left: number; top: number; right: number; bottom: number }[] = [];
    for (const [name, file] of [['server', serverPath], ['browser', browserPath]]) {
      const text = execFileSync('pdftotext', ['-layout', file, '-']).toString();
      expect(text.replace(/\s+/g, ' ')).toContain('English frame content');
      for (const pageNumber of [1, 2]) {
        const prefix = info.outputPath(`${name}-${pageNumber}`);
        execFileSync('pdftoppm', ['-f', String(pageNumber), '-singlefile', '-r', '96', '-png', file, prefix]);
        const { data, info: image } = await sharp(prefix + '.png').removeAlpha().raw().toBuffer({ resolveWithObject: true });
        for (const frame of exportedFrames.filter(f => f.page === pageNumber)) {
          const px = 96 / 25.4, x0 = Math.floor(frame.xMm * px) - 2, y0 = Math.floor(frame.yMm * px) - 2;
          const x1 = Math.ceil((frame.xMm + frame.wMm) * px) + 2, y1 = Math.ceil((frame.yMm + frame.hMm) * px) + 2;
          let black = 0, inside = 0, left = Infinity, top = Infinity, right = -1, bottom = -1;
          for (let y = Math.max(0, y0); y < Math.min(image.height, y1); y++) for (let x = Math.max(0, x0); x < Math.min(image.width, x1); x++) {
            const i = (y * image.width + x) * 3;
            if (data[i] < 150 && data[i+1] < 150 && data[i+2] < 150) {
              black++; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
              if (x > x0 + 6 && x < x1 - 6 && y > y0 + 6 && y < y1 - 6) inside++;
            }
          }
          expect(black, `${name} page ${pageNumber}: ${frame.id} actual PDF pixels`).toBeGreaterThan(frame.kind === 'line' ? 40 : 150);
          expect(Math.abs(left - frame.xMm * px), `${name} ${frame.id}: x`).toBeLessThan(3);
          expect(Math.abs(top - frame.yMm * px), `${name} ${frame.id}: y`).toBeLessThan(3);
          expect(Math.abs((right-left+1) - frame.wMm * px), `${name} ${frame.id}: width`).toBeLessThan(4);
          expect(Math.abs((bottom-top+1) - frame.hMm * px), `${name} ${frame.id}: height`).toBeLessThan(4);
          if (frame.kind === 'text') expect(inside, `${name} ${frame.id}: visible text inside border`).toBeGreaterThan(60);
          if (frame.kind === 'line') {
            const near = (fraction: number) => {
              const x = Math.round((frame.xMm + frame.wMm * fraction) * px), y = Math.round((frame.yMm + frame.hMm * .25) * px);
              for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const i = ((y + dy) * image.width + x + dx) * 3; if (data[i] < 150 && data[i+1] < 150 && data[i+2] < 150) return true; }
              return false;
            };
            expect(near(frame.flip ? .75 : .25), `${name}: ${frame.id} correct diagonal`).toBe(true);
            expect(near(frame.flip ? .25 : .75), `${name}: ${frame.id} no opposite diagonal`).toBe(false);
          }
          measurements.push({ name, pageNumber, id: frame.id, black, inside, left, top, right, bottom });
        }
        for (const frame of exportedFrames.filter(f => f.page !== pageNumber && ['rounded-one', 'english-two', 'boundary-two'].includes(f.id))) {
          let unexpected = 0; const px = 96 / 25.4;
          for (let y = Math.floor(frame.yMm * px) - 1; y < Math.ceil((frame.yMm + frame.hMm) * px) + 1; y++) for (let x = Math.floor(frame.xMm * px) - 1; x < Math.ceil((frame.xMm + frame.wMm) * px) + 1; x++) {
            const i = (y * image.width + x) * 3; if (data[i] < 150 && data[i+1] < 150 && data[i+2] < 150) unexpected++;
          }
          expect(unexpected, `${name} ${frame.id}: not duplicated on page ${pageNumber}`).toBeLessThan(5);
        }
      }
    }
    writeFileSync(info.outputPath('object-measurements.json'), JSON.stringify(measurements, null, 2));
    const a = await sharp(info.outputPath('server-1.png')).toBuffer(), b = await sharp(info.outputPath('browser-1.png')).toBuffer();
    const { width, height } = await sharp(a).metadata();
    const labels = Buffer.from(`<svg width="${width! * 2 + 12}" height="28"><text x="8" y="18" font-size="14">Existing server PDF</text><text x="${width! + 20}" y="18" font-size="14">Existing browser print PDF</text></svg>`);
    await sharp({ create: { width: width! * 2 + 12, height: height! + 28, channels: 3, background: '#ffffff' } }).composite([{ input: labels, left: 0, top: 0 }, { input: a, left: 0, top: 28 }, { input: b, left: width! + 12, top: 28 }]).png().toFile(info.outputPath('server-browser-comparison.png'));
    expect(await page.locator('.ProseMirror').evaluate(el => (el as HTMLElement & { editor: Editor }).editor.getJSON())).toEqual(before);
  } finally { chromium.executablePath = originalPath; puppeteer.launch = originalLaunch; }
});
