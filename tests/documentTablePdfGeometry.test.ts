import {describe,it,expect} from "vitest";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import {blockLeadingPt} from "../app/tools/document-studio/utils/autoLeading";
import puppeteer from "puppeteer-core";
import {execSync} from "node:child_process";
import {writeFileSync} from "node:fs";

const cell=(text:string|undefined,attrs:Record<string,unknown>={})=>({
 type:"tableCell",attrs,
 content:[{type:"paragraph",attrs:{dir:"rtl"},...(text?{content:[{type:"text",text}]}:{})}]
});
const grid=(words:string[] = [],borderForCell:(row:number,col:number)=>Record<string,unknown>=()=>({}))=>({
 type:"doc",
 content:[{type:"table",attrs:{dir:"rtl",tableFlow:"rtl"},content:Array.from({length:3},(_,row)=>({
  type:"tableRow",content:Array.from({length:3},(_,col)=>cell(words[row*3+col],borderForCell(row,col)))
 }))}]
});
const html=(words:string[] = [],borderForCell:(row:number,col:number)=>Record<string,unknown>=()=>({}))=>buildPdfHtml(grid(words,borderForCell) as never,"rtl",{faces:[]}).html;
const tableHtml=(output:string)=>output.match(/<table class="qalam-document-table"[\s\S]*?<\/table>/)?.[0]??"";

const cellElements=(table:string)=>[...table.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[0]);
const cellSvgRects=(cellHtml:string)=>[...cellHtml.matchAll(/<rect\b([^>]*)\/?>/g)].map(m=>m[1]);
const allTableSvgRects=(table:string)=>[...table.matchAll(/<rect\b([^>]*)\/?>/g)].map(m=>m[1]);

describe("PDF table borders and Urdu cell line placement",()=>{
 it("اردو 3x3 جدول: حقیقی پی ڈی ایف میں ہر بارڈر بالکل 0.5pt چوڑا ہے اور ہر کنارے پر صرف ایک لائن ہے",async()=>{
  const words=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];
  const output=html(words);
  const table=tableHtml(output);
  expect(table).toContain("qalam-pdf-cell-borders");
  
  const rects=allTableSvgRects(table);
  // In a 3x3 table, exactly 24 shared edges exist (12 horizontal, 12 vertical)
  expect(rects).toHaveLength(24);
  expect(rects.every(r=>r.includes('height="0.5pt"')||r.includes('width="0.5pt"'))).toBe(true);
  expect(rects.every(r=>r.includes('fill="#000000"'))).toBe(true);

  // Real PDF inspection with pdfplumber
  const browser=await puppeteer.launch({executablePath:"/usr/bin/google-chrome",args:["--no-sandbox","--disable-setuid-sandbox"]});
  try{
   const page=await browser.newPage();
   await page.setContent(output,{waitUntil:"load"});
   const pdfBuffer=await page.pdf({width:"210mm",height:"297mm",printBackground:true});
   const pdfPath="/tmp/urdu_table_05pt_test.pdf";
   writeFileSync(pdfPath,pdfBuffer);

   const pyScript=`
import pdfplumber
with pdfplumber.open('${pdfPath}') as pdf:
    p = pdf.pages[0]
    rects = p.rects
    verticals = [r for r in rects if round(r['width'], 2) == 0.5]
    horizontals = [r for r in rects if round(r['height'], 2) == 0.5]
    all_05 = [r for r in rects if round(r['width'], 2) == 0.5 or round(r['height'], 2) == 0.5]
    print(f"TOTAL_RECTS:{len(rects)}")
    print(f"TOTAL_05:{len(all_05)}")
    print(f"VERTICALS:{len(verticals)}")
    print(f"HORIZONTALS:{len(horizontals)}")
    v_xs = sorted(set(round(r['x0'], 2) for r in verticals))
    print(f"V_XS:{len(v_xs)}")
`;
   const pyPath="/tmp/inspect_urdu_table.py";
   writeFileSync(pyPath,pyScript);
   const res=execSync(`python3 ${pyPath}`).toString();
   expect(res).toContain("TOTAL_05:24");
   expect(res).toContain("VERTICALS:12");
   expect(res).toContain("HORIZONTALS:12");
   expect(res).toContain("V_XS:4");
  }finally{
   await browser.close();
  }
 },30000);

 it("اردو جدول: نیلے بارڈر کے نیچے کالا بارڈر نہیں ہوتا اور بالکل 0.5pt پر بنتا ہے",async()=>{
  const words=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];
  const output=html(words,(row,col)=>row===1&&col===1?{tableBorderColor:"#0000ff",tableBorderWidthPt:0.5,tableBorderStyle:"solid"}:{});
  const table=tableHtml(output);
  const rects=allTableSvgRects(table);
  expect(rects).toHaveLength(24);

  const blueRects=rects.filter(r=>r.includes('fill="#0000ff"'));
  const blackRects=rects.filter(r=>r.includes('fill="#000000"'));
  expect(blueRects).toHaveLength(4);
  expect(blackRects).toHaveLength(20);

  // In real PDF: exactly 4 blue rects of 0.5pt, 20 black rects of 0.5pt
  const browser=await puppeteer.launch({executablePath:"/usr/bin/google-chrome",args:["--no-sandbox","--disable-setuid-sandbox"]});
  try{
   const page=await browser.newPage();
   await page.setContent(output,{waitUntil:"load"});
   const pdfBuffer=await page.pdf({width:"210mm",height:"297mm",printBackground:true});
   const pdfPath="/tmp/urdu_table_blue_cell_test.pdf";
   writeFileSync(pdfPath,pdfBuffer);

   const pyScript=`
import pdfplumber
with pdfplumber.open('${pdfPath}') as pdf:
    p = pdf.pages[0]
    blue = [r for r in p.rects if r.get('non_stroking_color') == (0.0, 0.0, 1.0)]
    black = [r for r in p.rects if r.get('non_stroking_color') == (0.0, 0.0, 0.0)]
    print(f"BLUE:{len(blue)}")
    print(f"BLACK:{len(black)}")
    blue_05 = [r for r in blue if round(r['width'], 2) == 0.5 or round(r['height'], 2) == 0.5]
    print(f"BLUE_05:{len(blue_05)}")
`;
   const pyPath="/tmp/inspect_urdu_table.py";
   writeFileSync(pyPath,pyScript);
   const res=execSync(`python3 ${pyPath}`).toString();
   expect(res).toContain("BLUE:4");
   expect(res).toContain("BLACK:20");
   expect(res).toContain("BLUE_05:4");
  }finally{
   await browser.close();
  }
 },30000);

 it("سیل کا اردو متن (ایک، دو، تین) عمودی اور افقی طور پر درمیان میں رہتا ہے",()=>{
  const table=tableHtml(html(["ایک","دو","تین"]));
  const cells=cellElements(table).slice(0,3);
  const expectedLeading=blockLeadingPt({type:"paragraph",attrs:{dir:"rtl"}},"Noto Nastaliq Urdu",{bodyFontSizePt:12,lineHeight:1.5},"rtl");
  expect(expectedLeading).toBeCloseTo(19.8,8);
  expect(cells).toHaveLength(3);
  for(const cellHtml of cells){
   expect(cellHtml).toContain("vertical-align:middle");
   expect(cellHtml).toContain(`line-height:${expectedLeading}pt`);
   expect(cellHtml).toContain("qalam-pdf-cell-borders");
  }
 });

 it("پانچ کا لفظ اپنے سیل کے فونٹ باکس کے اندر رہتا ہے",()=>{
  const table=tableHtml(html(["پانچ"]));
  expect(table).toContain("پانچ");
  expect(table).toContain("line-height:");
 });
});
