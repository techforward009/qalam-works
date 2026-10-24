import {test,expect} from '@playwright/test';
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
import type {Editor} from '@tiptap/core';
async function open(page:import('@playwright/test').Page){
 await page.setViewportSize({width:1280,height:1080});await page.goto('/tools/document-studio');
 await expect(page.locator('.ProseMirror')).toBeFocused();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
 await page.addStyleTag({content:'[data-studio-caret]{animation:none!important;opacity:1!important;}'});
}
for(const dir of ['rtl','ltr'])for(const zoom of [50,100,200,300])test(`${dir} ${zoom}% paints a 1px guide, 1px gap and 2px caret`,async({page},testInfo)=>{
 await open(page);
 await page.locator('.ProseMirror').evaluate((root,dir)=>{const e=(root as HTMLElement&{editor:Editor}).editor;e.commands.setContent({type:'doc',content:[{type:'paragraph',attrs:{dir,textAlign:dir==='rtl'?'right':'left'}}]});e.commands.focus('start');},dir);
 await page.locator('[data-studio-zoom-control]').selectOption(String(zoom));
 await expect(page.locator('[data-studio-print-root]')).toHaveAttribute('data-studio-zoom',String(zoom));
 await page.evaluate(()=>new Promise<void>(resolve=>{let n=6;const tick=()=>--n?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick);}));
 await expect.poll(()=>page.locator('[data-studio-caret]').evaluate(el=>Math.round(el.getBoundingClientRect().width))).toBe(2);
 const guide=page.locator(`[data-studio-margin-guide="1"] [data-studio-margin-line="${dir==='rtl'?'right':'left'}"]`);
 const caret=page.locator('[data-studio-caret]');
 await expect.poll(async()=>{const c=(await caret.boundingBox())!,g=(await guide.boundingBox())!;return dir==='rtl'?g.x-(c.x+c.width):c.x-(g.x+g.width);}).toBeCloseTo(1,0);
 // Scan actual raster ink, not just the bounding rectangles. Device-scale
 // screenshots retain the physical pixel grid on high-DPR mobile browsers.
 const c=(await caret.boundingBox())!,g=(await guide.boundingBox())!,dpr=await page.evaluate(()=>devicePixelRatio);
 const left=Math.floor(Math.min(c.x,g.x))-4,top=Math.floor(c.y+c.height/2-2);
 const raster=await page.screenshot({clip:{x:left,y:top,width:Math.ceil(Math.max(c.x+c.width,g.x+g.width))-left+4,height:4},scale:'device'});
 await writeFile(testInfo.outputPath('caret-guide.png'),raster);
 const {data,info}=await sharp(raster).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const columns:number[]=[];
 for(let x=0;x<info.width;x++){let count=0;for(let y=1;y<info.height-1;y++){const i=(y*info.width+x)*info.channels;if(Math.max(data[i],data[i+1],data[i+2])<100)count++;}if(count>(info.height-2)*.8)columns.push(x);}
 const runs:number[][]=[];for(const x of columns){const prior=runs.at(-1);if(prior&&x===prior.at(-1)!+1)prior.push(x);else runs.push([x]);}
 expect(runs,JSON.stringify({c,g,dpr,left,top,columns})).toHaveLength(2);const [first,second]=runs;
 expect(Math.abs(first.length-(dir==='rtl'?2:1)*dpr)).toBeLessThanOrEqual(1);
 expect(Math.abs(second.length-(dir==='rtl'?1:2)*dpr)).toBeLessThanOrEqual(1);
 expect(Math.abs(second[0]-first.at(-1)!-1-dpr)).toBeLessThanOrEqual(1);
});

test('only Normal is offered; legacy headings and oversized lines cannot grow endless pages',async({page})=>{
 await open(page);await expect(page.locator('[data-studio-style-control] option')).toHaveText(['Normal']);
 for(const huge of [false,true]){
  await page.locator('.ProseMirror').evaluate((root,huge)=>{const e=(root as HTMLElement&{editor:Editor}).editor;e.commands.setContent({type:'doc',content:[{type:'heading',attrs:{level:1,dir:'rtl',...(huge?{lineHeight:'5000pt'}:{})},content:[{type:'text',text:'اردو عنوان',marks:[{type:'textStyle',attrs:{fontSize:huge?'2000pt':'96pt'}}]}]}]});e.commands.focus('start');},huge);
  if(huge)await expect(page.locator('.ProseMirror h1')).toHaveAttribute('data-studio-oversized-line','true');
  await expect.poll(async()=>Number(await page.locator('[data-studio-page-count]').getAttribute('data-studio-page-count'))).toBeLessThanOrEqual(huge?2:1);
  await page.waitForTimeout(600);
  expect(Number(await page.locator('[data-studio-page-count]').getAttribute('data-studio-page-count'))).toBeLessThanOrEqual(huge?2:1);
  // Read both rectangles in one layout frame: caret following may scroll
  // between two asynchronous boundingBox calls on an oversized line.
  const bounds=await page.evaluate(()=>{const h=document.querySelector('.ProseMirror h1')!.getBoundingClientRect(),p=document.querySelector('[data-studio-page-paper]')!.getBoundingClientRect();return {top:h.top-p.top,bottom:h.bottom-p.bottom};});
  expect(bounds.top).toBeGreaterThanOrEqual(-1);expect(bounds.bottom).toBeLessThanOrEqual(1);
  if(huge)await expect(page.locator('.ProseMirror h1')).toHaveCSS('overflow','hidden');
 }
});
