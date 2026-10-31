import {test,expect} from '@playwright/test';
import type {Editor} from '@tiptap/core';
for(const selected of [false,true])test(`classic text menu with ${selected?'selected text':'no selection'}`,async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));await page.goto('/tools/document-studio');await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1')),{timeout:15000}).not.toBeNull();const story=page.locator('.ProseMirror');await story.click();await page.keyboard.insertText('یہ سیاقی مینو کی عبارت ہے');if(selected)await page.keyboard.press('Control+a');
 const p=story.locator('p').first(),size=await p.boundingBox();await p.click({button:'right',position:{x:size!.width-12,y:10}});const menu=page.getByRole('menu',{name:'Text context menu',exact:true});await expect(menu).toBeVisible();
 expect(await menu.getByRole('menuitem').allTextContents()).toEqual(['Zoom▸','Import…','Select All',...(selected?['Cut','Copy','Clear']:[]),'Paste','Character…','Paragraph…',selected?'Text To Table…':'Table…']);
 await expect(menu.getByRole('menuitem',{name:selected?'Text To Table…':'Table…',exact:true})).toBeDisabled();for(const name of ['Cut','Copy','Clear'])if(selected)await expect(menu.getByRole('menuitem',{name,exact:true})).toBeEnabled();else await expect(menu.getByRole('menuitem',{name,exact:true})).toHaveCount(0);
 expect(await menu.evaluate(el=>[...el.children].every((node,i,all)=>node.getAttribute('role')!=='separator'||(i>0&&i<all.length-1&&all[i-1].getAttribute('role')!=='separator'&&all[i+1].getAttribute('role')!=='separator')))).toBe(true);
 const first=menu.getByRole('menuitem').first();await expect(first).toHaveCSS('font-size','11px');expect(await first.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThanOrEqual(20);
 await first.click();const zoom=page.getByRole('menu',{name:'Zoom',exact:true});await expect(zoom).toBeVisible();expect(await zoom.getByRole('menuitem').allTextContents()).toEqual(['50%','75%','100%','200%','300%','Fit width','Fit page']);
 for(const popup of [menu,zoom]){const b=await popup.boundingBox();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.y).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);expect(b!.y+b!.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);}
 if(selected&&info.project.name==='desktop-chrome')await page.screenshot({path:info.outputPath('classic-text-context-menu.png'),scale:'css'});
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(menu).toBeHidden();
});
