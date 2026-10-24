import {test,expect,type Page} from '@playwright/test';
import sharp from 'sharp';
async function open(page:Page){
 await page.setViewportSize({width:1280,height:1080});await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));
 await page.goto('/tools/document-studio');await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();await expect(page.locator('.ProseMirror')).toBeFocused();
 await page.evaluate(()=>document.fonts.ready);
}
for(const dir of ['rtl','ltr'] as const)test(`${dir} partial bold-word selection does not cover its unselected prefix`,async({page})=>{
 await open(page);
 const prefix=dir==='rtl'?'پہلا حصہ ':'First part ',word=dir==='rtl'?'درمیانی':'middle',suffix=dir==='rtl'?' آخری حصہ':' last part';
 await page.keyboard.insertText(prefix);await page.keyboard.press('Control+B');await page.keyboard.insertText(word);await page.keyboard.press('Control+B');await page.keyboard.insertText(suffix);
 await page.locator('.ProseMirror').evaluate((el,{from,to})=>{
  const editor=(el as HTMLElement & {editor:{commands:{setTextSelection:(r:{from:number;to:number})=>void}}}).editor;editor.commands.setTextSelection({from,to});
 },{from:1+prefix.length,to:1+prefix.length+word.length+suffix.length});
 await expect.poll(()=>page.evaluate((dir)=>{
  const bold=document.querySelector('.ProseMirror strong')!;const range=document.createRange();range.selectNodeContents(bold);const r=range.getBoundingClientRect();
  const bands=[...document.querySelectorAll('[data-studio-line-selection]')].map(e=>e.getBoundingClientRect());if(!bands.length)return 999;
  return Math.abs(dir==='rtl'?Math.max(...bands.map(b=>b.right))-r.right:Math.min(...bands.map(b=>b.left))-r.left);
 },dir)).toBeLessThanOrEqual(1);
 const gap=await page.evaluate(dir=>{
  const band=document.querySelector('[data-studio-line-selection]')!.getBoundingClientRect();
  const guide=document.querySelector(`[data-studio-margin-line="${dir==='rtl'?'right':'left'}"]`)!.getBoundingClientRect();
  return dir==='rtl'?guide.left-band.right:band.left-guide.right;
 },dir);expect(gap).toBeGreaterThan(10);
});
for(const value of ['50','100','150'])test(`LTR Home caret clears guide ink at ${value}%`,async({page})=>{
 await open(page);await page.keyboard.insertText('An English paragraph');
 await page.locator('[data-menu-root="view"]').click();await page.locator('[data-menu-submenu="view.zoom"]').hover();await page.locator(`[data-menu-action="view.zoom.${value}"]`).click();await page.locator('.ProseMirror').focus();
 await expect(page.locator('.ProseMirror [data-studio-line-run]').first()).toBeAttached();
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))));
 // Home is idempotent; retry it after deferred focus/layout settles rather than
 // letting that existing race turn this geometry check into a keyboard test.
 await expect.poll(async()=>{await page.keyboard.press('Home');
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 return page.evaluate(()=>{
  const c=document.querySelector('[data-studio-caret]')?.getBoundingClientRect();const guide=document.querySelector('[data-studio-margin-line="left"]')!.getBoundingClientRect();
  return c?{width:Math.abs(c.width-2)<=.2,gap:Math.abs(c.left-guide.right-1)<=.2}:{width:false,gap:false};
 });}).toEqual({width:true,gap:true});
});
for(const leading of ['5pt','8pt','12pt','Auto'])for(const hardBreak of [false,true])test(`${leading} ${hardBreak?'soft lines':'paragraphs'} cannot paint ink above the top guide`,async({page},testInfo)=>{
 await open(page);await page.keyboard.insertText('السلام علیکم');
 for(const text of ['گگگگ کککک','کیا گل کھلا ہے','گھر کا کام']){await page.keyboard.press(hardBreak?'Shift+Enter':'Enter');await page.keyboard.insertText(text);}
 await page.keyboard.press('Control+A');const field=page.locator('[data-studio-leading]');await field.fill(leading);await field.press('Enter');await page.locator('.ProseMirror').focus();await page.keyboard.press('Control+End');
 await page.addStyleTag({content:'[data-studio-caret]{visibility:hidden!important}'});
 // Capture the actual pixels above the top guide, excluding its vertical edges.
 const count=async()=>{
  const clip=await page.evaluate(()=>{
   const frame=document.querySelector('[data-studio-margin-guide="1"]')!;
   const top=frame.querySelector('[data-studio-margin-line="top"]')!.getBoundingClientRect();const left=frame.querySelector('[data-studio-margin-line="left"]')!.getBoundingClientRect(),right=frame.querySelector('[data-studio-margin-line="right"]')!.getBoundingClientRect();
   return {x:Math.ceil(left.right),y:Math.floor(top.top)-16,width:Math.floor(right.right)-Math.ceil(left.right),height:16};
  });
  const png=await page.screenshot({clip,scale:'css'});await testInfo.attach('above-guide',{body:png,contentType:'image/png'});
  const {data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});let dark=0;for(let i=0;i<data.length;i+=info.channels)if(data[i]<120&&data[i+1]<120&&data[i+2]<120)dark++;return dark;
 };
 await expect.poll(count).toBe(0);
 if(leading==='5pt'){
  const disabled=await page.addStyleTag({content:'.ProseMirror [data-studio-line-run]:not([data-studio-line-box-top="48"]) { top:0!important; }'});
  expect(await count()).toBeGreaterThan(0);
  await disabled.evaluate(el=>el.parentNode?.removeChild(el));
  await expect.poll(count).toBe(0);
 }
 await expect.poll(()=>page.locator('.ProseMirror p').first().evaluate(el=>parseFloat(getComputedStyle(el).lineHeight))).toBeCloseTo((leading==='Auto'?19.8:parseFloat(leading))*4/3,3);
});
