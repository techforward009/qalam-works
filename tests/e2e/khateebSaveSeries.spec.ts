import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const locale of ['ur','en'] as const) {
 const ur=locale==='ur';
 const my=ur?'میری مجلس / میرا موضوع':'My sermon / my topic';
 test(`${locale}: immediate save, restore, collision-safe backup, copy and custom print`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/tools/khateeb-studio');
  await page.getByRole('button',{name:ur?'اردو':'ENG',exact:true}).click();
  await page.getByRole('button',{name:my,exact:true}).click();
  const workspace=page.getByTestId('custom-sermon-workspace');
  await workspace.getByRole('textbox',{name:ur?'عنوان':'Title',exact:true}).fill('Saved patience draft');
  await workspace.getByRole('textbox',{name:ur?'اس مجلس کا مقصد':'Objective',exact:true}).fill('Responsibility and patience');
  await workspace.getByRole('button',{name:ur?'مسودہ شروع کریں':'Start draft',exact:true}).click();
  const core=()=>workspace.getByRole('textbox',{name:ur?'میرا بنیادی مواد':'My core material',exact:true});
  await core().fill('Latest notes before reload');
  await page.reload();await page.getByRole('button',{name:my,exact:true}).click();await expect(core()).toHaveValue('Latest notes before reload');
  const downloadPromise=page.waitForEvent('download');await workspace.getByRole('button',{name:ur?'محفوظ فائل بنائیں':'Export',exact:true}).click();const backup=await downloadPromise;const backupBytes=await readFile((await backup.path())!);
  await core().fill('Newer notes must survive');
  await workspace.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:backupBytes});
  await expect(workspace.getByText(ur?'محفوظ فائل بحال ہوگئی۔ مختلف نسخے الگ محفوظ ہیں۔':'Backup restored. Different versions are kept as separate drafts.')).toBeVisible();
  await expect(workspace.getByRole('button',{name:ur?'حذف کریں':'Delete',exact:true})).toHaveCount(2);
  await expect(core()).toHaveValue('Latest notes before reload');
  await workspace.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:backupBytes});
  await expect(workspace.getByRole('button',{name:ur?'حذف کریں':'Delete',exact:true})).toHaveCount(2);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copyTestText=text;}}}));
  await workspace.getByRole('button',{name:ur?'مکمل مسودہ نقل کریں':'Copy full draft',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).copyTestText)).toContain('Latest notes before reload');
  await page.evaluate(()=>{window.print=()=>{(window as any).printed=true;};});
  await workspace.getByRole('button',{name:ur?'مسودہ پرنٹ کریں / PDF محفوظ کریں':'Print draft / Save PDF',exact:true}).click();
  await page.emulateMedia({media:'print'});await expect(page.locator('#khateeb-custom-print-area')).toBeVisible();expect(await page.locator('#khateeb-custom-print-area').innerText()).toContain('Latest notes before reload');await expect(page.locator('#khateeb-print-area')).not.toBeVisible();
  const pdf=await page.pdf({format:'A4',printBackground:true});expect(pdf.length).toBeGreaterThan(5000);
  await page.emulateMedia({media:'screen'});expect(errors).toEqual([]);
 });
 test(`${locale}: complete patience series copies and prints every session`,async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/tools/khateeb-studio?step=3&topic=sabr&series=3&duration=30');await page.getByRole('button',{name:ur?'اردو':'ENG',exact:true}).click();
  await expect(page.getByTestId('prepared-session-3')).toBeVisible();
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copyTestText=text;}}}));
  for(const duration of [20,30,45]) {
   await page.getByRole('button',{name:new RegExp(`^${duration}\\s*${ur?'منٹ':'min'}$`)}).click();
   await page.getByRole('button',{name:ur?'نئی تشکیل نقل کریں':'Copy fresh composition',exact:true}).click();
   const text=await page.evaluate(()=>(window as any).copyTestText as string);expect(text).toContain('2:156');expect(text).toContain('103:3');expect(text).toContain(ur?'قابلِ بیان عبارت':'Ready-to-deliver paragraph');
   for(let n=1;n<=3;n++)expect(text).toContain(`${ur?'مجلس':'Session'} ${n} —`);
  }
  await page.getByTestId('prepared-session-2').getByRole('button',{name:ur?'اس مجلس کی مکمل تیاری نقل کریں':'Copy full session preparation',exact:true}).click();expect(await page.evaluate(()=>(window as any).copyTestText)).toContain('1625');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
  await page.getByTestId('prepared-session-3').getByRole('button',{name:ur?'اس مجلس کی مکمل تیاری نقل کریں':'Copy full session preparation',exact:true}).click();
  const area=page.getByRole('textbox',{name:ur?'نقل کے لیے مکمل متن':'Full text for copying'});await expect(area).toBeVisible();expect(await area.inputValue()).toContain('103:3');expect(await area.evaluate((el:HTMLTextAreaElement)=>el.selectionEnd-el.selectionStart)).toBe((await area.inputValue()).length);await area.press('Escape');
  await page.evaluate(()=>{window.print=()=>{};});await page.getByRole('button',{name:ur?'مجلس پرنٹ کریں / PDF محفوظ کریں':'Print / Save PDF',exact:true}).click();await page.emulateMedia({media:'print'});
  await expect(page.getByTestId('prepared-session-1')).toBeVisible();await expect(page.getByTestId('prepared-session-3')).toBeVisible();await expect(page.getByTestId('prepared-session-3').getByRole('button')).not.toBeVisible();
  await page.pdf({path:testInfo.outputPath(`sabr-${locale}.pdf`),format:'A4',printBackground:true});await page.emulateMedia({media:'screen'});expect(errors).toEqual([]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);expect(overflow).toBe(false);
 });
}
