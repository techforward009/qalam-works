import {test,expect,type Page} from '@playwright/test';
import sharp from 'sharp';
import type {Editor} from '@tiptap/core';
export const sample='السلام علیکم و رحمۃ اللہ و برکاتہ';
async function open(page:Page){await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));await page.goto('/tools/document-studio');await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();await page.locator('.ProseMirror').click();await page.keyboard.insertText(sample);}
async function character(page:Page){await page.locator('.ProseMirror').click();await page.locator('[data-menu-root="edit"]').click();await page.locator('[data-menu-action="edit.selectAll"]').click();await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="format.character"]').click();return page.getByRole('dialog',{name:'Character',exact:true});}
test('checkbox ticks toggle visibly and reflect saved selected formatting',async({page})=>{
 await open(page);let dialog=await character(page);
 for(const name of ['Bold','Italics','Outline']){const box=dialog.getByRole('checkbox',{name,exact:true}),tick=box.locator('..').locator('[data-character-tick]');await box.check();await expect(tick).toBeVisible();await box.uncheck();await expect(tick).toBeHidden();await box.check();}
 await dialog.getByRole('button',{name:'OK',exact:true}).click();dialog=await character(page);
 for(const name of ['Bold','Italics','Outline']){const box=dialog.getByRole('checkbox',{name,exact:true});await expect(box).toBeChecked();await expect(box.locator('..').locator('[data-character-tick]')).toBeVisible();}
});
test('numeric Spin fields are centred in their unchanged field frames',async({page})=>{
 await open(page);const dialog=await character(page);
 for(const label of ['Spacing','Scaling','Baseline Shift']){
  const input=dialog.getByLabel(label,{exact:true}),frame=input.locator('..');
  const a=(await input.boundingBox())!,b=(await frame.boundingBox())!;
  expect(Math.abs(a.y+a.height/2-b.y-b.height/2)).toBeLessThan(.3);
 }
});
test('classic dialog chrome cannot be selected; editable text keeps native Ctrl+A',async({page})=>{
 await open(page);
 for(const [menu,action,name] of [['format','format.character','Character'],['format','format.paragraph','Paragraph Preferences'],['format','file.pageSetup','Page Setup'],['file','file.new','New Document']] as const){
  await page.locator('.ProseMirror').click();await page.locator(`[data-menu-root="${menu}"]`).click();await page.locator(`[data-menu-action="${action}"]`).click();
  const dialog=page.getByRole('dialog',{name,exact:true}),button=dialog.getByRole('button',{name:'Cancel',exact:true});
  await expect(button).toHaveCSS('user-select','none');
  const input=dialog.locator('input:not([type="checkbox"]):not([type="radio"])').first();await expect(input).toHaveCSS('user-select','text');
  await button.focus();const before=await page.evaluate(()=>window.getSelection()?.toString());await page.keyboard.press('ControlOrMeta+A');expect(await page.evaluate(()=>window.getSelection()?.toString())).toBe(before);
  const b=(await button.boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(40,400,{steps:8});await page.mouse.up();expect(await page.evaluate(()=>window.getSelection()?.toString())).toBe(before);
  await button.click();
 }
 await page.locator('.ProseMirror').click();await page.keyboard.press('ControlOrMeta+f');
 const panel=page.locator('[data-studio-find-ui]');await expect(panel.getByRole('button').first()).toHaveCSS('user-select','none');
 const input=panel.locator('input').first();await input.fill('searchable');await input.press('ControlOrMeta+A');expect(await input.evaluate(el=>[ (el as HTMLInputElement).selectionStart,(el as HTMLInputElement).selectionEnd])).toEqual([0,10]);
});

test('outlined glyph ink remains visible while selected',async({page})=>{
 await open(page);const dialog=await character(page);await dialog.getByLabel('Size',{exact:true}).fill('30pt');await dialog.getByRole('checkbox',{name:'Outline',exact:true}).check();await dialog.getByRole('button',{name:'OK',exact:true}).click();
 await expect(page.locator('[data-studio-line-selection]').first()).toBeVisible();
 const clip=await page.locator('.ProseMirror p').first().boundingBox();
 async function dark(){const {data}=await sharp(await page.screenshot({clip:clip!,scale:'css'})).removeAlpha().raw().toBuffer({resolveWithObject:true});let n=0;for(let i=0;i<data.length;i+=3)if(data[i]<100&&data[i+1]<100&&data[i+2]<100)n++;return n;}
 const selected=await dark();await page.keyboard.press('ArrowLeft');await expect(page.locator('[data-studio-line-selection]')).toHaveCount(0);const ordinary=await dark();expect(ordinary).toBeGreaterThan(100);expect(selected/ordinary).toBeGreaterThan(.75);
});
test('baseline UI signs match InPage and selected shifted text fits its growing band',async({page},info)=>{
 await open(page);
 for(const [ui,stored] of [['-10pt','10'],['10pt','-10']] as const){
  const dialog=await character(page);await dialog.getByLabel('Size',{exact:true}).fill('30pt');await dialog.getByLabel('Baseline Shift',{exact:true}).fill(ui);await dialog.getByRole('button',{name:'OK',exact:true}).click();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const mark=page.locator('.ProseMirror [data-baseline]').first();await expect(mark).toHaveAttribute('data-baseline',stored);
  expect(await mark.evaluate(el=>parseFloat(getComputedStyle(el).top))).toBeCloseTo(-Number(stored)*96/72,1);
  await expect.poll(async()=>{const ink=await mark.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const b=r.getBoundingClientRect();return{top:b.top,bottom:b.bottom};}),boxes=await page.locator('[data-studio-line-selection]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom};}));return boxes.some(b=>b.top<=ink.top+1&&b.bottom>=ink.bottom-1);}).toBe(true);
  if(ui==='10pt')await page.screenshot({path:info.outputPath('baseline-selected.png'),scale:'css'});
 }
});
