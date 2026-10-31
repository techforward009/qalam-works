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
