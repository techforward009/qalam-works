import { interceptLocalJameel, localJameelFetch } from "../helpers/localJameelFont";
import { test, expect, type Page } from "@playwright/test";

/** A normal U+0020 must be stored, and the *painted* caret must advance.
 * This is not a visual-space glyph: InPage shows movement, not a dot. */
async function paintedCaret(page: Page) {
  return page.locator("[data-studio-caret]").evaluate((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.left, y: r.top, pos: Number(node.getAttribute("data-studio-caret-pos")) };
  });
}

test("RTL trailing space advances the visible caret after a word", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.insertText("سلام");
  await expect(page.locator("[data-studio-caret]")).toBeVisible();
  let previous = await paintedCaret(page);
  for (let i = 1; i <= 3; i++) {
    await page.keyboard.press("Space");
    await expect.poll(async () => (await paintedCaret(page)).pos).toBe(previous.pos + 1);
    const next = await paintedCaret(page);
    // In RTL the caret moves left, without adding a visible symbol or changing ink.
    expect(next.x, `space #${i} did not visibly move the caret`).toBeLessThan(previous.x - 0.75);
    previous = next;
  }
  const content = await editor.evaluate(element => {
    const view = (element as HTMLElement & { editor: import("@tiptap/core").Editor }).editor;
    return view.state.doc.textContent;
  });
  expect(content.endsWith("سلام   ")).toBe(true);
  // Preserve actual U+0020 characters, never visible symbols or replacement NBSPs.
  await page.keyboard.press("Backspace");
  await expect.poll(async () => (await paintedCaret(page)).pos).toBe(previous.pos - 1);
});

test("visible space caret adjustment does not alter regular typing or stored marks", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.insertText("یہ ایک");
  const before = await paintedCaret(page);
  await page.keyboard.press("Space");
  const after = await paintedCaret(page);
  await expect.poll(async () => (await paintedCaret(page)).pos).toBe(before.pos + 1);
  expect(after.x).toBeLessThan(before.x - 0.75);
  await page.keyboard.insertText("آزمائش");
  await expect(editor).toContainText("یہ ایک آزمائش");
});

async function prepareSpaces(page: Page, family = 'Mehr Nastaliq Web') {
  await page.setViewportSize({width:1280,height:900});
  await page.addInitScript(()=>localStorage.setItem('qalam-site-language','en'));
  if(family==='Jameel Noori Nastaleeq') await interceptLocalJameel(page);
  await page.goto('/tools/document-studio');
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  const editor=page.locator('.ProseMirror');await editor.click();
  await editor.evaluate((el,font)=>{const e=(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor;e.commands.setContent({type:'doc',content:[{type:'paragraph',attrs:{dir:'rtl',lineHeight:72}}]});e.chain().focus().setMark('textStyle',{fontFamily:font,fontSize:'24pt'}).run();},family);
  const loaded=await page.evaluate(async font=>{try{const faces=await document.fonts.load(`32px "${font}"`);return faces.length>0&&faces.every(f=>f.status==='loaded');}catch{return false;}},family);
  expect(loaded,`${family} must load its actual font; no fallback or skipped checks`).toBe(true);
  await page.addStyleTag({content:'[data-studio-caret]{animation:none!important}'});
  return editor;
}
async function spacesMetric(page: Page, start:number, end:number) {
  return page.locator('.ProseMirror p').evaluate((el,{start,end})=>{
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes:Text[]=[];let n;while(n=walker.nextNode())nodes.push(n as Text);
    const locate=(pos:number):[Text,number]=>{for(const node of nodes){if(pos<=node.length)return[node,pos];pos-=node.length;}throw new Error('offset');};
    const a=locate(start),b=locate(end),range=document.createRange();range.setStart(...a);range.setEnd(...b);
    const s=getComputedStyle(a[0].parentElement!),c=document.createElement('canvas').getContext('2d')!;c.font=s.font;
    const surface=el.closest<HTMLElement>('[data-studio-zoom-surface]')!,scale=surface.getBoundingClientRect().width/parseFloat(surface.style.width);
    return {width:range.getBoundingClientRect().width,advance:c.measureText(' ').width*scale,scale,right:range.getBoundingClientRect().right,text:el.textContent};
  },{start,end});
}
for(const font of ['Jameel Noori Nastaleeq','Mehr Nastaliq Web'])test(`${font}: twenty real spaces keep their advance and native caret agrees with the next letter`,async({page},info)=>{
  const editor=await prepareSpaces(page,font);await page.getByRole('combobox',{name:'Zoom',exact:true}).selectOption('200');await editor.focus();await page.keyboard.insertText('ق');await page.keyboard.type(' '.repeat(20));
  const caret=await paintedCaret(page);await page.keyboard.insertText('ق');
  const m=await spacesMetric(page,1,21);expect(Math.abs(m.width-20*m.advance)).toBeLessThan(2);
  const letter=await spacesMetric(page,21,22);expect(Math.abs(caret.x-letter.right)).toBeLessThan(5);
  expect(m.text).toBe('ق'+' '.repeat(20)+'ق');
  await info.attach('space-metrics',{body:JSON.stringify({font,spaces:m,caret,nextLetter:letter}),contentType:'application/json'});
});
test('three middle spaces keep real width without changing authored text',async({page})=>{
  await prepareSpaces(page);await page.keyboard.insertText('یہ   ایک');const m=await spacesMetric(page,2,5);expect(Math.abs(m.width-3*m.advance)).toBeLessThan(1);expect(m.text).toBe('یہ   ایک');
});

for(const pdfFont of ['Mehr Nastaliq Web','Jameel Noori Nastaleeq'])test(`${pdfFont}: real exported PDF preserves space advances and the editor line endings`,async({page},info)=>{
  test.setTimeout(120000);await prepareSpaces(page,pdfFont);
  const text=(pdfFont==='Jameel Noori Nastaleeq'?'ق ق ق   ق'+' '.repeat(20)+'ق   یہ ایک عبارت ہے   ':'یہ   ایک   عبارت ہے    ق'+' '.repeat(20)+'ق   ').repeat(5);
  await page.keyboard.insertText(text);
  const doc=await page.locator('.ProseMirror').evaluate(el=>(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor.getJSON());

  const editorLines=await page.locator('.ProseMirror p').evaluate(el=>{
    const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;const lines:{top:number;text:string}[]=[];
    while(n=walk.nextNode())for(let i=0;i<(n as Text).length;i++){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const box=r.getBoundingClientRect();let line=lines.at(-1);if(!line||Math.abs(line.top-box.top)>1){line={top:box.top,text:''};lines.push(line);}line.text+=(n as Text).data[i];}
    return lines.map(l=>l.text.trim());
  });
  const {POST}=await import('../../app/api/export-pdf/route');
  const {PdfExportTestRequest}=await import('../helpers/pdfExportRequest');
  const {defaultDocumentSettings}=await import('../../app/tools/document-studio/utils/documentSettings');
  const {default:chromium}=await import('@sparticuz/chromium');const {default:puppeteer}=await import('puppeteer-core');
  const {writeFileSync}=await import('node:fs');const {execFileSync}=await import('node:child_process');
  const settings=defaultDocumentSettings();settings.typography.defaultRtlFontId=pdfFont==='Jameel Noori Nastaleeq'?'jameel-noori-nastaleeq':'mehr-nastaliq-web';
  const margins=await page.locator('[data-studio-print-root]').evaluate(el=>({topMm:Number(el.getAttribute('data-print-margin-top-mm')),bottomMm:Number(el.getAttribute('data-print-margin-bottom-mm')),startMm:Number(el.getAttribute('data-print-margin-right-mm')),endMm:Number(el.getAttribute('data-print-margin-left-mm'))}));
  settings.page.margins={preset:'custom',...margins};
  const path=chromium.executablePath,original=puppeteer.launch,launch=puppeteer.launch.bind(puppeteer);let pdfLines:string[]=[];
  chromium.executablePath=async()=>process.env.PLAYWRIGHT_CHROMIUM_PATH!;
  puppeteer.launch=async options=>{const browser=await launch({...options,args:['--no-sandbox']});const newPage=browser.newPage.bind(browser);browser.newPage=async()=>{const p=await newPage(),pdf=p.pdf.bind(p);p.pdf=async options=>{pdfLines=await p.evaluate(()=>[...document.querySelectorAll<HTMLElement>('[data-pdf-ink-line]')].map(el=>el.textContent!.trim()));writeFileSync(info.outputPath('pdf-line-metrics.json'),JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll<HTMLElement>('[data-pdf-ink-line]')].map(el=>({width:el.getBoundingClientRect().width,style:el.style.cssText,insets:el.dataset.pdfLocalInkInsets}))),null,2));return pdf(options);};return p;};return browser;};
  const restoreFontFetch=pdfFont==='Jameel Noori Nastaleeq'?localJameelFetch():()=>{};
  try{
    const response=await POST(new PdfExportTestRequest('http://localhost/api/export-pdf',{method:'POST',body:JSON.stringify({doc,dir:'rtl',settings})}));
    expect(response.status,response.status===200?'PDF':await response.text()).toBe(200);
    if(pdfFont==='Jameel Noori Nastaleeq')expect(response.headers.get('X-Pdf-Jameel-Used')).toBe('yes');
    const file=info.outputPath('spaces.pdf');writeFileSync(file,Buffer.from(await response.arrayBuffer()));
    const fonts=execFileSync('pdffonts',[file]).toString();expect(fonts).toContain(pdfFont==='Jameel Noori Nastaleeq'?'Jameel':'Mehr');expect(fonts).toContain('CID TrueType');
    execFileSync('pdftoppm',['-f','1','-singlefile','-r','96','-png',file,info.outputPath('spaces-pdf')]);
    const bbox=execFileSync('pdftotext',['-bbox',file,'-'],{encoding:'utf8'});
    const qs=[...bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)"[^>]*>ق<\/word>/g)].map(m=>({left:Number(m[1]),top:Number(m[2]),right:Number(m[3])}));
    expect(qs.length).toBeGreaterThanOrEqual(2);
    const firstTop=Math.min(...qs.map(q=>q.top)),pair=qs.filter(q=>Math.abs(q.top-firstTop)<0.1).sort((a,b)=>a.left-b.left);
    expect(pair.length).toBeGreaterThanOrEqual(2);
    const measured=await spacesMetric(page,text.indexOf(' '.repeat(20)),text.indexOf(' '.repeat(20))+20);
    expect(pair.some((q,i)=>i>0&&Math.abs(q.left-pair[i-1].right-measured.advance*20*72/96)<2),'real PDF must paint the twenty-space gap').toBe(true);

    writeFileSync(info.outputPath('line-comparison.json'),JSON.stringify({editorLines,pdfLines},null,2));
    expect(pdfLines).toEqual(editorLines);
    expect(pdfLines.join('').replace(/\s/g,'')).toBe(text.replace(/\s/g,''));
    await page.locator('[data-studio-pages-stack]').screenshot({path:info.outputPath('spaces-editor.png'),scale:'css'});
  }finally{restoreFontFetch();chromium.executablePath=path;puppeteer.launch=original;}
});
test('preserved spaces retain alignment, selection/delete, undo and Enter pagination',async({page})=>{
  const editor=await prepareSpaces(page);await page.keyboard.insertText('یہ   ایک متن');
  await page.keyboard.press('Control+a');await page.getByRole('button',{name:'Align center',exact:true}).click();
  await expect(editor.locator('p')).toHaveCSS('text-align','center');
  await page.getByRole('button',{name:'Justify',exact:true}).click();await expect(editor.locator('p')).toHaveCSS('text-align','justify');
  await page.waitForTimeout(600); // Separate deletion from the prior typing/formatting history group.
  await editor.click();await page.locator('[data-menu-root="edit"]').click();await page.locator('[data-menu-action="edit.selectAll"]').click();await editor.focus();await page.keyboard.press('Backspace');await expect.poll(()=>editor.evaluate(el=>(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor.getText())).toBe('');
  await page.keyboard.press('Control+z');await expect(editor).toContainText('یہ   ایک متن');
  await editor.locator('p').first().click();await editor.press('End');
  for(let i=0;i<45;i++)await page.keyboard.press('Enter');
  await expect.poll(()=>page.locator('[data-studio-page-paper]').count()).toBeGreaterThan(1);
  await expect(page.locator('[data-studio-caret]')).toBeVisible();
  await expect.poll(()=>page.locator('[data-studio-caret]').evaluate(el=>{const r=el.getBoundingClientRect(),v=document.querySelector('[data-studio-scroller]')!.getBoundingClientRect();return r.top>=v.top&&r.bottom<=v.bottom;})).toBe(true);
});

for(const zoom of ['100','200']) {
 test(`Jameel ${zoom}%: single spaces have their nominal advance`,async({page},info)=>{
  await prepareSpaces(page,'Jameel Noori Nastaleeq');await page.getByRole('combobox',{name:'Zoom',exact:true}).selectOption(zoom);await page.locator('.ProseMirror').focus();
  await page.keyboard.insertText('ق ق ق');
  for(const at of [1,3]){const m=await spacesMetric(page,at,at+1);expect(Math.abs(m.advance/m.scale-8)).toBeLessThan(.1);expect(Math.abs(m.width-m.advance)).toBeLessThan(1);}
  const client=await page.context().newCDPSession(page);await client.send('DOM.enable');await client.send('CSS.enable');const {root}=await client.send('DOM.getDocument');
  const {nodeIds}=await client.send('DOM.querySelectorAll',{nodeId:root.nodeId,selector:'.ProseMirror p span'});
  const fonts=(await Promise.all(nodeIds.map(nodeId=>client.send('CSS.getPlatformFontsForNode',{nodeId})))).flatMap(result=>result.fonts);
  await info.attach('actual-fonts',{body:JSON.stringify(fonts),contentType:'application/json'});
  expect(fonts.some(f=>/Jameel/i.test(f.familyName)&&f.isCustomFont&&f.glyphCount>0),'qaf glyphs must use the attached Jameel font').toBe(true);
  expect(await page.locator('.ProseMirror p').evaluate(el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(/ق/.test(n.textContent??'')&&getComputedStyle(n.parentElement!).fontFeatureSettings.includes('ccmp'))return false;return true;}),'ccmp remains enabled for shaped letters').toBe(true);
 });
 test(`Jameel ${zoom}%: every trailing space widens the line and moves the caret`,async({page})=>{
  const editor=await prepareSpaces(page,'Jameel Noori Nastaleeq');await page.getByRole('combobox',{name:'Zoom',exact:true}).selectOption(zoom);await editor.focus();await page.keyboard.insertText('ق');
  let before=await paintedCaret(page);
  for(let n=1;n<=3;n++){await page.keyboard.press('Space');await expect.poll(async()=> (await paintedCaret(page)).pos).toBe(before.pos+1);const next=await paintedCaret(page),m=await spacesMetric(page,1,n+1);expect(Math.abs(m.width-n*m.advance)).toBeLessThan(1);expect(Math.abs(before.x-next.x-m.advance)).toBeLessThan(2);before=next;}
  expect(await editor.evaluate(el=>(el as HTMLElement & {editor:import('@tiptap/core').Editor}).editor.state.doc.textContent)).toBe('ق   ');
 });
}
