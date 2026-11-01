import {beforeAll,afterAll,describe,it,expect,vi} from "vitest";
import {mkdirSync,writeFileSync} from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import {PDFDocument} from "pdf-lib";
import {PdfExportTestRequest} from "./helpers/pdfExportRequest";
import {POST} from "../app/api/export-pdf/route";
import {defaultDocumentSettings} from "../app/tools/document-studio/utils/documentSettings";

const output = "tests/screenshots/qalam-tables";
const chrome = process.env.QALAM_PDF_CHROMIUM;
describe.runIf(Boolean(chrome))("real PDF table export",()=>{
 const launch=puppeteer.launch.bind(puppeteer);
 beforeAll(()=>{
   mkdirSync(output,{recursive:true});
   vi.spyOn(chromium,"executablePath").mockResolvedValue(chrome!);
   vi.spyOn(puppeteer,"launch").mockImplementation(async options=>{
     const browser=await launch({...options,args:["--no-sandbox","--disable-setuid-sandbox"]});
     const nextPage=browser.newPage.bind(browser);
     vi.spyOn(browser,"newPage").mockImplementation(async ()=>{
       const page=await nextPage();
       const pdf=page.pdf.bind(page);
       vi.spyOn(page,"pdf").mockImplementation(async options=>{
         await page.screenshot({path:`${output}/table-pdf-page.png`,fullPage:true});
         const count=await page.evaluate(()=>[...document.querySelectorAll("table[data-pdf-table]")].map(t=>({
           rows:t.querySelectorAll("tr").length,
           cells:[...t.querySelectorAll("tr")].map(r=>r.querySelectorAll("td,th").length),
           border:getComputedStyle(t.querySelector("td")!).borderTopWidth,
           dir:getComputedStyle(t.querySelector("td")!).direction,
         })));
         writeFileSync(`${output}/table-dom.json`,JSON.stringify(count,null,2));
         expect(count).toEqual([{rows:3,cells:[2,2,2],border:"0px",dir:"rtl"}]);
         return pdf(options);
       });
       return page;
     });
     return browser;
   });
 });
 afterAll(()=>vi.restoreAllMocks());
 it("exports three RTL rows and two bordered cells per row into a real PDF",async()=>{
   const settings=defaultDocumentSettings();
   settings.headerFooter.headerEnabled=false;
   settings.headerFooter.footerEnabled=false;
   const cell=(value:string)=>({type:"tableCell",content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:value}]}]});
   const doc={type:"doc",content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"RTL table grid test"}]},
     {type:"table",content:[["First","Second"],["Third","Fourth"],["Fifth","Sixth"]].map(row=>({type:"tableRow",content:row.map(cell)}))}]};
   const response=await POST(new PdfExportTestRequest("http://localhost/api/export-pdf",{
     method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doc,dir:"rtl",settings})
   }));
   const body=new Uint8Array(await response.arrayBuffer());
   expect(response.status,await Promise.resolve(String.fromCharCode(...body.slice(0,1500)))).toBe(200);
   expect(body.byteLength).toBeGreaterThan(3000);
   const pdf=await PDFDocument.load(body);
   expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
   writeFileSync(`${output}/table-3x2.pdf`,body);
 },120000);
});
