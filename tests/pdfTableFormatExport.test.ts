import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {mkdirSync,writeFileSync} from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import {PDFDocument} from "pdf-lib";
import {POST} from "../app/api/export-pdf/route";
import {defaultDocumentSettings} from "../app/tools/document-studio/utils/documentSettings";
import {PdfExportTestRequest} from "./helpers/pdfExportRequest";
const chrome=process.env.QALAM_PDF_CHROMIUM;
const out="tests/screenshots/qalam-table-format";
describe.runIf(Boolean(chrome))("Table Format styles in actual PDF",()=>{
 const launch=puppeteer.launch.bind(puppeteer);
 beforeAll(()=>{
  mkdirSync(out,{recursive:true});
  vi.spyOn(chromium,"executablePath").mockResolvedValue(chrome!);
  vi.spyOn(puppeteer,"launch").mockImplementation(async options=>{
   const browser=await launch({...options,args:["--no-sandbox","--disable-setuid-sandbox"]});
   const next=browser.newPage.bind(browser);
   vi.spyOn(browser,"newPage").mockImplementation(async ()=>{
    const page=await next(),pdf=page.pdf.bind(page);
    vi.spyOn(page,"pdf").mockImplementation(async options=>{
     await page.screenshot({path:out+"/pdf-render.png",fullPage:true});
     const result=await page.evaluate(()=>Array.from(document.querySelectorAll("table[data-pdf-table]")).map(table=>{
       const cells=Array.from(table.querySelectorAll("td"));
       return cells.map(el=>{
         const svg=el.querySelector("svg.qalam-pdf-cell-borders");
         const rects=svg?Array.from(svg.querySelectorAll("rect")).map(r=>({
           fill:r.getAttribute("fill"),
           width:r.getAttribute("width"),
           height:r.getAttribute("height"),
           edge:r.getAttribute("data-edge"),
         })):[];
         return {
           cssBorder:getComputedStyle(el).borderTopStyle,
           bg:getComputedStyle(el).backgroundColor,
           text:el.textContent?.trim(),
           svgPresent:Boolean(svg),
           rects,
         };
       });
     }));
     writeFileSync(out+"/pdf-inspection.json",JSON.stringify(result,null,2));
     // Product draws visible borders as SVG rects; CSS border stays none/transparent.
     expect(result[0][0].cssBorder).toBe("none");
     expect(result[0][0].bg).toBe("rgb(255, 224, 130)");
     expect(result[0][0].svgPresent).toBe(true);
     expect(result[0][0].rects.length).toBeGreaterThanOrEqual(1);
     expect(result[0][0].rects.every(r=>r.fill==="#990000")).toBe(true);
     expect(result[0][0].rects.some(r=>r.height==="1pt"||r.width==="1pt")).toBe(true);
     expect(result[0][1].cssBorder).toBe("none");
     // None-style cell must not carry the styled cell's fill or maroon border paint.
     expect(result[0][1].bg).not.toBe("rgb(255, 224, 130)");
     expect(result[0][1].rects.every(r=>r.fill!=="#990000")).toBe(true);
     return pdf(options);
    });return page;
   });return browser;
  });
 });
 afterAll(()=>vi.restoreAllMocks());
 it("prints styled Urdu cell but not the None-style grid",async()=>{
  const attrs=(i:number)=>i===0?{tableFill:"#ffe082",tableBorderColor:"#990000",tableBorderStyle:"solid",tableBorderWidthPt:1}:{tableFill:null,tableBorderStyle:"none",tableBorderWidthPt:1};
  const words=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];
  const doc={type:"doc",content:[{type:"table",attrs:{dir:"rtl",tableFlow:"rtl",tableAlignment:"center",tableIndentMm:0,tableFormatWidthPx:540},content:Array.from({length:3},(_,row)=>({type:"tableRow",content:Array.from({length:3},(_,col)=>({type:"tableCell",attrs:{...attrs(row*3+col),colwidth:[180]},content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:words[row*3+col]}]}]}))}))}]};
  const settings=defaultDocumentSettings();settings.headerFooter.headerEnabled=false;settings.headerFooter.footerEnabled=false;
  const response=await POST(new PdfExportTestRequest("http://localhost/api/export-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doc,dir:"rtl",settings})}));
  const bytes=new Uint8Array(await response.arrayBuffer());
  expect(response.status,String.fromCharCode(...bytes.slice(0,500))).toBe(200);
  expect(bytes.byteLength).toBeGreaterThan(3000);
  const pdf=await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  writeFileSync(out+"/table-format.pdf",bytes);
 },120000);
});
