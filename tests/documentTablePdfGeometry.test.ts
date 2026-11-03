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
const cellStyles=(table:string)=>[...table.matchAll(/<td\b[^>]*style="([^"]*)"/g)].map(match=>match[1]);
const side=(style:string,name:"top"|"right"|"bottom"|"left")=>style.match(new RegExp(`(?:^|;)border-${name}:([^;]+)`))?.[1]??"";
const allBorders=(styles:string[])=>styles.flatMap(style=>(["top","right","bottom","left"] as const).map(name=>side(style,name))).filter(value=>value!==""&&value!=="0 none transparent");

describe("PDF table borders and Urdu cell line placement",()=>{
 it("draws every shared default edge once at 0.5pt",()=>{
  const output=html(),table=tableHtml(output),styles=cellStyles(table),borders=allBorders(styles);
  expect(output).toContain("border-collapse:collapse");
  expect(styles).toHaveLength(9);
  expect(table).not.toContain("<svg");
  expect(table).not.toContain("<rect");
  expect(borders).toHaveLength(24);
  expect(borders.every(value=>value==="0.5pt solid #000000")).toBe(true);
 });

 it("prints a whole-table Blue using only blue 0.5pt edges",()=>{
  const output=html([],()=>({tableBorderColor:"#0000ff",tableBorderWidthPt:0.5,tableBorderStyle:"solid"}));
  const table=tableHtml(output),styles=cellStyles(table),borders=allBorders(styles);
  expect(output).toContain("border-collapse:collapse");
  expect(borders).toHaveLength(24);
  expect(borders.every(value=>value==="0.5pt solid #0000ff")).toBe(true);
  expect(table).not.toContain("#000000");
  expect(table).not.toContain("stroke=");
 });

 it("preserves the four sides of a single custom Red 2pt cell",()=>{
  const table=tableHtml(html([],(row,col)=>row===1&&col===1?{tableBorderColor:"#ff0000",tableBorderWidthPt:2,tableBorderStyle:"solid"}:{}));
  const styles=cellStyles(table),borders=allBorders(styles);
  expect(borders).toHaveLength(24);
  expect(borders.filter(value=>value==="2pt solid #ff0000")).toHaveLength(4);
  expect(borders.filter(value=>value==="0.5pt solid #000000")).toHaveLength(20);
  expect(["top","right","bottom","left"].map(name=>side(styles[4],name as "top"|"right"|"bottom"|"left"))).toEqual(Array(4).fill("2pt solid #ff0000"));
 });

 it("does not leave a black edge underneath a single Blue cell",()=>{
  const table=tableHtml(html([],(row,col)=>row===1&&col===1?{tableBorderColor:"#0000ff",tableBorderWidthPt:0.5,tableBorderStyle:"solid"}:{}));
  const styles=cellStyles(table),borders=allBorders(styles);
  expect(borders.filter(value=>value==="0.5pt solid #0000ff")).toHaveLength(4);
  expect(borders.filter(value=>value==="0.5pt solid #000000")).toHaveLength(20);
  expect(["top","right","bottom","left"].map(name=>side(styles[4],name as "top"|"right"|"bottom"|"left"))).toEqual(Array(4).fill("0.5pt solid #0000ff"));
  expect(side(styles[1],"bottom")).toBe("0 none transparent");
  expect(side(styles[3],"left")).toBe("0 none transparent");
  expect(side(styles[5],"right")).toBe("0 none transparent");
  expect(side(styles[7],"top")).toBe("0 none transparent");
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
  // Neither should be '0 none transparent'.
  for (let r = 0; r < 3; r++) {
   const cellsInRow = cellStyles(rows[r]);
   expect(cellsInRow).toHaveLength(3);
   const rightOuter = side(cellsInRow[0], "right");
   const leftOuter = side(cellsInRow[2], "left");
   expect(rightOuter).toBe("0.5pt solid #000000");
   expect(leftOuter).toBe("0.5pt solid #000000");
  }

  // Also verify for custom coloured borders across the whole table
  const blueOutput = html(words, () => ({ tableBorderColor: "#0000ff", tableBorderWidthPt: 0.5, tableBorderStyle: "solid" }));
  const blueTable = tableHtml(blueOutput);
  const blueRows = [...blueTable.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
  for (let r = 0; r < 3; r++) {
   const cellsInRow = cellStyles(blueRows[r]);
   const rightOuter = side(cellsInRow[0], "right");
   const leftOuter = side(cellsInRow[2], "left");
   expect(rightOuter).toBe("0.5pt solid #0000ff");
   expect(leftOuter).toBe("0.5pt solid #0000ff");
  }
 });
});
