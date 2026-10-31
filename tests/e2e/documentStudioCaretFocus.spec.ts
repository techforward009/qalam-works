import {expect,test,type Page} from '@playwright/test';
import type {Editor} from '@tiptap/core';
async function open(page:Page){
 await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));
 await page.goto('/tools/document-studio');
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
 await expect(page.locator('.ProseMirror')).toBeEditable();await page.locator('.ProseMirror').click();
}
async function dialog(page:Page,action:string,button:'Cancel'|'OK'){
 await page.locator('[data-menu-root="format"]').click();await page.locator(`[data-menu-action="${action}"]`).click();
 const box=page.getByRole('dialog',{name:action==='file.pageSetup'?'Page Setup':action==='format.character'?'Character':'Paragraph Preferences',exact:true});
 await expect(box).toBeVisible();await box.getByRole('button',{name:button,exact:true}).click();
 await expect(page.locator('.ProseMirror')).toBeFocused();
}
async function follows(page:Page){
 await expect(page.locator('[data-studio-caret]')).toBeVisible();
 await expect.poll(()=>page.locator('.ProseMirror').evaluate(el=>{
  const editor=(el as HTMLElement&{editor:Editor}).editor,caret=document.querySelector('[data-studio-caret]'),r=caret?.getBoundingClientRect(),native=window.getSelection(),owned=native?.anchorNode&&editor.view.dom.contains(native.anchorNode)&&editor.view.posAtDOM(native.anchorNode,native.anchorOffset)===editor.state.selection.head,range=owned&&native?.rangeCount?native.getRangeAt(0).getBoundingClientRect():null,point=range?.height?range:editor.view.coordsAtPos(editor.state.selection.head);
  return !!r&&Math.abs(r.left-point.left)<8&&caret?.getAttribute('data-studio-caret-pos')===String(editor.state.selection.head);
 })).toBe(true);
}
for(const script of ['English','Urdu'] as const)test(`dialog Cancel and OK preserve selection, restore typing focus and a moving first-line caret (${script})`,async({page},info)=>{
 await open(page);await page.keyboard.insertText(script==='Urdu'?'یہ ابتدائی عبارت ہے':'alpha bravo');
 for(const [action,button] of [['file.pageSetup','Cancel'],['file.pageSetup','OK'],['format.paragraph','Cancel'],['format.paragraph','OK'],['format.character','Cancel'],['format.character','OK']] as const){
  const before=await page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement&{editor:Editor}).editor.state.selection.head);
  await dialog(page,action,button);
  expect(await page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement&{editor:Editor}).editor.state.selection.head)).toBe(before);
  const x=(await page.locator('[data-studio-caret]').boundingBox())!.x;
  await page.keyboard.insertText(script==='Urdu'?' مزید':' next');await follows(page);expect(Math.abs((await page.locator('[data-studio-caret]').boundingBox())!.x-x)).toBeGreaterThan(2);
 }
 await page.locator('[data-studio-caret]').evaluate(el=>(el as HTMLElement).style.animation='none');
 await page.screenshot({path:info.outputPath('caret-after-dialogs.png'),scale:'css'});
});
test('double-click after all dialogs selects a whole word and preserves it through wrapper clicks',async({page})=>{
 await open(page);await page.keyboard.insertText('alpha bravo charlie');
 for(const action of ['file.pageSetup','format.paragraph','format.character'])await dialog(page,action,'Cancel');
 const point=await page.locator('.ProseMirror').evaluate(el=>{const editor=(el as HTMLElement&{editor:Editor}).editor,a=editor.view.coordsAtPos(9);return{x:a.left,y:(a.top+a.bottom)/2};});
 await page.mouse.dblclick(point.x,point.y);
 await expect.poll(()=>page.locator('.ProseMirror').evaluate(el=>{const e=(el as HTMLElement&{editor:Editor}).editor;return e.state.doc.textBetween(e.state.selection.from,e.state.selection.to);})).toBe('bravo');
 // A bubbled second click must not replace the browser's just-created range.
 await page.locator('[data-studio-selection-host]').dispatchEvent('click',{detail:1,clientX:point.x,clientY:point.y});
 await page.locator('[data-studio-selection-host]').dispatchEvent('click',{detail:2,clientX:point.x,clientY:point.y});
 expect(await page.locator('.ProseMirror').evaluate(el=>{const e=(el as HTMLElement&{editor:Editor}).editor;return e.state.doc.textBetween(e.state.selection.from,e.state.selection.to);})).toBe('bravo');
});
test('Close then New remounts caret and selection listeners',async({page},info)=>{
 await open(page);await page.keyboard.insertText('saved document');
 await page.locator('[data-menu-root="file"]').click();await page.locator('[data-menu-action="file.close"]').click();await expect(page.locator('[data-studio-empty-window]')).toBeVisible();
 await page.locator('[data-menu-root="file"]').click();await page.locator('[data-menu-action="file.new"]').click();await page.getByRole('dialog',{name:'New Document',exact:true}).getByRole('button',{name:'OK',exact:true}).click();
 await expect(page.locator('.ProseMirror')).toBeFocused();await page.keyboard.insertText('fresh typing');await follows(page);await dialog(page,'file.pageSetup','OK');await page.keyboard.insertText(' continues');await follows(page);
 await page.locator('[data-studio-caret]').evaluate(el=>(el as HTMLElement).style.animation='none');await page.screenshot({path:info.outputPath('caret-after-close-new.png'),scale:'css'});
});

test('Page Setup margin changes keep a moving caret at the same model selection',async({page})=>{
 await open(page);await page.keyboard.insertText('یہ ایک عبارت ہے');
 const head=await page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement&{editor:Editor}).editor.state.selection.head);
 await page.locator('[data-menu-root="format"]').click();await page.locator('[data-menu-action="file.pageSetup"]').click();
 const setup=page.getByRole('dialog',{name:'Page Setup',exact:true});
 await setup.getByLabel('left margin',{exact:true}).fill('18mm');await setup.getByLabel('right margin',{exact:true}).fill('20mm');await setup.getByRole('button',{name:'OK',exact:true}).click();
 await expect(page.locator('.ProseMirror')).toBeFocused();
 expect(await page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement&{editor:Editor}).editor.state.selection.head)).toBe(head);
 await follows(page);const x=(await page.locator('[data-studio-caret]').boundingBox())!.x;
 await page.keyboard.insertText(' مزید');await follows(page);expect(Math.abs((await page.locator('[data-studio-caret]').boundingBox())!.x-x)).toBeGreaterThan(2);
});
