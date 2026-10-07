import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
const packagePath = process.env.QALAM_KAFI_CORPUS_TEST_ZIP;
test.skip(!packagePath, 'Requires the prepared combined corpus');
for (const locale of ['ur', 'en'] as const) for (const fail of [false, true]) test(`${locale}: large corpus upload ${fail ? 'failure preserves catalog' : 'completes sources then activates'}`, async ({ page }) => {
  const ur = locale === 'ur'; const errors: string[] = []; const uploaded = new Set<string>(); let activated = false;
  page.on('pageerror', error => errors.push(error.message));
  const bytes = await readFile(packagePath!); const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
  await page.route('**/api/research/auth', route => route.fulfill({ json: { authenticated: true } }));
  await page.route('**/api/khateeb/library**', route => route.fulfill({ json: { ready: false, sources: [], recordCount: 0 } }));
  await page.route('**/api/research/book-library?op=*', async route => {
    const req = route.request(); const body = req.postDataBuffer()!;
    expect(body.byteLength).toBeLessThan(1_000_000);
    if (req.url().includes('op=source')) {
      if (fail) return route.fulfill({ status: 503, json: { code: 'unavailable' } });
      const form = await new Response(new Uint8Array(body), { headers: { 'Content-Type': req.headers()['content-type'] } }).formData();
      const id = String(form.get('sourceId')); const source = form.get('source') as File;
      const data = new Uint8Array(await source.arrayBuffer()); const plan = JSON.parse(String(form.get('plan')));
      expect(plan.digests[id]).toBe(createHash('sha256').update(data).digest('hex'));
      expect(Buffer.from(data)).toEqual(await zip.file(`${id}.json.gz`)!.async('nodebuffer'));
      uploaded.add(id); return route.fulfill({ json: { stored: true } });
    }
    expect(uploaded.size).toBe(15); activated = true;
    return route.fulfill({ json: { ready: true, sources: manifest.sources, recordCount: 4978 } });
  });
  await page.goto('/tools/khateeb-studio');
  await page.getByRole('button', { name: ur ? 'اردو' : 'ENG', exact: true }).click();
  await page.getByRole('button', { name: ur ? 'کتابی ذخیرہ' : 'Book library', exact: true }).click();
  await page.getByText(ur ? 'کتابی ذخیرے کا انتظام — مالک کے لیے' : 'Book library management — owner only', { exact: true }).click();
  await page.getByLabel(ur ? 'کتابی ذخیرے کی ZIP فائل' : 'Book corpus ZIP', { exact: true }).setInputFiles({ name: 'corpus.zip', mimeType: 'application/zip', buffer: bytes });
  const panel = page.getByTestId('book-library');
  if (fail) { await expect(panel.getByRole('alert')).toBeVisible(); expect(activated).toBe(false); await expect(panel.getByRole('form')).toHaveCount(0); }
  else { await expect(panel).toContainText(ur ? 'کتابی ذخیرہ نجی طور پر محفوظ ہوگیا۔' : 'The book corpus was saved privately.'); expect(activated).toBe(true); await expect(panel.getByRole('combobox', { name: ur ? 'کتاب' : 'Book', exact: true })).toBeVisible(); }
  expect(errors).toEqual([]);
});
