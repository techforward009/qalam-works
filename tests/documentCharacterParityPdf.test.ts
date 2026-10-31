import {expect,it,vi} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import {POST} from '../app/api/export-pdf/route';
import {PdfExportTestRequest} from './helpers/pdfExportRequest';
import {defaultDocumentSettings} from '../app/tools/document-studio/utils/documentSettings';
it('real exported PDF preserves scaling and legacy baseline-shift geometry',async()=>{
 const dir='/tmp/qalam-character-parity/pdf';mkdirSync(dir,{recursive:true});
 const launch=puppeteer.launch.bind(puppeteer),errors:string[]=[];let printed:{text:string;width:number;height:number;right:number;shift:number|null}[]=[];
 vi.spyOn(chromium,'executablePath').mockResolvedValue(process.env.QALAM_PDF_CHROMIUM||'/usr/bin/chromium');
 vi.spyOn(puppeteer,'launch').mockImplementation(async options=>{const browser=await launch({...options,args:['--no-sandbox','--disable-setuid-sandbox']});const newPage=browser.newPage.bind(browser);vi.spyOn(browser,'newPage').mockImplementation(async()=>{const page=await newPage();page.on('pageerror',error=>errors.push(String(error)));const pdf=page.pdf.bind(page);vi.spyOn(page,'pdf').mockImplementation(async options=>{printed=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('[data-pdf-ink-line]')].map(line=>{const walk=document.createTreeWalker(line,NodeFilter.SHOW_TEXT),rects:DOMRect[]=[];while(walk.nextNode()){const r=document.createRange();r.selectNodeContents(walk.currentNode);rects.push(...r.getClientRects());}const shift=line.querySelector<HTMLElement>('[data-baseline]');return{text:line.textContent||'',width:Math.max(...rects.map(r=>r.right))-Math.min(...rects.map(r=>r.left)),height:Math.max(...rects.map(r=>r.bottom))-Math.min(...rects.map(r=>r.top)),right:Math.max(...rects.map(r=>r.right)),shift:shift?parseFloat(getComputedStyle(shift).top):null};}));return pdf(options);});return page;});return browser;});
 try{
  const settings=defaultDocumentSettings();settings.headerFooter.headerEnabled=false;settings.headerFooter.footerEnabled=false;
  const sample='السلام علیکم و رحمۃ اللہ و برکاتہ';
  const run=(text:string,fontFamily:string,attrs:Record<string,unknown>={})=>({type:'paragraph',attrs:{dir:fontFamily==='Inter'?'ltr':'rtl'},content:[{type:'text',text,marks:[{type:'textStyle',attrs:{fontFamily,fontSize:'30pt',...attrs}}]}]});
  const request=(font:string)=>POST(new PdfExportTestRequest('http://localhost/api/export-pdf',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dir:'rtl',settings,doc:{type:'doc',content:[run(sample,font),run(sample,font,{charScale:99,scalePercent:99}),run(sample,font,{charScale:90,scalePercent:90}),run('upper', 'Inter',{baselineShift:8}),run('lower','Inter',{baselineShift:-8})]}})}));
  let font='Mehr Nastaliq Web',response=await request(font);
  if(response.status!==200){const reason=await response.text();console.log('Mehr PDF unavailable; explicitly using bundled Amiri:',reason);writeFileSync(`${dir}/mehr-error.txt`,reason);font='Amiri';response=await request(font);}
  expect(response.status,response.status===200?'PDF generated':await response.text()).toBe(200);
  const data=Buffer.from(await response.arrayBuffer()),file=`${dir}/character-parity.pdf`;writeFileSync(file,data);writeFileSync(`${dir}/metrics.json`,JSON.stringify({font,printed,errors},null,2));
  expect(errors).toEqual([]);expect(printed.length).toBe(5);
  expect(Math.abs(printed[1].width/printed[0].width-.99)).toBeLessThan(.008);expect(Math.abs(printed[2].width/printed[0].width-.9)).toBeLessThan(.008);
  for(const line of printed.slice(1,3)){expect(Math.abs(line.height-printed[0].height)).toBeLessThan(1);expect(Math.abs(line.right-printed[0].right)).toBeLessThan(1);}
  expect(printed[3].shift).toBeCloseTo(-8*96/72,1);expect(printed[4].shift).toBeCloseTo(8*96/72,1);
  const fonts=execFileSync('pdffonts',[file],{encoding:'utf8'});writeFileSync(`${dir}/fonts.txt`,fonts);expect(fonts).toMatch(/TrueType|Type 1/);expect(fonts).not.toMatch(/Type 3/);
  const text=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});expect(text).toContain('upper');expect(text).toContain('lower');
  execFileSync('pdftoppm',['-f','1','-singlefile','-scale-to','1200','-png',file,`${dir}/inspected-page`]);console.log(JSON.stringify({font,printed,fonts}));
 }finally{vi.restoreAllMocks();}
},90000);
