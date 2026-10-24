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
for(const key of ['Enter','Shift+Enter']){
 test(`${key} empty line boxes paginate through page two`,async({page})=>{
  await open(page);
  for(let i=0;i<30;i++)await page.keyboard.press(key);
  await expect(page.locator('[data-studio-page-paper="2"]')).toBeAttached();
  await expect.poll(()=>page.evaluate(()=>{
   const root=document.querySelector<HTMLElement>('.ProseMirror')!;
   const frames=[...document.querySelectorAll('[data-studio-margin-guide]')].map(g=>({
    top:g.querySelector('[data-studio-margin-line="top"]')!.getBoundingClientRect().top,
    bottom:g.querySelector('[data-studio-margin-line="bottom"]')!.getBoundingClientRect().top,
   }));
   const boxes=[...root.querySelectorAll('br')].map(br=>{
    const r=br.getBoundingClientRect();const leading=parseFloat(getComputedStyle(br.parentElement!).lineHeight);
    return {top:r.top-(leading-r.height)/2,bottom:r.top+(leading+r.height)/2};
   });
   const c=document.querySelector('[data-studio-caret]')?.getBoundingClientRect();
   const clip=root.closest('[data-studio-scroller]')!.getBoundingClientRect();
   const second=boxes.find(b=>b.top>=frames[1].top-.2);
   return {count:boxes.length,inside:boxes.every(b=>frames.some(f=>b.top>=f.top-.2&&b.bottom<=f.bottom+.2)),
    second:!!second&&Math.abs(second.top-frames[1].top)<=1,
    caret:!!c&&frames.some(f=>c.top>=f.top&&c.bottom<=f.bottom),visible:!!c&&c.top>=clip.top&&c.bottom<=clip.bottom};
  })).toEqual({count:31,inside:true,second:true,caret:true,visible:true});
  await caretInside(page,true);
 });
}
for(const pattern of ['mixed','typed'])test(`${pattern} paragraphs retain typed-text page capacity`,async({page})=>{
 await open(page);
 for(let i=0;i<30;i++){
  if(pattern==='typed'||i%2===0)await page.keyboard.insertText("السلام علیکم");
  await page.keyboard.press('Enter');
 }
 await expect(page.locator('.ProseMirror p')).toHaveCount(31);
 await expect.poll(()=>page.evaluate(()=>{
  const border=document.querySelector('[data-studio-margin-guide="1"] [data-studio-margin-line="bottom"]')!.getBoundingClientRect().top;
  return [...document.querySelectorAll('.ProseMirror p')].filter(p=>{
   const range=document.createRange();range.selectNodeContents(p);const r=[...range.getClientRects()].find(r=>r.height>0);
   return r&&r.bottom<=border;
  }).length;
 })).toBe(23);
});
