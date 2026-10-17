import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { createBookExcerpt, type BookRecord } from '../../app/lib/knowledge/bookCorpus';

for (const locale of ['ur', 'en'] as const) {
  const ur = locale === 'ur';
  test(locale + ': focused reader stays separate and sends verified excerpts to My Sermon', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });

    const source = { id: 'sahifa-ar', book: 'sahifa' as const, language: 'ar' as const, filename: 'sahifa-ar.docx', translator: null, sha256: 'a'.repeat(64) };
    const id = 'sahifa-ar:supplication:28';
    const paragraphs = [{ id: id + ':p1', text: 'اَللّٰهُمَّ — عبارتِ آزمائش اوّل' }, { id: id + ':p2', text: 'حاشیہ — عبارتِ آزمائش دوم' }];
    const record = {
      id, sourceId: source.id, book: 'sahifa', language: 'ar' as const, kind: 'supplication', number: 28,
      title: 'دعا 28 — آزمائشی عبارت', reference: { sourceId: source.id, section: 'supplication', number: 28, locator: 'source paragraph', printPage: null },
      paragraphs, textSha256: createHash('sha256').update(paragraphs.map(p => p.text).join('\n')).digest('hex'),
    } satisfies BookRecord;

    await page.route('**/api/research/book-reader**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === 'POST') {
        const body = request.postDataJSON();
        return route.fulfill({ json: { excerpt: createBookExcerpt(record, source, body.paragraphIds) } });
      }
      const op = url.searchParams.get('op');
      const body = op === 'catalog' ? { ready: true, revision: 'synthetic', sources: [source] }
        : op === 'contents' ? { entries: [{ id, sourceId: source.id, title: record.title, ordinal: 1, headingStatus: 'source-title', paragraphCount: 2 }], total: 1, page: 1, pageSize: 24 }
        : op === 'read' ? { recordId: id, sourceId: source.id, recordOrdinal: 1, language: 'ar', title: record.title, reference: 'صحیفہ سجادیہ، دعا 28', translator: null,
          paragraphCount: 2, paragraphs, page: Number(url.searchParams.get('part') ?? 1), pageCount: 1, previousRecordId: null, nextRecordId: null,
          recordSha256: record.textSha256, sourceSha256: source.sha256, screenPartOnly: true,
          translations: [{ paragraphIds: [paragraphs[0].id], text: 'اے اللہ — آزمائشی دعا کا متن', language: 'ur', translator: 'مصنوعی بصری فکسچر', source: 'Playwright fixture — not corpus data' }] }
        : op === 'find' ? { hits: [], total: 0, page: 1, pageSize: 20 } : {};
      return route.fulfill({ json: body });
    });

    await page.addInitScript((language: string) => localStorage.setItem('qalam-site-language', language), locale);
    await page.goto('/tools/khateeb-studio/library');
    await expect(page).toHaveURL(/\/tools\/khateeb-studio\/library$/);
    const reader = page.getByTestId('khateeb-book-reader');
    await expect(reader.getByTestId('book-reading-page')).toBeVisible();
    await expect(reader.getByText(paragraphs[0].text)).toBeVisible();
    await expect(page.getByText('Qalam Knowledge Assistant — ask the sources', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Topic preparation — patience', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Book library management — owner only', { exact: true })).toHaveCount(0);
    await expect(reader.getByRole('checkbox')).toHaveCount(0);
    await reader.screenshot({ path: testInfo.outputPath('book-arabic-light-desktop.png'), animations: 'disabled' });
    await reader.getByLabel(ur ? 'مطالعے کی صورت' : 'Reading mode').selectOption('combined');
    await expect(reader.getByText('اے اللہ — آزمائشی دعا کا متن')).toBeVisible();
    await expect(reader.getByText(ur ? 'بعض پیراگراف کا اردو ترجمہ دستیاب نہیں' : 'Some paragraphs do not have an Urdu translation yet.')).toBeVisible();
    await reader.screenshot({ path: testInfo.outputPath('book-arabic-urdu-fixture-desktop.png'), animations: 'disabled' });
    await reader.getByLabel(ur ? 'مطالعے کی صورت' : 'Reading mode').selectOption('original');
    await page.locator('html').evaluate(node => node.classList.add('dark'));
    await reader.screenshot({ path: testInfo.outputPath('book-arabic-dark-desktop.png'), animations: 'disabled' });
    await page.locator('html').evaluate(node => node.classList.remove('dark'));
    const desktopWidth = await reader.getByTestId('book-reading-page').evaluate(node => node.getBoundingClientRect().width);
    expect(desktopWidth).toBeGreaterThan(820);
    expect(desktopWidth).toBeLessThan(1000);

    await expect(reader.getByRole('checkbox')).toHaveCount(0);
    await reader.locator('nav').first().locator('summary').click();
    await reader.getByRole('button', { name: ur ? 'عبارت منتخب کریں' : 'Select passage', exact: true }).click();
    await reader.locator('nav').first().locator('summary').click();
    await reader.getByRole('checkbox', { name: ur ? 'پیراگراف 1 منتخب کریں' : 'Select paragraph 1', exact: true }).check();
    await reader.screenshot({ path: testInfo.outputPath('book-selection-mode-desktop.png'), animations: 'disabled' });
    await reader.getByRole('button', { name: ur ? 'میری مجلس میں شامل کریں' : 'Add to My Sermon', exact: true }).click();
    await expect(reader.getByRole('status').filter({ hasText: ur ? 'میری مجلس میں شامل اور محفوظ ہوگئی' : 'Saved in My Sermon' })).toBeVisible();

    await expect(reader.getByRole('checkbox')).toHaveCount(0);
    await reader.locator('nav').first().locator('summary').click();
    await expect(reader.getByRole('button', { name: ur ? 'عبارت منتخب کریں' : 'Select passage', exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => localStorage.removeItem('qalam-khateeb-book-reader-progress-v1'));
    await page.goto('/tools/khateeb-studio/library');
    await expect(page.getByTestId('book-reading-page')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    await reader.screenshot({ path: testInfo.outputPath('book-arabic-light-mobile.png'), animations: 'disabled' });
    expect(errors).toEqual([]);
  });
}

test('measured page breaks preserve a long synthetic Arabic/Urdu passage across pages and print', async ({ page }, testInfo) => {
  const source = { id: 'nahj-ar', book: 'nahj' as const, language: 'ar' as const, filename: 'fixture.json', translator: null, sha256: 'a'.repeat(64) };
  const recordId = 'nahj-ar:sermon:fixture-r6';
  const arabic = ('وَقَالَ أَمِيرُ الْمُؤْمِنِينَ عَلَيْهِ السَّلَامُ: إِنَّ الصَّبْرَ مِفْتَاحُ الْفَرَجِ، وَالْعِلْمَ نُورٌ۔ ').repeat(52);
  const urdu = ('یہ مصنوعی طویل اردو عبارت آزمائش کے لیے ہے، یہ کسی مستند کتابی ترجمے کی نمائندگی نہیں کرتی، اور صفحہ بندی میں اصل حروف کی ترتیب برقرار رہنی چاہیے۔ ').repeat(44);
  const paragraph = { id: `${recordId}:p1`, text: arabic };
  const translation = { paragraphIds: [paragraph.id], text: urdu, language: 'ur', translator: 'Synthetic fixture', source: 'Not a verified translation' };
  const hash = 'b'.repeat(64);
  await page.route('**/api/research/book-reader**', async route => {
    const url = new URL(route.request().url());
    const op = url.searchParams.get('op');
    const body = op === 'catalog' ? { ready: true, revision: 'synthetic-r6', sources: [source] }
      : op === 'contents' ? { entries: [{ id: recordId, sourceId: source.id, title: 'Synthetic long passage', ordinal: 1, headingStatus: 'source-title', paragraphCount: 1 }], total: 1, page: 1, pageSize: 24 }
      : op === 'read' ? { recordId, sourceId: source.id, recordOrdinal: 1, language: 'ar', title: 'Synthetic long passage', reference: 'Synthetic test reference', translator: null, paragraphCount: 1, paragraphs: [paragraph], page: 1, pageCount: 1, previousRecordId: null, nextRecordId: null, recordSha256: hash, sourceSha256: source.sha256, screenPartOnly: true, translations: [translation] }
      : op === 'find' ? { hits: [], total: 0, page: 1, pageSize: 20 } : {};
    return route.fulfill({ json: body });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/tools/khateeb-studio/library');
  const reader = page.getByTestId('khateeb-book-reader');
  const article = reader.getByTestId('book-reading-page');
  await expect(article).toBeVisible();
  await expect.poll(() => article.getByTestId('reader-page-text-area').evaluate(node => node.clientHeight)).toBeGreaterThan(0);
  const area = article.getByTestId('reader-page-text-area');
  const pageTexts: string[] = [];
  for (let index = 0; index < 3; index++) {
    await expect.poll(() => area.locator('[data-source-kind="original"]').count()).toBeGreaterThan(0);
    const fits = await area.evaluate(node => node.scrollHeight <= node.clientHeight + 1);
    expect(fits, `synthetic Arabic visual page ${index + 1} fits its actual text area`).toBe(true);
    const current = await area.locator('[data-source-kind="original"]').allTextContents();
    pageTexts.push(current.join(''));
    await article.screenshot({ path: testInfo.outputPath(`r6-synthetic-arabic-page-${index + 1}.png`) });
    if (index < 2) await reader.getByRole('button', { name: 'Next reader page' }).click();
  }
  expect(pageTexts.join('')).toBe(arabic);
  await reader.getByLabel('Reading mode').selectOption('translation');
  await expect.poll(() => area.locator('[data-source-kind="translation"]').count()).toBeGreaterThan(0);
  const urduPages: string[] = [];
  while (true) {
    expect(await area.evaluate(node => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
    urduPages.push((await area.locator('[data-source-kind="translation"]').allTextContents()).join(''));
    const next = reader.getByRole('button', { name: 'Next reader page' });
    if (await next.isDisabled()) break;
    await next.click();
  }
  await article.screenshot({ path: testInfo.outputPath('r6-synthetic-urdu-page.png') });
  expect(urduPages.join('')).toBe(urdu);
  await reader.getByLabel('Reading mode').selectOption('combined');
  await expect.poll(() => area.locator('[data-source-kind="original"]').count()).toBeGreaterThan(0);
  await expect.poll(() => area.locator('[data-source-kind="translation"]').count()).toBeGreaterThan(0);
  await article.screenshot({ path: testInfo.outputPath('r6-synthetic-combined-page.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => area.evaluate(node => node.clientHeight)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await article.screenshot({ path: testInfo.outputPath('r6-synthetic-mobile.png') });
  await reader.locator('nav').first().locator('summary').click();
  await reader.getByRole('button', { name: 'Select passage' }).click();
  await expect(reader.getByRole('checkbox', { name: 'Select paragraph 1' })).toBeVisible();
  await article.screenshot({ path: testInfo.outputPath('r6-synthetic-selection-mode.png') });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const pdfBytes = await page.pdf({ path: testInfo.outputPath('r6-synthetic-reader.pdf'), format: 'A5', printBackground: true, preferCSSPageSize: true });
  const pdf = await PDFDocument.load(pdfBytes);
  expect(pdf.getPageCount()).toBe(1);
});
