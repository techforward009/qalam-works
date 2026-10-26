import {test,expect,type Page} from '@playwright/test';
import type {Editor} from '@tiptap/core';
async function open(page:Page){await page.setViewportSize({width:1920,height:1080});await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));await page.goto('/tools/document-studio');await expect(page.locator('.ProseMirror')).toBeFocused();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));}
async function view(page:Page,mode:'pages'|'facing'){await page.locator('[data-menu-root="view"]').click();await page.locator(`[data-menu-action="view.${mode}"]`).click();await expect(page.locator('[data-studio-view]')).toHaveAttribute('data-studio-view',mode);await settle(page);}
async function settle(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>{let n=8;const tick=()=>--n?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick);}));}
async function seed(page:Page,lines=170){await page.locator('.ProseMirror').evaluate((root,lines)=>{const e=(root as HTMLElement&{editor:Editor}).editor;e.commands.setContent({type:'doc',content:Array.from({length:lines},(_,i)=>({type:'paragraph',attrs:{dir:'rtl'},content:[{type:'text',text:`یہ صفحے کی سطر ${i+1} ہے۔`}]}))});e.commands.focus('start');},lines);await expect(page.locator('[data-studio-page-count]')).toHaveAttribute('data-studio-page-count','5');await settle(page);}
async function caretPage(page:Page){return page.evaluate(()=>{const c=document.querySelector('[data-studio-caret]')?.getBoundingClientRect();return c?[...document.querySelectorAll('[data-studio-margin-guide]')].find(g=>{const r=g.getBoundingClientRect();return c.top>=r.top&&c.bottom<=r.bottom&&c.left>=r.left&&c.right<=r.right;})?.getAttribute('data-studio-margin-guide'):null;});}
async function visible(page:Page){await expect.poll(()=>page.evaluate(()=>{const c=document.querySelector('[data-studio-caret]')?.getBoundingClientRect(),s=document.querySelector('[data-studio-scroller]')!.getBoundingClientRect();return !!c&&c.top>=s.top&&c.bottom<=s.bottom&&c.left>=s.left&&c.right<=s.right;})).toBe(true);}
test('single page has zoomed top space and a solid left/bottom shadow',async({page})=>{
 await open(page);const result=await page.evaluate(()=>{const s=document.querySelector('[data-studio-scroller]')!.getBoundingClientRect(),p=document.querySelector('[data-studio-page-paper]')!.getBoundingClientRect(),frame=document.querySelector('[data-studio-page-frames] > div')!;return {pad:p.top-s.top,shadow:getComputedStyle(frame).boxShadow};});expect(result.pad).toBeCloseTo(24,0);expect(result.shadow).toContain('rgb(64, 64, 64) -3px 3px 0px');
});
test('facing order, pasteboard, borders, numbers and unchanged document/page count',async({page})=>{
 await open(page);await seed(page);const original=await page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.getJSON());await view(page,'facing');
 const boxes=await page.locator('[data-studio-page-paper]').evaluateAll(xs=>xs.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width};}));
 expect(boxes).toHaveLength(5);expect(boxes[0].left).toBeCloseTo(boxes[2].left);expect(boxes[1].left).toBeGreaterThan(boxes[2].left);expect(boxes[1].top).toBeCloseTo(boxes[2].top);expect(boxes[3].top).toBeCloseTo(boxes[4].top);expect(Math.abs(boxes[1].left-(boxes[2].left+boxes[2].width))).toBeLessThan(.1);
 await expect(page.locator('[data-studio-facing-page-number]')).toHaveText(['1','2','3','4','5']);
 for(const zoom of ['50','100','200']){await page.locator('[data-studio-zoom-control]').selectOption(zoom);await settle(page);const data=await page.evaluate(()=>{const row=document.querySelector('[data-studio-facing-row]')!,r=row.getBoundingClientRect(),p=document.querySelector('[data-studio-page-paper]')!.getBoundingClientRect(),style=getComputedStyle(row);return {left:p.left-r.left,top:p.top-r.top,width:p.width,borders:[style.borderLeftColor,style.borderRightColor,style.borderBottomColor]};});expect(data.left).toBeCloseTo(793.700787/7*Number(zoom)/100,0);expect(data.top).toBeCloseTo(data.left,0);expect(data.borders).toEqual(['rgb(0, 0, 0)','rgb(0, 0, 0)','rgb(192, 192, 192)']);if(zoom==='50')await expect(page.locator('.ProseMirror p').nth(40)).toHaveAttribute('data-facing-projected','true');}
 expect(await page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.getJSON())).toEqual(original);await expect(page.locator('[data-studio-page-count]')).toHaveAttribute('data-studio-page-count','5');
});
for(const lineKey of ['Enter','Shift+Enter'])test(`${lineKey} follows the caret across facing rows and view switches preserve its page`,async({page})=>{
 test.setTimeout(60000);await open(page);await view(page,'facing');await page.locator('[data-studio-zoom-control]').selectOption('50');await page.locator('.ProseMirror').focus();
 for(let i=0;i<124;i++){
  await page.keyboard.press(lineKey);
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await expect.poll(()=>page.evaluate(()=>{const root=document.querySelector('.ProseMirror') as HTMLElement&{editor:Editor},caret=document.querySelector('[data-studio-caret]');return Number(caret?.getAttribute('data-studio-caret-pos'))===root.editor.state.selection.head;})).toBe(true);
  await expect.poll(()=>caretPage(page)).not.toBeNull();
  await visible(page);
 }
 await settle(page);await expect.poll(()=>caretPage(page)).toBe('4');await visible(page);
 await page.keyboard.insertText('نیا صفحہ');await expect(page.locator('.ProseMirror')).toContainText('نیا صفحہ');await visible(page);
 await view(page,'pages');await expect.poll(()=>caretPage(page)).toBe('4');await visible(page);await view(page,'facing');await expect.poll(()=>caretPage(page)).toBe('4');await visible(page);
 if(lineKey==='Shift+Enter'){
  await page.locator('.ProseMirror').evaluate(root=>{const e=(root as HTMLElement&{editor:Editor}).editor,end=e.state.selection.head;e.commands.setTextSelection({from:end-2,to:end});});
  await expect(page.locator('[data-studio-line-selection]')).toHaveCount(1);
  for(const mode of ['facing','pages'] as const){if(mode==='pages')await view(page,mode);await expect.poll(()=>page.evaluate(()=>{const band=document.querySelector('[data-studio-line-selection]')?.getBoundingClientRect(),guide=document.querySelector('[data-studio-margin-guide="4"]')!.getBoundingClientRect();return !!band&&band.top>=guide.top&&band.bottom<=guide.bottom;})).toBe(true);}
 }
});
test('clicking and selecting on paired pages and the text context menu use the real editor',async({page})=>{
 await open(page);await seed(page);await view(page,'facing');await page.locator('[data-studio-zoom-control]').selectOption('50');await settle(page);
 const rect=await page.locator('[data-studio-page-paper="2"]').boundingBox();await page.locator('[data-studio-scroller]').evaluate((el,y)=>el.scrollTop=y,rect!.y-200);await settle(page);
 const p=page.locator('.ProseMirror p').nth(40);await p.click();await settle(page);await expect.poll(()=>caretPage(page)).toBe('2');await page.keyboard.insertText('abc');await expect(p).toContainText('abc');
 await p.click({button:'right'});await expect(page.getByRole('menu',{name:'Text context menu',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.commands.selectAll());await expect(page.locator('[data-studio-line-selection]').first()).toBeVisible();
});
for(const mode of ['pages','facing'] as const)test(`legacy quotes stay inside the last page in ${mode}`,async({page})=>{
 await open(page);if(mode==='facing')await view(page,mode);await page.locator('.ProseMirror').evaluate(root=>{const e=(root as HTMLElement&{editor:Editor}).editor;e.commands.setContent({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Before quote'}]},{type:'blockquote',content:[{type:'paragraph',content:[{type:'text',text:'Legacy quote'}]}]},{type:'paragraph',content:[{type:'text',text:'After quote'}]}]});e.commands.focus('end');});await settle(page);await expect(page.locator('[data-studio-page-count]')).toHaveAttribute('data-studio-page-count','1');
 const data=await page.evaluate(()=>{const p=document.querySelector('.ProseMirror p:last-child')!,range=document.createRange();range.selectNodeContents(p);const r=range.getBoundingClientRect(),paper=document.querySelector('[data-studio-page-paper]')!.getBoundingClientRect();return {bottom:r.bottom,limit:paper.bottom,clear:getComputedStyle(document.querySelector('.ProseMirror blockquote')!).clear};});expect(data.clear).toBe('none');expect(data.bottom).toBeLessThan(data.limit);
});

test('facing zoom shortcuts and 300% keep a two-screen-pixel caret inside crisp guides',async({page})=>{
 await open(page);await view(page,'facing');await page.locator('.ProseMirror').focus();
 for(const [key,zoom] of [['F6','50'],['F7','100'],['F8','200'],['','300']]){
  if(key)await page.keyboard.press(key);else await page.locator('[data-studio-zoom-control]').selectOption(zoom);
  await expect(page.locator('[data-studio-print-root]')).toHaveAttribute('data-studio-zoom',zoom);await settle(page);await visible(page);
  const info=await page.evaluate(()=>{const c=document.querySelector('[data-studio-caret]')!.getBoundingClientRect(),g=document.querySelector('[data-studio-margin-guide="1"] [data-studio-margin-line="right"]')!.getBoundingClientRect();return {width:c.width,guide:g.width,gap:g.left-c.right,dpr:devicePixelRatio};});
  expect(info.width).toBeCloseTo(2,1);expect(info.guide).toBeCloseTo(1,1);expect(Math.abs(info.gap-1)*info.dpr).toBeLessThanOrEqual(1.05);
 }
});

test('Arrow view switches keep the visible page without focusing the stored story caret',async({page})=>{
 await open(page);await seed(page);await page.locator('[data-studio-tool-button="select"]').click();
 await page.locator('[data-studio-scroller]').evaluate(el=>{const viewport=el.getBoundingClientRect(),paper=el.querySelector('[data-studio-page-paper="4"]')!.getBoundingClientRect();el.scrollTop+=paper.top-viewport.top+100;});await settle(page);
 for(const mode of ['facing','pages'] as const){await view(page,mode);await expect(page.locator('[data-studio-caret]')).toHaveCount(0);await expect(page.locator('.ProseMirror')).not.toBeFocused();await expect.poll(()=>page.evaluate(()=>{const v=document.querySelector('[data-studio-scroller]')!.getBoundingClientRect(),p=document.querySelector('[data-studio-page-paper="4"]')!.getBoundingClientRect();return p.top<v.top+v.height/2&&p.bottom>v.top+v.height/2;})).toBe(true);if(mode==='facing'){const nav=page.locator('[data-studio-page-label]').locator('..');await nav.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.locator('[data-studio-page-label]')).toHaveText('5/5');await nav.getByRole('button',{name:'Previous page',exact:true}).click();await expect(page.locator('[data-studio-page-label]')).toHaveText('4/5');}}
});
