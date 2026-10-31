import {test,expect,type Page} from '@playwright/test';
import type {Editor} from '@tiptap/core';
export const sample='السلام علیکم و رحمۃ اللہ و برکاتہ';
async function open(page:Page){await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));await page.goto('/tools/document-studio');await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();await page.locator('.ProseMirror').click();await page.keyboard.insertText(sample);}
async function character(page:Page){await page.locator('.ProseMirror').click();await page.keyboard.press('ControlOrMeta+A');await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="format.character"]').click();return page.getByRole('dialog',{name:'Character',exact:true});}
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
