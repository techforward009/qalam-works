import {describe,it,expect,vi,beforeAll,afterAll} from "vitest";
import {mkdirSync,writeFileSync} from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import {PDFDocument} from "pdf-lib";
import {inflateSync} from "node:zlib";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import {defaultDocumentSettings} from "../app/tools/document-studio/utils/documentSettings";
import {PdfExportTestRequest} from "./helpers/pdfExportRequest";
import {POST} from "../app/api/export-pdf/route";

const mmPx=96/25.4, mm=(px:number)=>px/mmPx;
const words=["ایک","دو","تین","چار","پانچ","چھ"];
const narrow="یہ ایک طویل اردو عبارت ہے جو تنگ خانے کے اندر دوسری سطر میں منتقل ہونی چاہیے";
const make=(widths?:number[], long=false)=>({
 type:"doc",content:[{type:"table",attrs:{dir:"rtl",tableFlow:"rtl",tableAlignment:"right",tableIndentMm:4,tableFormatWidthPx:580},
 content:[0,1].map(row=>({type:"tableRow",content:[0,1,2].map(col=>({type:"tableCell",attrs:{
   ...(widths?{colwidth:[widths[col]]}:{colwidth:null}),
   tableFill:"#ffe082",tableBorderColor:"#990000",tableBorderStyle:"solid",tableBorderWidthPt:1,tableGapMm:1.41},
   content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:long&&row===0&&col===0?narrow:words[row*3+col]}]}]}))}))}]
});
const colTags=(html:string)=>[...html.matchAll(/<col(?:\s+style="([^"]*)")?>/g)].map(m=>m[1]??"");
describe("PDF table true column widths",()=>{
 it("keeps physical widths of 20, 50, 30 mm in logical RTL order",()=>{
  const values=[20,50,30].map(v=>v*mmPx);
  const html=buildPdfHtml(make(values) as never,"rtl",{faces:[]}).html;
  const tags=colTags(html);
  expect(tags).toHaveLength(3);
  expect(tags.map(x=>Number(x.match(/width:([\d.]+)px/)?.[1]))).toEqual(values);
  expect(html).toMatch(/<table[^>]*dir="rtl"/);
  const table=html.match(/<table[^>]*style="([^"]+)"/)?.[1]??"";
  expect(Number(table.match(/(?:^|;)width:([\d.]+)px/)?.[1])).toBeCloseTo(values.reduce((a,b)=>a+b,0),2);
 });
 it("does not change Auto table layout or non-table content",()=>{
  const table=buildPdfHtml(make() as never,"rtl",{faces:[]}).html;
  expect(colTags(table)).toHaveLength(0);
  expect(table).toContain("table-layout:fixed");
  const prose=buildPdfHtml({type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"یہ عام عبارت ہے"}]}]} as never,"rtl",{faces:[]}).html;
  expect(prose).not.toMatch(/<table class="qalam-document-table"/);
 });
});

describe.runIf(Boolean(process.env.QALAM_PDF_CHROMIUM))("real PDF widths and wrapping",()=>{
 const original=puppeteer.launch.bind(puppeteer);
 const results:any[]=[];
 beforeAll(()=>{
  vi.spyOn(chromium,"executablePath").mockResolvedValue(process.env.QALAM_PDF_CHROMIUM!);
  vi.spyOn(puppeteer,"launch").mockImplementation(async options=>{
   const browser=await original({...options,args:["--no-sandbox","--disable-setuid-sandbox"]});
   const newPage=browser.newPage.bind(browser);
   vi.spyOn(browser,"newPage").mockImplementation(async()=>{
    const page=await newPage(),realPdf=page.pdf.bind(page);
    vi.spyOn(page,"pdf").mockImplementation(async options=>{
     const dimensions=await page.evaluate(()=>{
      const table=document.querySelector("table.qalam-document-table")!;
      const rect=table.getBoundingClientRect();
      const cells=[...table.querySelectorAll("tr:first-child td")].map(c=>{
       const r=c.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom,scrollWidth:c.scrollWidth};
      });
      const narrow=table.querySelector("tr:first-child td:first-child")!;
      const t=table.querySelector("tr:first-child td:first-child p")!;
      return {tableWidth:rect.width,cells,innerHeight:t.getBoundingClientRect().height,rowHeight:narrow.getBoundingClientRect().height,dir:getComputedStyle(table).direction};
     });
     results.push(dimensions);
     const bytes=await realPdf(options);
     mkdirSync("/tmp/qalam-pdf-widths",{recursive:true});
     writeFileSync("/tmp/qalam-pdf-widths/export-"+results.length+".pdf",bytes);
     await page.screenshot({path:"/tmp/qalam-pdf-widths/pdf-html-"+results.length+".png",fullPage:true});
     return bytes;
    });
    return page;
   });
   return browser;
  });
 });
 afterAll(()=>vi.restoreAllMocks());
 it("exports real RTL PDF with 20/50/30 mm column edges and long text inside its narrow cell",async()=>{
  const settings=defaultDocumentSettings();settings.headerFooter.headerEnabled=false;settings.headerFooter.footerEnabled=false;
  const response=await POST(new PdfExportTestRequest("http://localhost/api/export-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doc:make([20,50,30].map(x=>x*mmPx),true),dir:"rtl",settings})}));
  expect(response.status).toBe(200);
  const bytes=new Uint8Array(await response.arrayBuffer());
  expect(bytes.byteLength).toBeGreaterThan(4000);
  const pdf=await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(1);
  const contents=pdf.context.lookup(pdf.getPages()[0].node.Contents()) as {contents?:Uint8Array;getContents?:()=>Uint8Array};
  const vector=inflateSync(contents.contents??contents.getContents!()).toString("latin1");
  const painted=[...vector.matchAll(/\/TD <<\/MCID \d+ >>BDC\s+([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re\s+f/g)]
    .map(m=>({x:Number(m[1]),width:Number(m[3])}));
  expect(painted.length).toBeGreaterThanOrEqual(6);
  for(let i=0;i<3;i++)expect(Math.abs(mm(painted[i].width)-[20,50,30][i])).toBeLessThanOrEqual(.5);
  expect(painted[0].x).toBeGreaterThan(painted[1].x);
  expect(painted[1].x).toBeGreaterThan(painted[2].x);
  const result=results.at(-1);
  expect(result.dir).toBe("rtl");
  for(let i=0;i<3;i++)expect(Math.abs(mm(result.cells[i].width)-[20,50,30][i])).toBeLessThanOrEqual(.5);
  expect(result.cells[0].right).toBeGreaterThan(result.cells[1].right);
  expect(result.innerHeight).toBeGreaterThan(20);
  expect(result.rowHeight).toBeGreaterThanOrEqual(result.innerHeight);
 },90000);
});
