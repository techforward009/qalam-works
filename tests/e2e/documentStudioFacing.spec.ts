import {test,expect,type Page} from '@playwright/test';
import type {Editor} from '@tiptap/core';
import sharp from 'sharp';
async function open(page:Page){await page.setViewportSize({width:1920,height:1080});await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));await page.goto('/tools/document-studio');await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();await expect(page.locator('.ProseMirror')).toBeFocused();await page.evaluate(()=>document.fonts.ready.then(()=>undefined));}
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
 expect(boxes).toHaveLength(5);expect(Math.abs(boxes[0].left-boxes[2].left-boxes[2].width/2)).toBeLessThanOrEqual(1);expect(boxes[1].left).toBeGreaterThan(boxes[2].left);expect(boxes[1].top).toBeCloseTo(boxes[2].top);expect(boxes[3].top).toBeCloseTo(boxes[4].top);expect(Math.abs(boxes[1].left-(boxes[2].left+boxes[2].width))).toBeLessThan(.1);
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

for(const zoom of ['50','100','200','300'])test(`facing arrows cross every sheet both ways at ${zoom}%`,async({page})=>{
 test.setTimeout(180000);await open(page);await seed(page);await view(page,'facing');await page.locator('[data-studio-zoom-control]').selectOption(zoom);await page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.commands.focus('start'));await settle(page);
 const down=new Set<string>(),up=new Set<string>();
 for(const [key,seen] of [['ArrowDown',down],['ArrowUp',up]] as const){
  for(let i=0;i<200;i++){
   await page.keyboard.press(key);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   expect(await page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.state.selection.$head.index(0))).toBe(key==='ArrowDown'?Math.min(i+1,169):Math.max(168-i,0));
   const at=await caretPage(page);if(at&&!seen.has(at)){seen.add(at);await visible(page);}
  }
  expect([...seen].sort()).toEqual(['1','2','3','4','5']);
 }
 await expect.poll(()=>page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.state.selection.$head.index(0))).toBe(0);
});

test('page one and its own pasteboard are centred like Single at every zoom',async({page})=>{
 await open(page);await page.locator('[data-studio-tool-button="select"]').click();
 for(const zoom of ['50','100','200','300']){
  await view(page,'pages');await page.locator('[data-studio-zoom-control]').selectOption(zoom);await settle(page);
  // Centre the horizontal viewport on its content, independent of the last caret.
  const centre=()=>page.locator('[data-studio-scroller]').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.querySelector('[data-studio-page-paper="1"]')!.getBoundingClientRect();el.scrollLeft+=(p.left+p.right)/2-(r.left+el.clientLeft+el.clientWidth/2);});
  await centre();await settle(page);
  const single=await page.locator('[data-studio-page-paper="1"]').evaluate(el=>{const r=el.getBoundingClientRect();return (r.left+r.right)/2;});
  await view(page,'facing');await settle(page);
  const result=await page.evaluate(()=>{const p=document.querySelector('[data-studio-page-paper="1"]')!.getBoundingClientRect(),s=document.querySelector('[data-studio-scroller]')!,r=s.getBoundingClientRect(),row=document.querySelector('[data-studio-facing-row="1"]')!,b=row.getBoundingClientRect();return {page:(p.left+p.right)/2,viewport:r.left+s.clientLeft+s.clientWidth/2,scroll:s.scrollLeft,centredScroll:(s.scrollWidth-s.clientWidth)/2,pasteboard:(b.left+b.right)/2,topBorder:getComputedStyle(row).borderTopWidth};});
  expect(Math.abs(result.page-single)).toBeLessThanOrEqual(1);expect(Math.abs(result.page-result.pasteboard)).toBeLessThanOrEqual(1);expect(Math.abs(result.page-result.viewport)).toBeLessThanOrEqual(1);expect(result.topBorder).toBe('0px');expect(Math.abs(result.scroll-result.centredScroll)).toBeLessThanOrEqual(1);
  await page.locator('[data-studio-tool-button="text"]').click();await page.locator('.ProseMirror p').first().click();await page.keyboard.insertText('abc');await settle(page);await expect.poll(()=>caretPage(page)).toBe('1');await visible(page);await expect(page.locator('.ProseMirror p').first()).toContainText('abc');await page.locator('[data-studio-tool-button="select"]').click();
 }
});

test('twenty-page Facing typing stays close to Single without repeated full-document measurement',async({page},testInfo)=>{
 test.setTimeout(120000);await open(page);
 await page.locator('.ProseMirror').evaluate(root=>{const e=(root as HTMLElement&{editor:Editor}).editor;e.commands.setContent({type:'doc',content:Array.from({length:760},(_,i)=>({type:'paragraph',attrs:{dir:'rtl'},content:[{type:'text',text:`یہ صفحے کی سطر ${i+1} ہے۔`}]}))});e.commands.focus('start');});await settle(page);
 expect(Number(await page.locator('[data-studio-page-count]').getAttribute('data-studio-page-count'))).toBeGreaterThanOrEqual(20);
 const timings:Record<string,{median:number;p90:number;longTasks:number;maxTask:number}>={};
 for(const mode of ['pages','facing'] as const){await view(page,mode);await page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.commands.focus('start'));await settle(page);
  timings[mode]=await page.locator('.ProseMirror').evaluate(async root=>{
   const e=(root as HTMLElement&{editor:Editor}).editor,frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   for(let i=0;i<5;i++){e.commands.insertContent('ا');await frame();}
   const tasks:number[]=[],observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())tasks.push(entry.duration);});observer.observe({type:'longtask'});
   const times:number[]=[];for(let i=0;i<60;i++){const start=performance.now();e.commands.insertContent('ا');await frame();times.push(performance.now()-start);}await frame();observer.disconnect();times.sort((a,b)=>a-b);
   return {median:times[30],p90:times[54],longTasks:tasks.length,maxTask:Math.max(0,...tasks)};
  });
 }
 console.log('TYPING_TIMINGS',JSON.stringify(timings));await testInfo.attach('typing-times.json',{body:JSON.stringify(timings,null,2),contentType:'application/json'});
 // Leave headroom for shared-runner scheduling while detecting the former 3x regression.
 expect(timings.facing.median).toBeLessThan(timings.pages.median*1.6+8);expect(timings.facing.p90).toBeLessThan(timings.pages.p90*1.8+12);
});

test('quote borders paint only on the left inside Facing sheets at 50% and 100%',async({page},testInfo)=>{
 await open(page);await page.locator('.ProseMirror').evaluate(root=>{const e=(root as HTMLElement&{editor:Editor}).editor;e.commands.setContent({type:'doc',content:[{type:'blockquote',content:Array.from({length:380},(_,i)=>({type:'paragraph',attrs:{dir:'rtl'},content:[{type:'text',text:`اقتباس ${i+1} — عبارت`}]}))}]});e.commands.focus('start');});await view(page,'facing');await page.locator('[data-studio-zoom-control]').selectOption('50');await settle(page);
 // Keep the stored caret on page one while inspecting a distant spread.
 await page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.commands.focus('start'));await settle(page);await page.locator('[data-studio-scroller]').dispatchEvent('wheel',{deltaY:0});
 for(const zoom of ['50','100']){await page.locator('[data-studio-zoom-control]').selectOption(zoom);await settle(page);for(const number of ['1','8']){
  await page.locator('[data-studio-scroller]').evaluate((el,number)=>{const r=el.getBoundingClientRect(),p=el.querySelector(`[data-studio-page-paper="${number}"]`)!.getBoundingClientRect();el.scrollTop+=p.top-r.top-30;},number);await settle(page);
  const metrics=await page.evaluate(number=>({textOnPage:[...document.querySelectorAll('.ProseMirror p')].some(p=>{const r=p.getBoundingClientRect(),paper=document.querySelector(`[data-studio-page-paper="${number}"]`)!.getBoundingClientRect();return getComputedStyle(p).visibility==='visible'&&r.top>=paper.top&&r.bottom<=paper.bottom&&r.left>=paper.left&&r.right<=paper.right;}),papers:[...document.querySelectorAll('[data-studio-page-paper]')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}),clip:(()=>{const r=document.querySelector('[data-studio-scroller]')!.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};})(),borders:[...document.querySelectorAll('.ProseMirror blockquote')].map(el=>{const s=getComputedStyle(el);return [s.borderLeftColor,s.borderRightColor];})}),number);
  expect(metrics.textOnPage).toBe(true);
  expect(metrics.borders.every(pair=>pair.every(color=>color==='rgba(0, 0, 0, 0)'))).toBe(true);
  const image=await page.screenshot({scale:'css'});await testInfo.attach(`quotes-${number}.png`,{body:image,contentType:'image/png'});const {data,info}=await sharp(image).removeAlpha().raw().toBuffer({resolveWithObject:true});let inside=0,outside=0;
  for(let y=Math.ceil(metrics.clip.top);y<Math.min(info.height,metrics.clip.bottom);y++)for(let x=Math.ceil(metrics.clip.left);x<Math.min(info.width,metrics.clip.right);x++){const i=(y*info.width+x)*info.channels;if(data[i]>150&&data[i]>data[i+1]*1.2&&data[i+1]>data[i+2]*1.4&&data[i+2]<200){if(metrics.papers.some(p=>x>=p.left-1&&x<p.right+1&&y>=p.top-1&&y<p.bottom+1))inside++;else outside++;}}
  expect(inside).toBeGreaterThan(0);expect(outside).toBe(0);
 }}
 await page.emulateMedia({media:'print'});await expect(page.locator('.ProseMirror blockquote')).not.toHaveCSS('border-left-color','rgba(0, 0, 0, 0)');
});

for(const zoom of ['100','200'])test(`one hard-break visual line per facing arrow at ${zoom}%`,async({page})=>{
 test.setTimeout(60000);await open(page);await page.locator('.ProseMirror').evaluate(root=>{const e=(root as HTMLElement&{editor:Editor}).editor;e.commands.setContent({type:'doc',content:[{type:'paragraph',attrs:{dir:'rtl'},content:Array.from({length:60},(_,i)=>[{type:'text',text:`سطر نمبر ${i+1}`},...(i<59?[{type:'hardBreak'}]:[])]).flat()}]});e.commands.focus('start');});await view(page,'facing');await page.locator('[data-studio-zoom-control]').selectOption(zoom);await page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.commands.focus('start'));await settle(page);
 for(const key of ['ArrowDown','ArrowUp'])for(let i=0;i<60;i++){
  await page.keyboard.press(key);const line=await page.locator('.ProseMirror').evaluate(root=>{const h=(root as HTMLElement&{editor:Editor}).editor.state.selection.$head;let line=0;h.parent.forEach((node,offset)=>{if(offset<h.parentOffset&&node.type.name==='hardBreak')line++;});return line;});expect(line).toBe(key==='ArrowDown'?Math.min(i+1,59):Math.max(58-i,0));
 }
});

for(const zoom of ['100','200'])test(`held arrows keep the facing caret visible like Single at ${zoom}%`,async({page},testInfo)=>{
 test.setTimeout(90000);await open(page);await seed(page);await page.addStyleTag({content:'[data-studio-caret]{animation:none!important;opacity:1!important}'});const results:Record<string,{frames:number;bad:number;longest:number;paragraph:number}>={};
 for(const mode of ['pages','facing'] as const){await view(page,mode);await page.locator('[data-studio-zoom-control]').selectOption(zoom);await page.locator('.ProseMirror').evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.commands.focus('start'));await settle(page);await visible(page);
  await page.evaluate(()=>{const state={frames:0,bad:0,longest:0,run:0,frame:0,absent:0,offscreen:0};(window as typeof window&{repeatProbe:typeof state}).repeatProbe=state;const tick=()=>{const c=document.querySelector('[data-studio-caret]')?.getBoundingClientRect(),s=document.querySelector('[data-studio-scroller]') as HTMLElement,r=s.getBoundingClientRect(),left=r.left+s.clientLeft,top=r.top+s.clientTop;state.frames++;if(!c||c.top<top-1||c.bottom>top+s.clientHeight+1||c.left<left-1||c.right>left+s.clientWidth+1){state.bad++;if(!c)state.absent++;else state.offscreen++;state.longest=Math.max(state.longest,++state.run);}else state.run=0;state.frame=requestAnimationFrame(tick);};state.frame=requestAnimationFrame(tick);});
  const started=Date.now();for(let i=0;i<120;i++){const wait=started+i*33-Date.now();if(wait>0)await page.waitForTimeout(wait);await page.keyboard.down('ArrowDown');}await page.keyboard.up('ArrowDown');await settle(page);
  results[mode]=await page.evaluate(()=>{const state=(window as typeof window&{repeatProbe:{frames:number;bad:number;longest:number;frame:number;absent:number;offscreen:number}}).repeatProbe;cancelAnimationFrame(state.frame);return {frames:state.frames,bad:state.bad,longest:state.longest,absent:state.absent,offscreen:state.offscreen,paragraph:(document.querySelector('.ProseMirror') as HTMLElement&{editor:Editor}).editor.state.selection.$head.index(0)};});expect(results[mode].paragraph).toBeGreaterThanOrEqual(100);
 }
 expect(results.facing.paragraph).toBe(120);console.log('REPEAT_VISIBILITY',zoom,JSON.stringify(results));await testInfo.attach(`repeat-${zoom}.json`,{body:JSON.stringify(results),contentType:'application/json'});expect(results.facing.bad/results.facing.frames).toBeLessThanOrEqual(results.pages.bad/results.pages.frames+.12);expect(results.facing.longest).toBeLessThanOrEqual(Math.max(3,results.pages.longest+3));
});

test('fresh Facing and zoom/view switches centre page one before caret following',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qalam-document-studio-view-mode-v1','facing'));await open(page);await expect(page.locator('[data-studio-view]')).toHaveAttribute('data-studio-view','facing');
 for(const zoom of ['50','100','200','300']){
  await page.locator('[data-studio-zoom-control]').selectOption(zoom);await settle(page);await visible(page);
  const assertPosition=async()=>{const info=await page.evaluate(()=>{const s=document.querySelector('[data-studio-scroller]') as HTMLElement,r=s.getBoundingClientRect(),c=document.querySelector('[data-studio-caret]')!.getBoundingClientRect(),mid=(s.scrollWidth-s.clientWidth)/2,delta=s.scrollLeft-mid,left=r.left+s.clientLeft,right=left+s.clientWidth,caretAtCentre={left:c.left+delta,right:c.right+delta};const pan=caretAtCentre.left<left?caretAtCentre.left-left-1:caretAtCentre.right>right?caretAtCentre.right-right+1:0;return {actual:s.scrollLeft,expected:mid+pan};});expect(Math.abs(info.actual-info.expected)).toBeLessThanOrEqual(2);};
  await assertPosition();await view(page,'pages');await view(page,'facing');await assertPosition();await visible(page);
 }
});

for(const mode of ['pages','facing'] as const)test(`everyday Urdu editing and menus in ${mode}`,async({page},testInfo)=>{
 test.setTimeout(60000);await open(page);if(mode==='facing')await view(page,mode);await page.keyboard.insertText('السلام علیکم، یہ روزمرہ تحریر ہے۔');await page.keyboard.press('Enter');await page.keyboard.insertText('دوسری عبارت اور جانچ');
 const story=page.locator('.ProseMirror');await expect(story).toContainText('دوسری عبارت');const before=await story.textContent();await page.waitForTimeout(550);
 await story.evaluate(root=>{const e=(root as HTMLElement&{editor:Editor}).editor,end=e.state.selection.head;e.commands.setTextSelection({from:end-4,to:end});});await expect(page.locator('[data-studio-line-selection]').first()).toBeVisible();await page.keyboard.press('Backspace');expect(await story.textContent()).not.toBe(before);await page.keyboard.press('Control+z');await expect(story).toHaveText(before!);
 await story.evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.commands.selectAll());await page.locator('[data-studio-font-size]').selectOption('18');await expect(story.locator('span[style*="font-size"]').first()).toHaveCSS('font-size','24px');await page.getByRole('combobox',{name:'Colour',exact:true}).selectOption('#1A3A2A');await expect(story.locator('span[style*="color"]').first()).toHaveCSS('color','rgb(26, 58, 42)');await page.getByRole('button',{name:'Left to right',exact:true}).click();await expect(story.locator('p').first()).toHaveAttribute('dir','ltr');await page.getByRole('button',{name:'Right to left',exact:true}).click();await expect(story.locator('p').first()).toHaveAttribute('dir','rtl');await story.evaluate(root=>(root as HTMLElement&{editor:Editor}).editor.commands.focus('end'));
 for(let i=0;i<50;i++)await page.keyboard.press('Enter');await settle(page);expect(Number(await page.locator('[data-studio-page-count]').getAttribute('data-studio-page-count'))).toBeGreaterThanOrEqual(2);await visible(page);
 for(const id of await page.locator('[data-menu-root]').evaluateAll(els=>els.map(el=>el.getAttribute('data-menu-root')!))){await page.locator(`[data-menu-root="${id}"]`).click();await expect(page.getByRole('menu').first()).toBeVisible();await page.keyboard.press('Escape');}
 await page.locator('[data-menu-root="view"]').click();await page.locator('[data-menu-action="view.fullscreen"]').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 // Main's body-portaled dropdown is occluded by the native fullscreen layer.
 // Fullscreen entry is verified above; API exit is cleanup, NOT UI verification.
 testInfo.annotations.push({type:'main limitation',description:'Fullscreen exit menu is occluded on clean main; unchanged in this five-fix task.'});
 await page.evaluate(()=>document.exitFullscreen());await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
 for(const zoom of ['50','100','200']){await page.locator('[data-studio-zoom-control]').selectOption(zoom);await settle(page);}await view(page,mode==='pages'?'facing':'pages');await view(page,mode);await expect(story).toContainText('السلام علیکم');await expect(story).toContainText('دوسری عبارت');
});
