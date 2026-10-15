import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createBookExcerpt, type BookRecord } from '../../app/lib/knowledge/bookCorpus';

for (const locale of ['ur', 'en'] as const) {
  const ur = locale === 'ur';
  test(locale + ': focused reader stays separate and sends verified excerpts to My Sermon', async ({ page }) => {
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
          recordSha256: record.textSha256, sourceSha256: source.sha256, screenPartOnly: true, translations: [] }
        : op === 'find' ? { hits: [], total: 0, page: 1, pageSize: 20 } : {};
      return route.fulfill({ json: body });
    });

    await page.goto('/tools/khateeb-studio');
    await page.getByRole('button', { name: ur ? 'اردو' : 'ENG', exact: true }).click();
    const my = ur ? 'میری مجلس / میرا موضوع' : 'My sermon / my topic';
    await page.getByRole('button', { name: my, exact: true }).click();
    const workspace = page.getByTestId('custom-sermon-workspace');
    await workspace.getByRole('textbox', { name: ur ? 'عنوان' : 'Title', exact: true }).fill('Library prayer draft');
    await workspace.getByRole('textbox', { name: ur ? 'اس مجلس کا مقصد' : 'Objective', exact: true }).fill('Hope and responsibility');
    await workspace.getByRole('button', { name: ur ? 'مسودہ شروع کریں' : 'Start draft', exact: true }).click();
    await workspace.getByRole('link', { name: ur ? 'کتاب خانہ کھولیں' : 'Open Book Library', exact: true }).click();

    await expect(page).toHaveURL(/\/tools\/khateeb-studio\/library$/);
    const reader = page.getByTestId('khateeb-book-reader');
    await expect(reader.getByTestId('book-reading-page')).toBeVisible();
    await expect(reader.getByText(paragraphs[0].text)).toBeVisible();
    await expect(page.getByText('Qalam Knowledge Assistant — ask the sources', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Topic preparation — patience', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Book library management — owner only', { exact: true })).toHaveCount(0);
    const desktopWidth = await reader.getByTestId('book-reading-page').evaluate(node => node.getBoundingClientRect().width);
    expect(desktopWidth).toBeGreaterThan(1000);

    await expect(reader.getByRole('checkbox')).toHaveCount(0);
    await reader.getByRole('button', { name: ur ? 'عبارت منتخب کریں' : 'Select passage', exact: true }).click();
    await reader.getByRole('checkbox', { name: ur ? 'پیراگراف 1 منتخب کریں' : 'Select paragraph 1', exact: true }).check();
    await reader.getByRole('button', { name: ur ? 'میری مجلس میں شامل کریں' : 'Add to My Sermon', exact: true }).click();
    await expect(reader.getByRole('status').filter({ hasText: ur ? 'میری مجلس میں شامل اور محفوظ ہوگئی' : 'Saved in My Sermon' })).toBeVisible();

    await page.getByRole('link', { name: ur ? 'مجلس کی تیاری' : 'Sermon preparation', exact: true }).click();
    await page.getByRole('button', { name: my, exact: true }).click();
    const saved = page.getByTestId('custom-sermon-workspace');
    await expect(saved.getByText(ur ? 'مجلس کے محفوظ کتابی اقتباسات' : 'Saved book excerpts in this sermon')).toBeVisible();
    await expect(saved.getByText(paragraphs[0].text)).toBeVisible();
    await expect(saved.getByText(paragraphs[1].text)).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/khateeb-studio/library');
    await expect(page.getByTestId('book-reading-page')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    expect(errors).toEqual([]);
  });
}
