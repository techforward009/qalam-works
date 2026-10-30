import {expect,test,type Page} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import {POST} from '../../app/api/export-pdf/route';
import {PdfExportTestRequest} from '../helpers/pdfExportRequest';
const activeKey='qalam-document-studio-active-document-v1';
async function menu(page:Page,action:string){await page.locator('[data-menu-root="file"]').click();await page.locator(`[data-menu-action="${action}"]`).click();}
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));await page.goto('/tools/document-studio');await expect(page.locator('.ProseMirror')).toBeEditable();await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),activeKey)).not.toBeNull();
});
test('title bars have clean help / close buttons and no wine icon',async({page},info)=>{
 for(const action of ['file.pageSetup','format.paragraph']){
  await page.locator('.ProseMirror').click();await page.locator('[data-menu-root="format"]').click();await page.locator(`[data-menu-action="${action}"]`).click();
  const dialog=page.getByRole('dialog',{name:action==='file.pageSetup'?'Page Setup':'Paragraph Preferences',exact:true});
  await expect(dialog.locator('[data-studio-dialog-drag-handle] svg')).toHaveCount(0);
  const help=dialog.getByRole('button',{name:'Title bar help',exact:true});await expect(help).toHaveText('?');
  const h=(await help.boundingBox())!,x=(await dialog.getByRole('button',{name:'Close',exact:true}).boundingBox())!;expect(Math.abs(h.width-x.width)).toBeLessThan(0.05);expect(Math.abs(h.height-x.height)).toBeLessThan(0.05);
  await help.click();await expect(dialog.locator('[role="status"], [data-studio-paragraph-help]')).toBeVisible();
  if(action==='file.pageSetup')await dialog.screenshot({path:info.outputPath('title-bar.png'),scale:'css'});
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 }
});
test('Close flushes rapid edits, shows no document, and Open / New remain usable',async({page},info)=>{
 const id=await page.evaluate(key=>localStorage.getItem(key),activeKey);await page.locator('.ProseMirror').click();await page.keyboard.insertText('Preserved when closing immediately');
 await menu(page,'file.close');await expect(page.locator('[data-studio-empty-window]')).toBeVisible();await expect(page.locator('[data-studio-open-dialog]')).toHaveCount(0);await expect(page.locator('[data-studio-page-paper]')).toHaveCount(0);await expect(page.locator('.ProseMirror')).toHaveCount(0);
 expect(await page.evaluate(key=>localStorage.getItem(key),activeKey)).toBeNull();await page.locator('[data-studio-root]').screenshot({path:info.outputPath('empty-window.png'),scale:'css'});
 await menu(page,'file.open');await page.locator('[data-studio-open-dialog] [role="option"]').first().dblclick();await expect(page.locator('.ProseMirror')).toContainText('Preserved when closing immediately');expect(await page.evaluate(key=>localStorage.getItem(key),activeKey)).toBe(id);
 await menu(page,'file.close');await expect(page.locator('[data-studio-empty-window]')).toBeVisible();await menu(page,'file.new');await page.getByRole('dialog',{name:'New Document',exact:true}).getByRole('button',{name:'OK',exact:true}).click();await expect(page.locator('.ProseMirror')).toBeEditable();
});
test('a failed save blocks Close and keeps the current document editable',async({page})=>{
 await page.locator('.ProseMirror').click();await page.keyboard.insertText('Do not lose failed-save text');const id=await page.evaluate(key=>localStorage.getItem(key),activeKey);
 await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('Test quota failure','QuotaExceededError');};});
 await menu(page,'file.close');await expect(page.getByRole('alert').filter({hasText:'could not be saved'})).toBeVisible();await expect(page.locator('.ProseMirror')).toBeEditable();await expect(page.locator('.ProseMirror')).toContainText('Do not lose failed-save text');expect(await page.evaluate(key=>localStorage.getItem(key),activeKey)).toBe(id);await expect(page.locator('[data-studio-empty-window]')).toHaveCount(0);
});
test('Exit respects Cancel for unsaved changes and then leaves to home',async({page})=>{
 await page.locator('.ProseMirror').click();await page.keyboard.insertText('Unsaved Exit text');await menu(page,'file.exit');
 const dialog=page.getByRole('dialog',{name:'You have unsaved changes. Leave Qalam Page?',exact:true});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page).toHaveURL(/\/tools\/document-studio/);await expect(page.locator('.ProseMirror')).toContainText('Unsaved Exit text');
 // A clean (autosaved) Exit may leave directly; either route must reach home.
 await menu(page,'file.exit');if(await dialog.count())await dialog.getByRole('button',{name:'Leave',exact:true}).click();await expect(page).toHaveURL('http://localhost:3248/');
});
test('Exit from an empty window navigates directly home',async({page})=>{
 await menu(page,'file.close');await expect(page.locator('[data-studio-empty-window]')).toBeVisible();await menu(page,'file.exit');await expect(page).toHaveURL('http://localhost:3248/');
});
test('Legal follows Folio, fills dimensions, rotates, and exports real Legal paper',async({page})=>{
 test.setTimeout(90000);await page.locator('.ProseMirror').click();await page.keyboard.insertText('Legal paper keeps this text.');await expect(page.locator('.ProseMirror')).toContainText('Legal paper keeps this text.');
 await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="file.pageSetup"]').click();const dialog=page.getByRole('dialog',{name:'Page Setup',exact:true}),select=dialog.getByLabel('Page size',{exact:true});
 const options=await select.locator('option').allTextContents();expect(options.indexOf('Legal 8.5x14"')).toBe(options.indexOf('Folio 8.5x13"')+1);await select.selectOption('legal');await expect(dialog.getByLabel('Width',{exact:true})).toHaveValue('215.9mm');await expect(dialog.getByLabel('Height',{exact:true})).toHaveValue('355.6mm');await dialog.getByLabel('Landscape',{exact:true}).check();await expect(dialog.getByLabel('Width',{exact:true})).toHaveValue('355.6mm');await expect(dialog.getByLabel('Height',{exact:true})).toHaveValue('215.9mm');await dialog.getByRole('button',{name:'OK',exact:true}).click();
 const originalPath=chromium.executablePath,originalLaunch=puppeteer.launch,launch=puppeteer.launch.bind(puppeteer);chromium.executablePath=async()=>process.env.PLAYWRIGHT_CHROMIUM_PATH!;puppeteer.launch=async options=>launch({...options,args:['--no-sandbox']});
 try{await page.route('**/api/export-pdf',async route=>{const response=await POST(new PdfExportTestRequest('http://localhost/api/export-pdf',{method:'POST',body:route.request().postData()!}));expect(response.status).toBe(200);const bytes=Buffer.from(await response.arrayBuffer()),pdf=await PDFDocument.load(bytes),size=pdf.getPage(0).getSize();expect(Math.abs(size.width-1008)).toBeLessThan(2);expect(Math.abs(size.height-612)).toBeLessThan(2);await route.fulfill({status:200,contentType:'application/pdf',body:bytes});});const download=page.waitForEvent('download');await menu(page,'file.downloadPdf');await(await download).saveAs(test.info().outputPath('legal.pdf'));await expect(page.locator('.ProseMirror')).toContainText('Legal paper keeps this text.');}finally{chromium.executablePath=originalPath;puppeteer.launch=originalLaunch;}
});
