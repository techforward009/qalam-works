import {test,expect,type Page} from '@playwright/test';
import type {Editor} from '@tiptap/core';
const story='.ProseMirror';
async function open(page:Page,width=1280,height=1080){
 await page.setViewportSize({width,height});await page.addInitScript(()=>{if(!localStorage.getItem('qalam-site-language'))localStorage.setItem('qalam-site-language','en');});await page.goto('/tools/document-studio');
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();await expect(page.locator(story)).toBeFocused();
}
async function settle(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))));}
async function all(page:Page){await page.locator(story).evaluate(el=>(el as HTMLElement&{editor:Editor}).editor.commands.selectAll());}
async function menu(page:Page){
 const p=page.locator(`${story} p`).first();const size=await p.boundingBox();if(!size)throw new Error('Missing paragraph');const rtl=await p.evaluate(el=>getComputedStyle(el).direction==='rtl');
 await p.click({button:'right',position:{x:rtl?size.width-12:12,y:Math.min(size.height-2,10)}});
 await expect(page.getByRole('menu',{name:'Text context menu',exact:true})).toBeVisible();return page.getByRole('menu',{name:'Text context menu',exact:true});
}
async function visibleCaret(page:Page){await expect.poll(()=>page.evaluate(()=>{
 const c=document.querySelector('[data-studio-caret]')?.getBoundingClientRect(),s=document.querySelector('[data-studio-scroller]')!.getBoundingClientRect();return !!c&&c.left>=s.left-1&&c.right<=s.right+1&&c.top>=s.top-1&&c.bottom<=s.bottom+1;
})).toBe(true);}

test('F6/F7/F8 zoom is scoped to Qalam Page',async({page})=>{
 await open(page);await page.keyboard.insertText('السلام علیکم');await settle(page);
 for(const [key,value] of [['F6','50'],['F7','100'],['F8','200']]){await page.keyboard.press(key);await expect(page.locator('[data-studio-print-root]')).toHaveAttribute('data-studio-zoom',value);await visibleCaret(page);}
 await page.goto('/');expect(await page.evaluate(()=>{const e=new KeyboardEvent('keydown',{key:'F6',bubbles:true,cancelable:true});document.body.dispatchEvent(e);return e.defaultPrevented;})).toBe(false);
});
for(const zoom of ['200','300'])test(`${zoom}% preserves caret, line selection and crisp guide geometry`,async({page})=>{
 await open(page);await page.keyboard.insertText('السلام علیکم');await page.keyboard.press('Enter');await page.keyboard.insertText('گھر کا کام');await page.locator('[data-studio-zoom-control]').selectOption(zoom);await settle(page);await visibleCaret(page);
 await expect.poll(()=>page.evaluate(()=>{
  const c=document.querySelector('[data-studio-caret]')?.getBoundingClientRect(),g=document.querySelector('[data-studio-margin-guide="1"]')!,r=g.querySelector('[data-studio-margin-line="right"]')!.getBoundingClientRect(),l=g.querySelector('[data-studio-margin-line="left"]')!.getBoundingClientRect();
  return !!c&&Math.abs(c.width-2)<.2&&c.right<=r.left+1&&c.left>=l.right-1&&Math.abs(r.left*devicePixelRatio-Math.round(r.left*devicePixelRatio))<.2&&Math.abs(l.left*devicePixelRatio-Math.round(l.left*devicePixelRatio))<.2;
 })).toBe(true);
 await all(page);await expect(page.locator('[data-studio-line-selection]')).toHaveCount(2);await settle(page);
 const data=await page.locator('[data-studio-line-selection]').evaluateAll(xs=>xs.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};}).sort((a,b)=>a.top-b.top));
 expect(Math.abs(data[1].top-data[0].bottom)).toBeLessThanOrEqual(1);
 expect(data[0].height).toBeCloseTo(26.4*Number(zoom)/100,0);
});

test('zoom retains an offscreen caret and the current selection',async({page})=>{
 await open(page);await page.keyboard.insertText(Array(65).fill('یہ اردو کی سطر ہے').join('\n'));await page.keyboard.press('Control+End');await settle(page);await visibleCaret(page);
 await page.keyboard.press('F8');await visibleCaret(page);await page.locator('[data-studio-zoom-control]').selectOption('300');await visibleCaret(page);
 await page.locator(story).evaluate(el=>{const e=(el as HTMLElement&{editor:Editor}).editor;const end=e.state.selection.head;e.commands.setTextSelection({from:Math.max(1,end-5),to:end});});
 const selection=await page.locator(story).evaluate(el=>{const s=(el as HTMLElement&{editor:Editor}).editor.state.selection;return {from:s.from,to:s.to};});
 await page.locator('[data-studio-zoom-control]').selectOption('200');await settle(page);
 expect(await page.locator(story).evaluate(el=>{const s=(el as HTMLElement&{editor:Editor}).editor.state.selection;return {from:s.from,to:s.to};})).toEqual(selection);
 await expect.poll(()=>page.evaluate(()=>{
  const e=(document.querySelector('.ProseMirror') as HTMLElement&{editor:Editor}).editor,c=e.view.coordsAtPos(e.state.selection.head),v=document.querySelector('[data-studio-scroller]')!.getBoundingClientRect();return c.left>=v.left-1&&c.left<=v.right+1&&c.top>=v.top-1&&c.bottom<=v.bottom+1;
 })).toBe(true);
});

test('context items stay ordered, disabled correctly and keyboard navigable',async({page})=>{
 await open(page);await page.keyboard.insertText('Some selected text');await settle(page);let m=await menu(page);
 expect(await m.getByRole('menuitem').allTextContents()).toEqual(['Zoom▸','Import…','Select All','Cut','Copy','Clear','Paste','Character…','Paragraph…','Text To Table…']);
 await expect(m.getByRole('menuitem',{name:'Cut',exact:true})).toBeDisabled();await expect(m.getByRole('menuitem',{name:'Copy',exact:true})).toBeDisabled();await expect(m.getByRole('menuitem',{name:'Clear',exact:true})).toBeDisabled();await expect(m.getByRole('menuitem',{name:'Text To Table…',exact:true})).toBeDisabled();
 await page.keyboard.press('ArrowDown');await expect(m.getByRole('menuitem',{name:'Import…',exact:true})).toBeFocused();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowRight');
 const sub=page.getByRole('menu',{name:'Zoom',exact:true});await expect(sub).toBeVisible();await expect(sub.getByRole('menuitem',{name:'50%',exact:true})).toBeFocused();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('[data-studio-print-root]')).toHaveAttribute('data-studio-zoom','75');
 await settle(page);m=await menu(page);await m.getByRole('menuitem',{name:'Select All',exact:true}).click();m=await menu(page);for(const name of ['Cut','Copy','Clear'])await expect(m.getByRole('menuitem',{name,exact:true})).toBeEnabled();await page.keyboard.press('Escape');await expect(m).toBeHidden();
});
for(const width of [390,1280])test(`text and zoom menus fit the ${width}px viewport and close on scroll/outside click`,async({page})=>{
 await open(page,width,850);await page.keyboard.insertText('یہ مینو کی جانچ ہے');await page.locator('[data-studio-zoom-control]').selectOption('100');await settle(page);
 // Dispatch on the text surface at the viewport edge to test popup clamping.
 await page.locator(story).evaluate((el,width)=>el.dispatchEvent(new MouseEvent('contextmenu',{clientX:width-3,clientY:765,bubbles:true,cancelable:true})),width);const m=page.getByRole('menu',{name:'Text context menu',exact:true});await expect(m).toBeVisible();await m.getByRole('menuitem',{name:'Zoom',exact:true}).hover();const sub=page.getByRole('menu',{name:'Zoom',exact:true});await expect(sub).toBeVisible();
 for(const box of [m,sub]){const r=(await box.boundingBox())!;expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width);expect(r.y+r.height).toBeLessThanOrEqual(850);}
 const options=await sub.getByRole('menuitem').allTextContents();expect(options).toEqual(['50%','75%','100%','200%','300%','Fit width','Fit page']);
 // Wait for the real scroll event and settled layout, rather than creating
 // a synthetic event plus a second queued browser event that closes the next menu.
 await page.locator('[data-studio-scroller]').evaluate(el=>new Promise<void>(resolve=>{el.addEventListener('scroll',()=>requestAnimationFrame(()=>resolve()),{once:true});el.scrollTop+=el.scrollTop>0?-50:50;}));await expect(m).toBeHidden();await settle(page);
 await page.locator(story).evaluate((el,width)=>el.dispatchEvent(new MouseEvent('contextmenu',{clientX:width-3,clientY:300,bubbles:true,cancelable:true})),width);await expect(m).toBeVisible();await page.locator('[data-studio-titlebar]').click({position:{x:300,y:10}});await expect(m).toBeHidden();
});

test('Cut Copy Clear and Paste use the selected text without interpreting HTML',async({page})=>{
 await open(page);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as unknown as {copied:string}).copied=text;},readText:async()=>'<b>plain text</b>'}}));
 await page.keyboard.insertText('Clipboard sample');await settle(page);await all(page);let m=await menu(page);await m.getByRole('menuitem',{name:'Copy',exact:true}).click();expect(await page.evaluate(()=>(window as unknown as {copied:string}).copied)).toBe('Clipboard sample');await expect(page.locator(story)).toHaveText('Clipboard sample');
 await all(page);m=await menu(page);await m.getByRole('menuitem',{name:'Cut',exact:true}).click();await expect(page.locator(story)).toHaveText('');m=await menu(page);await m.getByRole('menuitem',{name:'Paste',exact:true}).click();await expect(page.locator(story)).toHaveText('<b>plain text</b>');await expect(page.locator(`${story} strong`)).toHaveCount(0);
 await all(page);m=await menu(page);await m.getByRole('menuitem',{name:'Clear',exact:true}).click();await expect(page.locator(story)).toHaveText('');
});
test('clipboard denial preserves text and explains the keyboard fallback',async({page})=>{
 await open(page);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>{throw new Error('denied');},writeText:async()=>{throw new Error('denied');}}}));await page.keyboard.insertText('Keep this text');await settle(page);await all(page);let m=await menu(page);await m.getByRole('menuitem',{name:'Cut',exact:true}).click();await expect(page.getByRole('alertdialog')).toContainText('Nothing was cut');await expect(page.locator(story)).toHaveText('Keep this text');await page.getByRole('button',{name:'Close',exact:true}).click();m=await menu(page);await m.getByRole('menuitem',{name:'Paste',exact:true}).click();await expect(page.getByRole('alertdialog')).toContainText('Ctrl+V');
});

test('Import and formatting entries reuse the existing actions',async({page})=>{
 await open(page);await page.keyboard.insertText('Format this text');await settle(page);let m=await menu(page);const [picker]=await Promise.all([page.waitForEvent('filechooser'),m.getByRole('menuitem',{name:'Import…',exact:true}).click()]);expect(picker.isMultiple()).toBe(false);await picker.setFiles([]);
 m=await menu(page);await m.getByRole('menuitem',{name:'Character…',exact:true}).click();await expect(page.getByRole('dialog',{name:'Character',exact:true})).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await all(page);m=await menu(page);await m.getByRole('menuitem',{name:'Character…',exact:true}).click();await page.getByLabel('Size (pt)',{exact:true}).fill('24');await page.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.locator('.ProseMirror span[style*="font-size"]')).toHaveCount(1);
 m=await menu(page);await m.getByRole('menuitem',{name:'Paragraph…',exact:true}).click();await expect(page.getByRole('dialog',{name:'Paragraph Preferences',exact:true})).toBeVisible();await page.getByLabel('Line Height',{exact:true}).fill('20pt');await page.getByRole('button',{name:'OK',exact:true}).click();await expect(page.locator('.ProseMirror p').first()).toHaveCSS('line-height','26.6667px');
});
for(const locale of ['en','ur'])test(`Studio is English-only but home keeps its ${locale} site language switch`,async({page})=>{
 await page.addInitScript((locale)=>localStorage.setItem('qalam-site-language',locale),locale);await page.goto('/tools/document-studio');await expect(page.locator('[data-studio-shell]')).toHaveAttribute('data-studio-ui-language','en');await expect(page.locator('[data-studio-language-switch]')).toHaveCount(0);await page.goto('/');await expect(page.getByRole('group',{name:/Site language|سائٹ کی زبان/})).toBeVisible();
});
test('Home has a house icon and guards unsaved edits with Stay and Leave',async({page})=>{
 await open(page);const home=page.getByRole('link',{name:'Home',exact:true});await expect(home).toHaveAttribute('title','Home');await expect(home.locator('svg')).toHaveCount(1);
 await page.keyboard.insertText('Unsaved change');await home.click();const d=page.getByRole('dialog',{name:'You have unsaved changes. Leave Qalam Page?',exact:true});await expect(d).toBeVisible();await d.getByRole('button',{name:'Stay',exact:true}).click();await expect(page).toHaveURL(/document-studio/);await expect(page.locator(story)).toHaveText('Unsaved change');
 await page.locator(story).focus();await page.keyboard.insertText('!');await home.click();await d.getByRole('button',{name:'Leave',exact:true}).click();await expect(page).toHaveURL(/\/$/);
});
test('Home leaves a saved document immediately without a confirmation',async({page})=>{
 await open(page);await expect(page.locator('[data-studio-save-status]')).toContainText('Saved');await page.getByRole('link',{name:'Home',exact:true}).click();await expect(page).toHaveURL(/\/$/);await expect(page.getByRole('dialog')).toHaveCount(0);
});
