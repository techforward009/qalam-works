import { test, expect } from '@playwright/test';

for (const locale of ['ur', 'en'] as const) {
  const ur = locale === 'ur';
  test(`${locale}: complete five-session prayer preparation, copy fallback and print`, async ({page}, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/tools/khateeb-studio?step=3&topic=dua&series=5&duration=30');
    await page.getByRole('button', {name: ur ? 'اردو' : 'ENG', exact: true}).click();
    await expect(page.getByTestId('prepared-session-5')).toBeVisible();
    for (let n = 1; n <= 5; n++) {
      const session = page.getByTestId(`prepared-session-${n}`);
      await expect(session.locator('h5')).toHaveCount(5);
      await expect(session.getByRole('button', {name: ur ? 'اس مجلس کی مکمل تیاری نقل کریں' : 'Copy full session preparation'})).toBeVisible();
    }
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async (text: string) => {(window as any).copyTestText = text;}}}));
    for (const duration of [20, 30, 45]) {
      await page.getByRole('button', {name: new RegExp(`^${duration}\\s*${ur ? 'منٹ' : 'min'}$`)}).click();
      await page.getByRole('button', {name: ur ? 'نئی تشکیل نقل کریں' : 'Copy fresh composition', exact: true}).click();
      const text = await page.evaluate(() => (window as any).copyTestText as string);
      for (let n = 1; n <= 5; n++) expect(text).toContain(`${ur ? 'مجلس' : 'Session'} ${n} —`);
      expect(text).toContain('2:216');
      expect(text).toContain('21:84');
      expect(text).toContain('وَ أَجْرِ لِلنَّاسِ عَلَى يَدِيَ الْخَيْرَ');
      expect(text).toContain('sahifa-al-kamilah-al-sajjadiyya');
      expect(text).toContain(ur ? 'تدوینی ترجمہ' : 'editorial translation');
      const expectedMinutes = duration === 20 ? [3, 4, 5, 5, 3] : duration === 30 ? [4, 6, 8, 8, 4] : [5, 10, 12, 12, 6];
      for (let n = 1; n <= 5; n++) {
        const headings = await page.getByTestId(`prepared-session-${n}`).locator('h5').allTextContents();
        expect(headings.map(h => Number(h.match(/—\s*(\d+)/)![1]))).toEqual(expectedMinutes);
      }
    }
    const fifth = page.getByTestId('prepared-session-5');
    await expect(fifth.locator('[lang="ar"]')).toHaveCount(4);
    await fifth.getByRole('button', {name: ur ? 'اس مجلس کی مکمل تیاری نقل کریں' : 'Copy full session preparation'}).click();
    const individual = await page.evaluate(() => (window as any).copyTestText as string);
    expect(individual).toContain(`${ur ? 'مجلس' : 'Session'} 5 —`);
    expect(individual).not.toContain(`${ur ? 'مجلس' : 'Session'} 1 —`);
    expect(individual).toContain('2:201');
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async () => {throw Error('denied');}}}));
    await page.getByRole('button', {name: ur ? 'نئی تشکیل نقل کریں' : 'Copy fresh composition', exact: true}).click();
    const fallback = page.getByRole('textbox', {name: ur ? 'نقل کے لیے مکمل متن' : 'Full text for copying'});
    await expect(fallback).toBeVisible();
    const fallbackText = await fallback.inputValue();
    expect(fallbackText).toContain(`${ur ? 'مجلس' : 'Session'} 5 —`);
    expect(await fallback.evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart)).toBe(fallbackText.length);
    await fallback.press('Escape');
    await page.evaluate(() => {window.print = () => {};});
    await page.getByRole('button', {name: ur ? 'مجلس پرنٹ کریں / PDF محفوظ کریں' : 'Print / Save PDF', exact: true}).click();
    await page.emulateMedia({media: 'print'});
    for (let n = 1; n <= 5; n++) {
      await expect(page.getByTestId(`prepared-session-${n}`)).toBeVisible();
      await expect(page.getByTestId(`prepared-session-${n}`).getByRole('button')).not.toBeVisible();
    }
    const pdf = await page.pdf({path: testInfo.outputPath(`dua-${locale}.pdf`), format: 'A4', printBackground: true});
    expect(pdf.length).toBeGreaterThan(10000);
    await page.emulateMedia({media: 'screen'});
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    expect(errors).toEqual([]);
    await page.reload();
    await expect(page.getByTestId('prepared-session-5')).toBeVisible();
    await expect(page.getByRole('button', {name: new RegExp(`^45\\s*${ur ? 'منٹ' : 'min'}$`)})).toBeVisible();
    // A different series length must not accidentally keep the five-session material.
    await page.getByRole('button', {name: ur ? /سہ روزہ مجالس/ : /3-session series/}).click();
    await expect(page.getByTestId('prepared-session-5')).toHaveCount(0);
    await page.getByRole('button', {name: ur ? /خمسہ مجالس/ : /5-session series/}).click();
    await expect(page.getByTestId('prepared-session-5')).toBeVisible();
  });
}
