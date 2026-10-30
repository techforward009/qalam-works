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
  const setup=page.getByRole('dialog',{name:'Page Setup',exact:true});await setup.getByLabel('Page size',{exact:true}).selectOption('b5');await setup.getByLabel('Landscape',{exact:true}).check();await setup.getByLabel('left margin',{exact:true}).fill('15mm');await setup.getByLabel('right margin',{exact:true}).fill('20mm');await setup.getByLabel('top margin',{exact:true}).fill('18mm');await setup.getByLabel('bottom margin',{exact:true}).fill('22mm');await setup.getByRole('button',{name:'OK',exact:true}).click();
  const originalPath=chromium.executablePath,originalLaunch=puppeteer.launch,launch=puppeteer.launch.bind(puppeteer);
  chromium.executablePath=async()=>process.env.PLAYWRIGHT_CHROMIUM_PATH!;
  puppeteer.launch=async options=>launch({...options,args:['--no-sandbox','--disable-setuid-sandbox']});
  try{
    await page.route('**/api/export-pdf',async route=>{
      const body=route.request().postDataJSON();expect(body.settings.page.customSizeMm).toEqual({widthMm:176,heightMm:250});expect(body.settings.page.margins[body.dir==='rtl'?'endMm':'startMm']).toBe(15);expect(body.settings.page.margins[body.dir==='rtl'?'startMm':'endMm']).toBe(20);expect(body.settings.page.margins.topMm).toBe(18);expect(body.settings.page.margins.bottomMm).toBe(22);expect(body.settings.page.orientation).toBe('landscape');
      const response=await POST(new PdfExportTestRequest('http://localhost/api/export-pdf',{method:'POST',body:route.request().postData()!,headers:{'content-type':'application/json'}}));
      expect(response.status,response.status===200?'real PDF':await response.text()).toBe(200);
      const data=Buffer.from(await response.arrayBuffer()),pdf=await PDFDocument.load(data),size=pdf.getPage(0).getSize();
      expect(Math.abs(size.width-250*72/25.4)).toBeLessThan(2);expect(Math.abs(size.height-176*72/25.4)).toBeLessThan(2);
      const {writeFileSync}=await import('node:fs');const {execFileSync}=await import('node:child_process');
      const file=info.outputPath('page-setup-inspected.pdf');writeFileSync(file,data);
      const bbox=execFileSync('pdftotext',['-bbox',file,'-'],{encoding:'utf8'});
      const word=bbox.match(/<word xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>Preserve<\/word>/);expect(word,'actual authored text must remain in the PDF').not.toBeNull();
      expect(Math.abs(Number(word![1])-15*72/25.4)).toBeLessThan(3);
      expect(Number(word![2])).toBeGreaterThanOrEqual(18*72/25.4-.5);
      execFileSync('pdftoppm',['-f','1','-singlefile','-r','96','-png',file,info.outputPath('page-setup-pdf')]);
      await info.attach('page-size',{body:JSON.stringify(size),contentType:'application/json'});
      await route.fulfill({status:200,contentType:'application/pdf',body:data});
    });
    const downloading=page.waitForEvent('download');await page.locator('[data-menu-root="file"]').click();await page.locator('[data-menu-action="file.downloadPdf"]').click();await(await downloading).saveAs(info.outputPath('page-setup.pdf'));
    expect(await page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement & {editor:Editor}).editor.getJSON())).toEqual(before);
  }finally{chromium.executablePath=originalPath;puppeteer.launch=originalLaunch;}
});
