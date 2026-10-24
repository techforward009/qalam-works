import { test, expect, type Page } from "@playwright/test";

async function open(page:Page){
 await page.setViewportSize({width:1920,height:1080});
 await page.addInitScript(()=>localStorage.setItem("qalam-site-language","en"));
 await page.goto("/tools/document-studio");
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
 await expect(page.locator(".ProseMirror")).toBeFocused();
}
async function zoom(page:Page,value:string){
 await page.locator('[data-menu-root="view"]').click();
 await page.locator('[data-menu-submenu="view.zoom"]').hover();
 await page.locator(`[data-menu-action="view.zoom.${value}"]`).click();
 await expect(page.locator('[data-studio-print-root]')).toHaveAttribute('data-studio-zoom',value);
 await page.locator(".ProseMirror").focus();
}
async function caretInside(page:Page, atMargin=false){
 await expect.poll(()=>page.evaluate((atMargin)=>{
  const caret=document.querySelector('[data-studio-caret]')?.getBoundingClientRect();
  const guides=[...document.querySelectorAll('[data-studio-margin-guide]')];
  if(!caret)return {width:false,inside:false,top:false};
  const frame=guides.find(g=>{const b=g.getBoundingClientRect();return caret.top>=b.top&&caret.top<b.bottom;});
  if(!frame)return {width:Math.abs(caret.width-2)<.1,inside:false,top:false};
  const right=frame.querySelector('[data-studio-margin-line="right"]')!.getBoundingClientRect();
  const top=frame.querySelector('[data-studio-margin-line="top"]')!.getBoundingClientRect();
  return {width:Math.abs(caret.width-2)<.1,inside:atMargin?Math.abs(right.left-caret.right-1)<=.1:caret.right<=right.left-.9,top:caret.top>=top.bottom-.1};
 },atMargin)).toEqual({width:true,inside:true,top:true});
}
for(const value of ['100','150','fit-width']){
 test(`RTL caret stays inside guides at ${value}`,async({page})=>{
  await open(page);await zoom(page,value);await caretInside(page,true);
  await page.keyboard.insertText("السلام علیکم اللہ وبرکاتہ");await page.keyboard.press("Home");await caretInside(page);
  await page.keyboard.press("End");await page.keyboard.press("Enter");await caretInside(page,true);
  await page.keyboard.press("Shift+Enter");await caretInside(page,true);
  await page.keyboard.insertText("یہ ایک عام اردو جملہ ہے جو سطر کے اختتام تک پہنچتا ہے۔ ".repeat(12));
  await page.keyboard.press("Home");await caretInside(page);
 });
}
// Read actual painted boxes after React, pagination and its page-start pass.
// No font-metric or <br> half-leading estimate: those vary across Chromium builds.
async function settledCaret(page:Page){
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await expect.poll(()=>page.evaluate(()=>{
  const caret=document.querySelector('[data-studio-caret]')?.getBoundingClientRect();
  if(!caret)return false;
  // Wait for THIS model position, not a still-visible caret from the preceding key.
  // Both are actual DOM rectangles; no <br>/half-leading reconstruction is used.
  const editor=(document.querySelector('.ProseMirror') as HTMLElement & {editor:{
   state:{selection:{head:number}};view:{coordsAtPos:(pos:number)=>{top:number;bottom:number}}
  }}).editor;
  const current=editor.view.coordsAtPos(editor.state.selection.head);
  const middle=(current.top+current.bottom)/2;
  if(middle<caret.top-1||middle>caret.bottom+1)return false;
  return [...document.querySelectorAll('[data-studio-margin-guide]')].some(g=>{
   const top=g.querySelector('[data-studio-margin-line="top"]')!.getBoundingClientRect();
   const bottom=g.querySelector('[data-studio-margin-line="bottom"]')!.getBoundingClientRect();
   return caret.top>=top.bottom-1&&caret.bottom<=bottom.top+1;
  });
 })).toBe(true);
 return page.evaluate(()=>{
  const caret=document.querySelector('[data-studio-caret]')!.getBoundingClientRect();
  const scroller=document.querySelector('[data-studio-scroller]')!.getBoundingClientRect();
  const guide=[...document.querySelectorAll('[data-studio-margin-guide]')].find(g=>{
   const top=g.querySelector('[data-studio-margin-line="top"]')!.getBoundingClientRect();
   const bottom=g.querySelector('[data-studio-margin-line="bottom"]')!.getBoundingClientRect();
   return caret.top>=top.bottom-1&&caret.bottom<=bottom.top+1;
  })!;
  const top=guide.querySelector('[data-studio-margin-line="top"]')!.getBoundingClientRect();
  return {page:Number(guide.getAttribute('data-studio-margin-guide')),fromTop:caret.top-top.bottom,
   visible:caret.top>=scroller.top-1&&caret.bottom<=scroller.bottom+1&&caret.left>=scroller.left-1&&caret.right<=scroller.right+1};
 });
}
async function expectCaretVisible(page:Page){
 await expect.poll(()=>page.evaluate(()=>{
  const c=document.querySelector('[data-studio-caret]')?.getBoundingClientRect();
  const v=document.querySelector('[data-studio-scroller]')!.getBoundingClientRect();
  return !!c&&c.top>=v.top-1&&c.bottom<=v.bottom+1&&c.left>=v.left-1&&c.right<=v.right+1;
 })).toBe(true);
}
for(const key of ['Enter','Shift+Enter']){
 test(`${key} empty line boxes paginate through page two`,async({page})=>{
  await open(page);
  const lines=[await settledCaret(page)];
  for(let i=0;i<60;i++){
   await page.keyboard.press(key);
   lines.push(await settledCaret(page));
   await expectCaretVisible(page);
  }
  expect(lines).toHaveLength(61);
  expect(lines.every(line=>line.page===1||line.page===2)).toBe(true);
  const firstOnPageTwo=lines.find(line=>line.page===2);
  expect(firstOnPageTwo).toBeDefined();
  expect(Math.abs(firstOnPageTwo!.fromTop)).toBeLessThanOrEqual(1);
  await caretInside(page,true);
 });
}
for(const value of ['50','100','150'])for(const key of ['Enter','Shift+Enter']){
 test(`${key} transition keypress keeps the caret visible at ${value}%`,async({page})=>{
  await open(page);await zoom(page,value);
  const target=key==='Enter'?3:2;
  const transitions:number[]=[];
  let previous=1;
  for(let presses=1;presses<=120;presses++){
   await page.keyboard.press(key);
   const caret=await settledCaret(page);
   // Check every key, and especially the transition itself; NO extra key to scroll.
   await expectCaretVisible(page);
   if(caret.page>previous){
    expect(caret.page).toBe(previous+1);
    expect(Math.abs(caret.fromTop)).toBeLessThanOrEqual(1);
    transitions.push(caret.page);previous=caret.page;
   }
   if(caret.page===target)break;
  }
  expect(transitions).toEqual(target===3?[2,3]:[2]);
 });
}
test('caret follow does not move an already visible viewport or a mouse selection',async({page})=>{
 await open(page);
 const scroller=page.locator('[data-studio-scroller]');
 for(let i=0;i<8;i++)await page.keyboard.press('Enter');
 await expectCaretVisible(page);
 const before=await scroller.evaluate(el=>el.scrollTop);
 await page.keyboard.type('Still visible');
 await settledCaret(page);await expectCaretVisible(page);
 expect(await scroller.evaluate(el=>el.scrollTop)).toBe(before);
 const paragraphs=page.locator('.ProseMirror p');
 const first=(await paragraphs.nth(1).boundingBox())!,last=(await paragraphs.nth(6).boundingBox())!;
 await page.mouse.move(first.x+first.width-8,first.y+8);await page.mouse.down();
 await page.mouse.move(last.x+last.width-40,last.y+12,{steps:8});
 await expect.poll(()=>page.evaluate(()=>!!window.getSelection()&&!window.getSelection()!.isCollapsed)).toBe(true);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 expect(await scroller.evaluate(el=>el.scrollTop)).toBe(before);
 await page.mouse.up();
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 expect(await scroller.evaluate(el=>el.scrollTop)).toBe(before);
});
for(const pattern of ['mixed','typed'])test(`${pattern} paragraphs retain typed-text page capacity`,async({page})=>{
 await open(page);
 for(let i=0;i<60;i++){
  if(pattern==='typed'||i%2===0)await page.keyboard.insertText("السلام علیکم");
  await page.keyboard.press('Enter');
 }
 await expect(page.locator('.ProseMirror p')).toHaveCount(61);
 await expect.poll(()=>page.evaluate(()=>{
  const border=document.querySelector('[data-studio-margin-guide="1"] [data-studio-margin-line="bottom"]')!.getBoundingClientRect().top;
  const ps=[...document.querySelectorAll('.ProseMirror p')];
  const first=ps[0].getBoundingClientRect().top,pitch=parseFloat(getComputedStyle(ps[0]).lineHeight);
  const expected=Math.floor((border-first+1)/pitch);
  const actual=ps.filter(p=>{const r=p.getBoundingClientRect();return r.top>=first-1 && r.top+pitch<=border+1;}).length;
  return actual===expected;
 })).toBe(true);
});
