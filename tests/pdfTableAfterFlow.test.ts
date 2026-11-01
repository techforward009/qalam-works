import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import {PDFDocument} from "pdf-lib";
import {POST} from "../app/api/export-pdf/route";
import {defaultDocumentSettings} from "../app/tools/document-studio/utils/documentSettings";
import {PdfExportTestRequest} from "./helpers/pdfExportRequest";
const chrome=process.env.QALAM_PDF_CHROMIUM;
describe.runIf(Boolean(chrome))("printed RTL table paragraphs and mm indent",()=>{
 const launch=puppeteer.launch.bind(puppeteer);
 const inspections:any[]=[];
 beforeAll(()=>{
  vi.spyOn(chromium,"executablePath").mockResolvedValue(chrome!);
  vi.spyOn(puppeteer,"launch").mockImplementation(async options=>{
   const browser=await launch({...options,args:["--no-sandbox","--disable-setuid-sandbox"]});
   const newPage=browser.newPage.bind(browser);
   vi.spyOn(browser,"newPage").mockImplementation(async()=>{
    const page=await newPage(),pdf=page.pdf.bind(page);
    vi.spyOn(page,"pdf").mockImplementation(async options=>{
      const inspection=await page.evaluate(()=>{
       const table=document.querySelector<HTMLElement>("table.qalam-document-table");
       const paragraphs=[...document.querySelectorAll<HTMLElement>("p")];
       const post=paragraphs.find(p=>p.textContent?.includes("نیچے کی عبارت"));
       if(!table||!post)return {missing:true,table:table?.outerHTML.slice(0,700),post:post?.outerHTML.slice(0,350)};
       const rect=table.getBoundingClientRect(),next=post.getBoundingClientRect(),css=getComputedStyle(table);
       const range=document.createRange();range.selectNodeContents(post);
       return {rect:{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right},after:{top:next.top,textTop:range.getBoundingClientRect().top},
        marginRight:css.marginRight,dir:css.direction,style:table.getAttribute("style"),rows:table.querySelectorAll("tr").length};
      });
      inspections.push(inspection);
      return pdf(options);
    });return page;
   });return browser;
  });
 });
 afterAll(()=>vi.restoreAllMocks());
 it("exports 2x2 RTL table 10mm right indent with following Urdu paragraph below it",async()=>{
  const cell=(text:string)=>({type:"tableCell",attrs:{colwidth:[30*96/25.4],tableBorderStyle:"none"},
   content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text}]}]});
  const makeTable=(indent:number)=>({type:"table",attrs:{dir:"rtl",tableFlow:"rtl",tableAlignment:"right",tableIndentMm:indent,tableFormatWidthPx:300},
   content:[{type:"tableRow",content:[cell("ایک"),cell("دو")]},{type:"tableRow",content:[cell("تین"),cell("چار")]}]});
  const settings=defaultDocumentSettings();settings.headerFooter.headerEnabled=false;settings.headerFooter.footerEnabled=false;
  for(const indent of [0,10]){
   const doc={type:"doc",content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"پہلے کا متن"}]},makeTable(indent),
    {type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"نیچے کی عبارت یہاں ہے"}]}]};
   const response=await POST(new PdfExportTestRequest("http://localhost/api/export-pdf",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({doc,dir:"rtl",settings})}));
   expect(response.status).toBe(200);
   const bytes=new Uint8Array(await response.arrayBuffer());expect(bytes.length).toBeGreaterThan(3000);
   expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(1);
  }
  expect(inspections).toHaveLength(2);
  for(const item of inspections){
   expect(item.missing).toBeUndefined();
   expect(item.rows).toBe(2);expect(item.dir).toBe("rtl");
   expect(item.after.top).toBeGreaterThanOrEqual(item.rect.bottom-2);
   expect(item.after.textTop).toBeGreaterThanOrEqual(item.rect.bottom-2);
  }
  // The print renderer flattens each table into an absolutely positioned
  // snapshot. It deliberately resets margin:0 on the clone, but its measured
  // horizontal placement must move left by precisely the 10mm right indent.
  const shift=inspections[0].rect.right-inspections[1].rect.right;
  expect(shift).toBeCloseTo(10*96/25.4,0);
 },120000);
});
