import { chromium as playwrightChromium, expect, test } from '@playwright/test';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { POST } from '../../app/api/export-pdf/route';
import { PdfExportTestRequest } from '../helpers/pdfExportRequest';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
test('toolbar styling and geometry reach real server PDF and browser print unchanged', async ({ page }, info) => {
    test.setTimeout(90000);
    await page.addInitScript(() => { localStorage.setItem('qalam-site-language', 'en'); window.print = () => { }; });
    await page.goto('/tools/document-studio');
    await expect(page.locator('.ProseMirror')).toBeEditable();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
    await page.evaluate(() => { const id = localStorage.getItem('qalam-document-studio-active-document-v1')!; localStorage.setItem('qalam-studio-frames-v1', JSON.stringify({ [id]: [{ id: 'export-style', kind: 'rect', page: 1, xMm: 30, yMm: 40, wMm: 70, hMm: 30, text: '', flip: false }] })); });
    await page.reload();
    await expect(page.locator('[data-studio-frame]')).toBeVisible();
    await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
    await page.locator('[data-studio-tool-button="select"]').click();
    await page.locator('[data-studio-frame]').click();
    await page.locator('[data-studio-object-field="xMm"]').fill('35');
    await page.locator('[data-studio-object-field="xMm"]').press('Enter');
    await page.locator('[data-studio-object-field="borderColor"]').selectOption('#FF0000');
    await page.locator('[data-studio-object-field="fill"]').selectOption('#FFFF00');
    await page.locator('[data-studio-object-field="borderWidthPt"]').fill('2');
    await page.locator('[data-studio-object-field="borderWidthPt"]').press('Enter');
    const current = await page.evaluate(() => JSON.parse(localStorage.getItem('qalam-studio-frames-v1')!)[localStorage.getItem('qalam-document-studio-active-document-v1')!]);
    const originalPath = chromium.executablePath, originalLaunch = puppeteer.launch, launch = puppeteer.launch.bind(puppeteer);
    chromium.executablePath = async () => process.env.PLAYWRIGHT_CHROMIUM_PATH || playwrightChromium.executablePath();
    puppeteer.launch = options => launch({ ...options, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
        const body = { doc: { type: 'doc', content: [{ type: 'paragraph' }] }, dir: 'rtl', frames: current };
        const response = await POST(new PdfExportTestRequest('http://localhost/api/export-pdf', { method: 'POST', body: JSON.stringify(body) }));
        expect(response.status, response.status === 200 ? 'PDF' : await response.text()).toBe(200);
        const server = info.outputPath('server.pdf');
        writeFileSync(server, Buffer.from(await response.arrayBuffer()));
        await page.locator('[data-menu-root="file"]').click();
        await page.locator('[data-menu-action="file.print"]').click();
        const portal = page.locator('[data-studio-print-portal]');
        await expect(portal.locator('[data-print-frame]')).toHaveCount(1);
        expect(await portal.locator('[data-print-frame]').evaluate(el => Math.abs(parseFloat(getComputedStyle(el).left) - 35 * 96 / 25.4))).toBeLessThan(0.01);
        const browser = info.outputPath('browser.pdf');
        await page.pdf({ path: browser, preferCSSPageSize: true, printBackground: true });
        for (const file of [server, browser]) {
            const prefix = file.slice(0, -4);
            execFileSync('pdftoppm', ['-f', '1', '-singlefile', '-r', '96', '-png', file, prefix]);
            const { data, info: image } = await sharp(prefix + '.png').removeAlpha().raw().toBuffer({ resolveWithObject: true });
            const pixel = (x: number, y: number) => { const i = (Math.round(y) * image.width + Math.round(x)) * 3; return [...data.subarray(i, i + 3)]; };
            const mm = 96 / 25.4;
            const red = pixel(35 * mm + 2, 50 * mm), yellow = pixel(50 * mm, 50 * mm);
            expect(red[0]).toBeGreaterThan(200);
            expect(red[1]).toBeLessThan(60);
            expect(red[2]).toBeLessThan(60);
            expect(yellow[0]).toBeGreaterThan(200);
            expect(yellow[1]).toBeGreaterThan(200);
            expect(yellow[2]).toBeLessThan(60);
        }
    }
    finally {
        chromium.executablePath = originalPath;
        puppeteer.launch = originalLaunch;
    }
});
