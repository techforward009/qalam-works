import {describe,it,expect} from "vitest";
import {PDF_TABLE_SELECTOR,isPdfTableBlock,paginatePdfInk} from "../app/tools/document-studio/utils/pdfInkPagination";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import puppeteer from "puppeteer-core";

describe("PDF tables",()=>{
 it("selects complete table blocks and never nested cell paragraphs",()=>{
  expect(PDF_TABLE_SELECTOR).toContain("table");
  expect(isPdfTableBlock("TABLE")).toBe(true);
  expect(isPdfTableBlock("P")).toBe(false);
 });

 it("اردو 3x3 جدول: کالم ری سائز کے بعد پی ڈی ایف انک کی فی سیل پیمائش اور کامیاب برآمد",async()=>{
  // 3x3 RTL Urdu table: ایک دو تین / چار پانچ چھ / سات آٹھ نو
  const words=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];
  // After resizing columns, total width can have ~1.3px rounding delta relative to printable width
  const colwidths=[233,233,233]; // 699px total on a 697.7px printable width
  const doc={
   type:"doc",
   content:[{
    type:"table",
    attrs:{dir:"rtl",tableFlow:"rtl",tableFormatWidthPx:699,tableAlignment:"right",tableIndentMm:0},
    content:Array.from({length:3},(_,row)=>({
     type:"tableRow",
     content:Array.from({length:3},(_,col)=>({
      type:"tableCell",
      attrs:{colwidth:[colwidths[col]]},
      content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:words[row*3+col]}]}]
     }))
    }))
   }]
  };

  const {html}=buildPdfHtml(doc as never,"rtl",{faces:[]});
  const browser=await puppeteer.launch({executablePath:"/usr/bin/google-chrome",args:["--no-sandbox","--disable-setuid-sandbox"]});
  try{
   const page=await browser.newPage();
   await page.setContent(html,{waitUntil:"load"});
   // Printable width: 184.6mm = 697.7px
   const result=await paginatePdfInk(page,184.6,260,12.7,12.7);
   expect(result.pages).toBe(1);
   expect(result.lines).toBeGreaterThanOrEqual(1);
  }finally{
   await browser.close();
  }
 },30000);
});
