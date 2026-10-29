import { expect, test } from '@playwright/test';
import type { Editor } from '@tiptap/core';
import { PDFDocument } from 'pdf-lib';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { POST } from '../../app/api/export-pdf/route';
import { PdfExportTestRequest } from '../helpers/pdfExportRequest';
test('Page Setup geometry reaches the real downloaded PDF without replacing story content', async ({page},info)=>{
  test.setTimeout(90000);
  await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));await page.goto('/tools/document-studio');await expect(page.locator('.ProseMirror')).toBeEditable();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await page.locator('.ProseMirror').click();await page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement & {editor:Editor}).editor.commands.setContent('<p dir="ltr"><span style="font-family:Inter">Preserve this page setup test.</span></p>'));
  const before=await page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement & {editor:Editor}).editor.getJSON());
  await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="file.pageSetup"]').click();
  const setup=page.getByRole('dialog',{name:'Page Setup',exact:true});await setup.getByLabel('Page size',{exact:true}).selectOption('a5');await setup.getByLabel('Landscape',{exact:true}).check();await setup.getByRole('button',{name:'OK',exact:true}).click();
  const originalPath=chromium.executablePath,originalLaunch=puppeteer.launch,launch=puppeteer.launch.bind(puppeteer);
  chromium.executablePath=async()=>process.env.PLAYWRIGHT_CHROMIUM_PATH!;
  puppeteer.launch=async options=>launch({...options,args:['--no-sandbox','--disable-setuid-sandbox']});
  try{
    await page.route('**/api/export-pdf',async route=>{
      const body=route.request().postDataJSON();expect(body.settings.page.size).toBe('a5');expect(body.settings.page.orientation).toBe('landscape');
      const response=await POST(new PdfExportTestRequest('http://localhost/api/export-pdf',{method:'POST',body:route.request().postData()!,headers:{'content-type':'application/json'}}));
      expect(response.status,response.status===200?'real PDF':await response.text()).toBe(200);
      const data=Buffer.from(await response.arrayBuffer()),pdf=await PDFDocument.load(data),size=pdf.getPage(0).getSize();
      expect(Math.abs(size.width-210*72/25.4)).toBeLessThan(2);expect(Math.abs(size.height-148*72/25.4)).toBeLessThan(2);
      await info.attach('page-size',{body:JSON.stringify(size),contentType:'application/json'});
      await route.fulfill({status:200,contentType:'application/pdf',body:data});
    });
    const downloading=page.waitForEvent('download');await page.locator('[data-menu-root="file"]').click();await page.locator('[data-menu-action="file.downloadPdf"]').click();await(await downloading).saveAs(info.outputPath('page-setup.pdf'));
    expect(await page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement & {editor:Editor}).editor.getJSON())).toEqual(before);
  }finally{chromium.executablePath=originalPath;puppeteer.launch=originalLaunch;}
});
