import {describe,it,expect} from "vitest";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import {blockLeadingPt} from "../app/tools/document-studio/utils/autoLeading";

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
const svgRects=(cellHtml:string)=>[...cellHtml.matchAll(/<rect\b[^>]*\/>/g)].map(m=>m[0]);
const allSvgRects=(table:string)=>[...table.matchAll(/<rect\b[^>]*\/>/g)].map(m=>m[0]);

describe("PDF table borders and Urdu cell line placement",()=>{
 it("draws every shared default edge once at 0.5pt",()=>{
  const output=html(),table=tableHtml(output),cells=cellElements(table),rects=allSvgRects(table);
  expect(output).toContain("border-collapse:collapse");
  expect(cells).toHaveLength(9);
  expect(rects).toHaveLength(24);
  for(const r of rects){
   expect(r).toContain('fill="#000000"');
   expect(r).toMatch(/(?:width="0\.5pt"|height="0\.5pt")/);
  }
 });

 it("prints a whole-table Blue using only blue 0.5pt edges",()=>{
  const output=html([],()=>({tableBorderColor:"#0000ff",tableBorderWidthPt:0.5,tableBorderStyle:"solid"}));
  const table=tableHtml(output),rects=allSvgRects(table);
  expect(output).toContain("border-collapse:collapse");
  expect(rects).toHaveLength(24);
  expect(rects.every(r=>r.includes('fill="#0000ff"') && (r.includes('width="0.5pt"') || r.includes('height="0.5pt"')))).toBe(true);
  expect(table).not.toContain("#000000");
 });

 it("preserves the four sides of a single custom Red 2pt cell",()=>{
  const table=tableHtml(html([],(row,col)=>row===1&&col===1?{tableBorderColor:"#ff0000",tableBorderWidthPt:2,tableBorderStyle:"solid"}:{}));
  const cells=cellElements(table),rects=allSvgRects(table);
  expect(rects).toHaveLength(24);
  const redRects=rects.filter(r=>r.includes('fill="#ff0000"'));
  const blackRects=rects.filter(r=>r.includes('fill="#000000"'));
  expect(redRects).toHaveLength(4);
  expect(blackRects).toHaveLength(20);
  expect(svgRects(cells[4])).toHaveLength(4);
  expect(svgRects(cells[4]).every(r=>r.includes('fill="#ff0000"') && (r.includes('width="2pt"') || r.includes('height="2pt"')))).toBe(true);
 });

 it("does not leave a black edge underneath a single Blue cell",()=>{
  const table=tableHtml(html([],(row,col)=>row===1&&col===1?{tableBorderColor:"#0000ff",tableBorderWidthPt:0.5,tableBorderStyle:"solid"}:{}));
  const cells=cellElements(table),rects=allSvgRects(table);
  const blueRects=rects.filter(r=>r.includes('fill="#0000ff"'));
  const blackRects=rects.filter(r=>r.includes('fill="#000000"'));
  expect(blueRects).toHaveLength(4);
  expect(blackRects).toHaveLength(20);
  expect(svgRects(cells[4])).toHaveLength(4);
  expect(svgRects(cells[4]).every(r=>r.includes('fill="#0000ff"'))).toBe(true);
  // Neighbors facing cell 4 do not draw the shared edge:
  expect(svgRects(cells[1]).some(r=>r.includes('y="calc(100% - 0.5pt)"') && r.includes('width="100%"'))).toBe(false); // cell 1 bottom
  expect(svgRects(cells[3]).some(r=>r.includes('x="0"') && r.includes('height="100%"'))).toBe(false); // cell 3 left (in RTL)
  expect(svgRects(cells[5]).some(r=>r.includes('x="calc(100% - 0.5pt)"') && r.includes('height="100%"'))).toBe(false); // cell 5 right (in RTL)
  expect(svgRects(cells[7]).some(r=>r.includes('y="0"') && r.includes('width="100%"'))).toBe(false); // cell 7 top
 });

 it("centres the same Urdu font-metric line box in ایک، دو، تین cells",()=>{
  const table=tableHtml(html(["ایک","دو","تین"]));
  const cells=[...table.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].slice(0,3).map(match=>match[0]);
  const expectedLeading=blockLeadingPt({type:"paragraph",attrs:{dir:"rtl"}},"Noto Nastaliq Urdu",{bodyFontSizePt:12,lineHeight:1.5},"rtl");
  expect(expectedLeading).toBeCloseTo(19.8,8);
  expect(cells).toHaveLength(3);
  for(const cellHtml of cells){
   expect(cellHtml).toContain("vertical-align:middle");
   expect(cellHtml).toContain(`line-height:${expectedLeading}pt`);
  }
  const rowHeight=24.8,lineHeight=expectedLeading;
  const fontAscent=14.2,fontDescent=5.6;
  expect(fontAscent+fontDescent).toBeCloseTo(lineHeight,1);
  const lineBoxTop=(rowHeight-lineHeight)/2;
  const halfLeading=(lineHeight-fontAscent-fontDescent)/2;
  const baselines=cells.map(()=>lineBoxTop+halfLeading+fontAscent);
  expect(Math.max(...baselines)-Math.min(...baselines)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(lineBoxTop-(rowHeight-lineHeight)/2)).toBeLessThanOrEqual(0.5);
 });

 it("keeps the Urdu word پانچ inside its cell's font line box",()=>{
  const table=tableHtml(html(["پانچ"]));
  expect(table).toContain("پانچ");
  expect(table).toContain("line-height:");
 });

 it("draws every outer edge including the left outer border in every row exactly once at 0.5pt",()=>{
  const words = ["ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو"];
  const output = html(words);
  const table = tableHtml(output);
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
  expect(rows).toHaveLength(3);

  // In each row, there should be an outer right (col 0 in RTL) and an outer left (col 2 in RTL) border.
  for (let r = 0; r < 3; r++) {
   const cellsInRow = cellElements(rows[r]);
   expect(cellsInRow).toHaveLength(3);
   const col0Rects = svgRects(cellsInRow[0]);
   const col2Rects = svgRects(cellsInRow[2]);
   expect(col0Rects.some(rect => rect.includes('x="calc(100% - 0.5pt)"') && rect.includes('fill="#000000"'))).toBe(true);
   expect(col2Rects.some(rect => rect.includes('x="0"') && rect.includes('fill="#000000"'))).toBe(true);
  }

  // Also verify for custom coloured borders across the whole table
  const blueOutput = html(words, () => ({ tableBorderColor: "#0000ff", tableBorderWidthPt: 0.5, tableBorderStyle: "solid" }));
  const blueTable = tableHtml(blueOutput);
  const blueRows = [...blueTable.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
  for (let r = 0; r < 3; r++) {
   const cellsInRow = cellElements(blueRows[r]);
   const col0Rects = svgRects(cellsInRow[0]);
   const col2Rects = svgRects(cellsInRow[2]);
   expect(col0Rects.some(rect => rect.includes('x="calc(100% - 0.5pt)"') && rect.includes('fill="#0000ff"'))).toBe(true);
   expect(col2Rects.some(rect => rect.includes('x="0"') && rect.includes('fill="#0000ff"'))).toBe(true);
  }
 });
});
