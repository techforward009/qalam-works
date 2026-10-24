import { test, expect, type Page } from "@playwright/test";

async function open(page:Page){
 await page.setViewportSize({width:1280,height:1080});
 await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));
 await page.goto('/tools/document-studio');
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
 await expect(page.locator('.ProseMirror')).toBeFocused();
 await page.evaluate(()=>document.fonts.ready);
}
async function leading(page:Page,value:string){
 const input=page.locator('[data-studio-leading]');await input.fill(value);await input.press('Enter');
 await expect(input).toHaveValue(/^Auto$|pt$/);await page.locator('.ProseMirror').focus();
}
async function settle(page:Page){await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
async function select(page:Page){await page.keyboard.press('Control+A');await expect(page.locator('[data-studio-line-selection]').first()).toBeAttached();await settle(page);}
async function pitch(page:Page){return page.locator('.ProseMirror').evaluate(root=>{
 const scale=root.getBoundingClientRect().width/parseFloat(getComputedStyle(root).width);
 const ps=[...root.querySelectorAll('p')];const first=ps[0].getBoundingClientRect();
 return {pitch:(ps[1].getBoundingClientRect().top-first.top)/scale,leading:parseFloat(getComputedStyle(ps[0]).lineHeight),space:getComputedStyle(ps[0]).marginBottom,overflow:getComputedStyle(ps[0]).overflow,top:first.top,frame:root.getBoundingClientRect().top+parseFloat(getComputedStyle(root).paddingTop)*scale};
});}

test('Mehr Auto is about 20pt at 12pt, with no hidden paragraph gap',async({page},testInfo)=>{
 await open(page);await page.keyboard.insertText('السلام علیکم اللہ وبرکاتہ');await page.keyboard.press('Enter');await page.keyboard.insertText('یہ دوسری سطر ہے');
 await expect.poll(async()=> (await pitch(page)).pitch).toBeCloseTo(26.4,0);
 const p=await pitch(page);expect(p.leading*3/4).toBeCloseTo(19.8,1);expect(p.space).toBe('0px');expect(Math.abs(p.top-p.frame)).toBeLessThanOrEqual(1);
 await select(page);const boxes=await page.locator('[data-studio-line-selection]').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}}).sort((a,b)=>a.top-b.top));
 expect(boxes).toHaveLength(2);expect(Math.abs(boxes[1].top-boxes[0].bottom)).toBeLessThanOrEqual(1);expect(boxes[0].height).toBeCloseTo(p.leading,0);
 await page.screenshot({path:testInfo.outputPath('mehr-12-auto.png')});
});

test('5pt leading overlaps unclipped glyphs and paints a continuous 5pt selection',async({page},testInfo)=>{
 await open(page);await page.keyboard.insertText('السلام علیکم اللہ وبرکاتہ');await page.keyboard.press('Enter');await page.keyboard.insertText('یہ دوسری سطر ہے');await select(page);await leading(page,'5pt');
 await expect.poll(async()=> (await pitch(page)).pitch).toBeCloseTo(20/3,0);
 expect((await pitch(page)).overflow).toBe('visible');await select(page);await expect(page.locator('[data-studio-line-selection]')).toHaveCount(2);
 const boxes=await page.locator('[data-studio-line-selection]').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}}).sort((a,b)=>a.top-b.top));
 expect(boxes).toHaveLength(2);for(const b of boxes)expect(b.height).toBeCloseTo(20/3,0);expect(Math.abs(boxes[1].top-boxes[0].bottom)).toBeLessThanOrEqual(1);
 await expect(page.locator('[data-studio-caret]')).toHaveCount(0);await page.screenshot({path:testInfo.outputPath('5pt-selection.png')});
});

for(const size of ['12','28'])test(`Mehr ${size}pt first ink stays below the top guide`,async({page})=>{
 await open(page);await page.keyboard.insertText('السلام علیکم اللہ وبرکاتہ');await page.keyboard.press('Control+A');await page.locator('[data-studio-font-size]').selectOption(size);await page.keyboard.press('ArrowRight');await settle(page);
 // Actual glyph ink, not the font's oversized range rect.
 const ink=await page.locator('.ProseMirror p').first().evaluate(async p=>{
  await document.fonts.ready;const text=p.querySelector('[data-studio-line-run]')?.firstChild??p.firstChild!;
  const r=document.createRange();r.selectNodeContents(text);const b=r.getBoundingClientRect();const style=getComputedStyle(text.parentElement!);
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;ctx.font=style.font;const m=ctx.measureText(text.textContent!);
  const root=p.closest<HTMLElement>('.ProseMirror')!,frame=root.getBoundingClientRect().top+parseFloat(getComputedStyle(root).paddingTop);
  return {top:b.top+m.fontBoundingBoxAscent-m.actualBoundingBoxAscent,frame};
 });expect(ink.top).toBeGreaterThanOrEqual(ink.frame-.5);
});

for(const zoom of ['50','100','150'])test(`leading-height caret stays between guides at ${zoom}%`,async({page},testInfo)=>{
 await open(page);await page.locator('[data-menu-root="view"]').click();await page.locator('[data-menu-submenu="view.zoom"]').hover();await page.locator(`[data-menu-action="view.zoom.${zoom}"]`).click();await page.locator('.ProseMirror').focus();
 await page.keyboard.insertText('السلام علیکم');
 const check=async()=>{await expect.poll(()=>page.evaluate(()=>{
  const c=document.querySelector('[data-studio-caret]')?.getBoundingClientRect(),root=document.querySelector<HTMLElement>('.ProseMirror')!;if(!c)return false;
  const scale=root.getBoundingClientRect().width/parseFloat(getComputedStyle(root).width);const sel=window.getSelection()!;const anchor=sel.anchorNode;const owner=(anchor?.nodeType===Node.TEXT_NODE?anchor.parentElement:anchor as HTMLElement)?.closest("p") ?? root.querySelector("p")!;const pitch=parseFloat(getComputedStyle(owner).lineHeight)*scale;
  const inside=[...document.querySelectorAll('[data-studio-margin-guide]')].some(g=>{const t=g.querySelector('[data-studio-margin-line="top"]')!.getBoundingClientRect(),b=g.querySelector('[data-studio-margin-line="bottom"]')!.getBoundingClientRect();return c.top>=t.top-1&&c.bottom<=b.top+1;});
  return inside&&Math.abs(c.height-pitch)<=1&&Math.abs(c.width-2)<=.2;
 })).toBe(true);};await check();
 // Stop at the final authored line of page one, then verify the next page too.
 let previousPage=1;
 for(let i=0;i<60;i++){
  const currentPage=await page.evaluate(()=>{const c=document.querySelector('[data-studio-caret]')!.getBoundingClientRect();return [...document.querySelectorAll('[data-studio-margin-guide]')].findIndex(g=>{const r=g.getBoundingClientRect();return c.top>=r.top&&c.top<r.bottom;})+1;});
  if(currentPage>previousPage){await check();break;}
  previousPage=currentPage;await check();if(i>30)await page.screenshot({path:testInfo.outputPath('last-line-caret.png')});await page.keyboard.press('Enter');
 }
 await page.keyboard.press('Control+A');await expect(page.locator('[data-studio-caret]')).toHaveCount(0);
});

test('opening a legacy document converts a 1.5 multiplier to 18pt',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('qalam-site-language','en');
  localStorage.setItem('qalam-document-studio-draft',JSON.stringify({type:'doc',content:[{type:'paragraph',attrs:{dir:'rtl',lineHeight:1.5},content:[{type:'text',text:'پرانی دستاویز'}]}]}));
 });await page.goto('/tools/document-studio');await expect(page.locator('.ProseMirror')).toContainText('پرانی دستاویز');
 await expect(page.locator('.ProseMirror p')).toHaveCSS('line-height','24px');
 await expect(page.locator('[data-studio-leading]')).toHaveValue('18pt');
});
test('editable leading accepts large points and restores invalid input',async({page})=>{
 await open(page);const input=page.locator('[data-studio-leading]');await input.fill('800pt');await input.press('Enter');await expect(input).toHaveValue('800pt');
 await input.fill('invalid');await input.press('Enter');await expect(input).toHaveValue('800pt');
 await input.fill('Auto');await input.press('Enter');await expect(input).toHaveValue('Auto');
});
