import {describe,it,expect} from "vitest";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import {blockLeadingPt} from "../app/tools/document-studio/utils/autoLeading";

const cell=(text?:string)=>({type:"tableCell",content:[{type:"paragraph",attrs:{dir:"rtl"},...(text?{content:[{type:"text",text}]}:{})}]});
const grid=(words:string[] = [])=>({
 type:"doc",
 content:[{type:"table",attrs:{dir:"rtl",tableFlow:"rtl"},content:Array.from({length:3},(_,row)=>({
  type:"tableRow",content:Array.from({length:3},(_,col)=>cell(words[row*3+col]))
 }))}]
});
const html=(words:string[] = [])=>buildPdfHtml(grid(words) as never,"rtl",{faces:[]}).html;

describe("PDF table cell geometry and Urdu row metrics",()=>{
 it("uses shared, exact SVG edges for every adjacent default cell",()=>{
  const output=html();
  const rects=[...output.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="none" stroke="#000000"/g)];
  expect(rects).toHaveLength(9);
  for(const [,x,y,width,height] of rects){
   expect(x).toBe("0px");
   expect(y).toBe("0px");
   expect(width).toBe("100%");
   expect(height).toBe("100%");
  }
  expect(output).toContain("border-collapse:separate; border-spacing:0");
 });

 it("gives an empty Urdu cell the same font line box and screen cell insets",()=>{
  const output=html();
  const expectedLeading=blockLeadingPt({type:"paragraph",attrs:{dir:"rtl"}},"Noto Nastaliq Urdu",{bodyFontSizePt:12,lineHeight:1.5},"rtl");
  expect(expectedLeading).toBeCloseTo(19.8,8);
  expect(output).toContain(`line-height:${expectedLeading}pt`);
  expect(output).toMatch(/<p[^>]*><br\s*\/?><\/p>/);
  expect(output).toContain("padding:2px 4px");
  expect(output).toContain("border:0.5px solid transparent");
 });

 it("keeps the Urdu word پانچ inside a cell's real text line box",()=>{
  const output=html(["پانچ"]);
  expect(output).toContain("پانچ");
  expect(output).toContain("table.qalam-document-table :is(th,td) p span { line-height:normal; }");
 });
});
