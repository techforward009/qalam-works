// @vitest-environment happy-dom
import {describe,it,expect} from "vitest";
import {Editor} from "@tiptap/core";
import {CellSelection} from "@tiptap/pm/tables";
import {serializeQpg,deserializeQpg} from "../app/tools/document-studio/utils/qpgFile";
import {defaultDocumentSettings} from "../app/tools/document-studio/utils/documentSettings";
import {createDocumentStudioExtensions} from "../app/tools/document-studio/utils/documentSchema";
import {tableContextMode,tableResizePair,tableResizeColumnLine,normalizeTableWidths,tableLayoutCommand} from "../app/tools/document-studio/utils/tableOperations";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import {closeHistory} from "@tiptap/pm/history";
import {createTableContent} from "../app/tools/document-studio/utils/tableConversions";
import {textContextItems,textContextDisabled} from "../app/tools/document-studio/utils/textContextMenu";
import {QalamTableFormatAttributes} from "../app/tools/document-studio/utils/tableFormatAttributes";
import {QalamTableStableDirection} from "../app/tools/document-studio/utils/tableStableDirection";
import {getHandle} from "../app/tools/document-studio/utils/tableColumnResizing";
function editorWithTable() {
 const e=new Editor({extensions:createDocumentStudioExtensions(),content:{type:"doc",content:[createTableContent(2,2,null,"rtl")]}});
 e.commands.setTextSelection(4);
 return e;
}
describe("table reference behaviours",()=>{
 it("builds first cell in RTL, marks both rows and preserves LTR",()=>{
  for(const dir of ["rtl","ltr"] as const) {
   const t=createTableContent(2,2,null,dir);
   expect(t.content?.[0].content?.[0].content?.[0].attrs?.dir).toBe(dir);
   expect(t.content?.[1].content?.[0].content?.[0].attrs?.dir).toBe(dir);
  }
 });
 it("normalizes widths, keeps inside resize total constant and minimum 64px",()=>{
  expect(normalizeTableWidths([100,100],200)).toEqual([100,100]);
  expect(tableResizePair([100,100],0,50,64)).toEqual([136,64]);
  expect(tableResizePair([100,100],0,-70,64)).toEqual([64,136]);
  expect(tableResizePair([120,80],0,20,64)).toEqual([136,64]);
 });
 it("shows table layout inside a table, text to table for cross-table selection",()=>{
  expect(tableContextMode(true,false)).toBe("table");
  expect(tableContextMode(true,true)).toBe("text");
  expect(textContextItems(false,true).filter(item=>"label"in item).map(item=>"label"in item?item.label:"")).toContain("Table Layout…");
  expect(textContextDisabled("tableFormat",false,true)).toBe(false);
  expect(textContextDisabled("tableToText",false,true)).toBe(false);
  expect(textContextDisabled("tableToText",false,false)).toBe(true);
 });
 it("merges and splits selected cells without losing table structure",()=>{
  const e=editorWithTable();
  const positions:number[]=[];
  e.state.doc.descendants((node,pos)=>{if(node.type.name==="tableCell")positions.push(pos);});
  e.view.dispatch(e.state.tr.setSelection(CellSelection.create(e.state.doc,positions[0],positions[1])));
  expect(e.can().mergeCells()).toBe(true);
  expect(e.commands.mergeCells()).toBe(true);
  expect((e.getJSON() as any).content[0].content[0].content[0].attrs.colspan).toBe(2);
  expect(e.commands.splitCell()).toBe(true);
  expect((e.getJSON() as any).content[0].content[0].content).toHaveLength(2);
  e.destroy();
 });
 it("persists column widths in the JSON used by portable QPG",()=>{
  const e=editorWithTable();
  const json=e.getJSON() as any;
  for(const row of json.content[0].content)row.content.forEach((cell:any,index:number)=>{cell.attrs={...cell.attrs,colwidth:[index===0?310:190]};});
  const qpg={title:"Test",content:json,documentSettings:defaultDocumentSettings(),frames:[],minimumPages:1,columns:{count:1,gutterMm:5},viewMode:"pages"} as any;
  const output=deserializeQpg(serializeQpg(qpg));
  expect((output.content as any).content[0].content[0].content.map((c:any)=>c.attrs.colwidth[0])).toEqual([310,190]);
  e.destroy();
 });
 it("adds or removes a row or column with a single table command",()=>{
  const e=editorWithTable();
  expect(tableLayoutCommand(e,"row","after","insert")).toBe(true);
  expect((e.getJSON().content?.[0].content||[]).length).toBe(3);
  expect(tableLayoutCommand(e,"column","after","insert")).toBe(true);
  expect(((e.getJSON() as any).content?.[0].content?.[0].content||[]).length).toBe(3);
  expect(tableLayoutCommand(e,"row","before","delete")).toBe(true);
  expect((e.getJSON().content?.[0].content||[]).length).toBe(2);
  e.destroy();
 });

 it("handles outer and inner column-line dragging with single undo and PDF width parity",()=>{
  // 3-column table with initial widths [150, 150, 150] and Urdu text: ایک، دو، تین
  const initialWidths = [150, 150, 150];
  // tableResizeColumnLine(widths, lineIndex, delta, min):
  // lines in an N-column table:
  // line 0: outer right line (in RTL, outer right of col 0) -> changes only col 0
  // line 1: inner boundary between col 0 and col 1 -> changes col 0 and col 1, total sum stays 450
  // line 2: inner boundary between col 1 and col 2 -> changes col 1 and col 2, total sum stays 450
  // line 3: outer left line (in RTL, outer left of col 2) -> changes only col 2
  // Inner line drag:
  const innerResized = tableResizeColumnLine(initialWidths, 1, 30, 64);
  expect(innerResized).toEqual([180, 120, 150]);

  // Outer right line drag (delta = +20):
  const rightResized = tableResizeColumnLine(initialWidths, 0, 20, 64);
  expect(rightResized).toEqual([170, 150, 150]);

  // Outer left line drag (delta = -30, meaning wider to the left in RTL):
  const leftResized = tableResizeColumnLine(initialWidths, 3, 30, 64);
  expect(leftResized).toEqual([150, 150, 180]);

  // Check respect for TABLE_MIN_COL_WIDTH (64):
  const clamped = tableResizeColumnLine(initialWidths, 0, -100, 64);
  expect(clamped).toEqual([64, 150, 150]);

  // Test editor transaction, single undo step, and PDF export following new widths
  const e = new Editor({
   extensions: createDocumentStudioExtensions(),
   content: {
    type: "doc",
    content: [{
     type: "table",
     attrs: { dir: "rtl", tableFlow: "rtl" },
     content: [
      {
       type: "tableRow",
       content: [
        { type: "tableCell", attrs: { colwidth: [150] }, content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "ایک" }] }] },
        { type: "tableCell", attrs: { colwidth: [150] }, content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "دو" }] }] },
        { type: "tableCell", attrs: { colwidth: [150] }, content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "تین" }] }] }
       ]
      }
     ]
    }]
   }
  });

  const getColWidths = () => (e.getJSON().content?.[0] as any).content[0].content.map((c: any) => c.attrs.colwidth[0]);
  expect(getColWidths()).toEqual([150, 150, 150]);

  // Simulate column resize dispatch as in tableColumnResizing
  const tableEl = document.createElement("table");
  tableEl.className = "qalam-document-table";
  // Resize column 0 from 150 to 180 (outer right drag)
  const newWidths = [180, 150, 150];
  const tr = e.state.tr;
  const pos = 0;
  const node = e.state.doc.nodeAt(pos)!;
  node.forEach((row, rowOffset) => {
   let col = 0;
   row.forEach((cell, cellOffset) => {
    const colspan = Number(cell.attrs.colspan) || 1;
    const attrs = { ...cell.attrs, colwidth: newWidths.slice(col, col + colspan).map(w => Math.round(w)) };
    const at = pos + 2 + rowOffset + cellOffset;
    tr.setNodeMarkup(at, undefined, attrs);
    col += colspan;
   });
  });
  tr.setNodeMarkup(pos, undefined, { ...node.attrs, tableFormatWidthPx: 480 });
  e.view.dispatch(closeHistory(tr.setMeta("TABLE_DIALOG_CHANGE", true)));
  e.view.dispatch(closeHistory(e.state.tr));

  expect(getColWidths()).toEqual([180, 150, 150]);

  // One undo step restores original widths
  expect(e.can().undo()).toBe(true);
  e.commands.undo();
  expect(getColWidths()).toEqual([150, 150, 150]);

  // PDF reflects the new widths when resized
  e.commands.redo();
  expect(getColWidths()).toEqual([180, 150, 150]);
  const pdfHtml = buildPdfHtml(e.getJSON(), "rtl", { faces: [] }).html;
  expect(pdfHtml).toContain('style="width:180px"');
  expect(pdfHtml).toContain('style="width:150px"');
  e.destroy();
 });

 it("اردو 3x3 جدول: چاروں کالم لائنوں کو کھینچنا، درست پوزیشن، ہٹ ایریا اور سنگل انڈو",()=>{
  // 3x3 RTL Urdu table: ایک دو تین / چار پانچ چھ / سات آٹھ نو
  const words=["ایک","دو","تین","چار","پانچ","چھ","سات","آٹھ","نو"];
  const initialWidths=[150,150,150]; // Total 450px
  const e=new Editor({
   extensions:[...createDocumentStudioExtensions(),QalamTableStableDirection,QalamTableFormatAttributes],
   content:{
    type:"doc",
    content:[{
     type:"table",
     attrs:{dir:"rtl",tableFlow:"rtl",tableFormatWidthPx:450,tableAlignment:"right",tableIndentMm:0},
     content:Array.from({length:3},(_,r)=>({
      type:"tableRow",
      content:Array.from({length:3},(_,c)=>({
       type:"tableCell",
       attrs:{colwidth:[initialWidths[c]]},
       content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:words[r*3+c]}]}]
      }))
     }))
    }]
   }
  });

  const getColWidths=()=>(e.getJSON().content?.[0] as any).content[0].content.map((c:any)=>c.attrs.colwidth[0]);
  const getTableAttrs=()=>e.state.doc.firstChild?.attrs??{};
  expect(getColWidths()).toEqual([150,150,150]);
  expect(getTableAttrs().tableFormatWidthPx).toBe(450);
  expect(getTableAttrs().tableIndentMm).toBe(0);

  // 1. Dragging OUTER RIGHT column line (line 0) 40px left:
  // Col 0 narrows by 40px (150 -> 110).
  // Table's right edge moves 40px left (tableIndentMm increases by 40 / (96/25.4) mm).
  // Col 1 and Col 2 and left outer line ALL stay stationary!
  const resizedLine0=tableResizeColumnLine(initialWidths,0,-40,64);
  expect(resizedLine0).toEqual([110,150,150]);

  // Commit line 0 drag into editor
  const pxPerMm=96/25.4;
  const indentDeltaMm=Math.round((40/pxPerMm)*100)/100;
  const tr0=e.state.tr;
  const pos=0;
  const node=e.state.doc.nodeAt(pos)!;
  node.forEach((row,rowOffset)=>{
   let col=0;
   row.forEach((cell,cellOffset)=>{
    const colspan=Number(cell.attrs.colspan)||1;
    const attrs={...cell.attrs,colwidth:resizedLine0.slice(col,col+colspan)};
    tr0.setNodeMarkup(pos+2+rowOffset+cellOffset,undefined,attrs);
    col+=colspan;
   });
  });
  tr0.setNodeMarkup(pos,undefined,{...node.attrs,tableFormatWidthPx:410,tableIndentMm:indentDeltaMm});
  e.view.dispatch(closeHistory(tr0.setMeta("TABLE_DIALOG_CHANGE",true)));
  e.view.dispatch(closeHistory(e.state.tr));

  expect(getColWidths()).toEqual([110,150,150]);
  expect(getTableAttrs().tableFormatWidthPx).toBe(410);
  expect(getTableAttrs().tableIndentMm).toBeCloseTo(indentDeltaMm,2);

  // Single undo restores initial widths and indent in ONE step:
  expect(e.can().undo()).toBe(true);
  e.commands.undo();
  expect(getColWidths()).toEqual([150,150,150]);
  expect(getTableAttrs().tableFormatWidthPx).toBe(450);
  expect(getTableAttrs().tableIndentMm).toBe(0);

  // 2. Dragging INNER LINE 1 (between Col 0 and Col 1):
  // Moving 30px left in RTL: Col 0 widens by 30px, Col 1 narrows by 30px.
  // Total width stays 450px; outer left and right stay stationary.
  const resizedLine1=tableResizeColumnLine(initialWidths,1,30,64);
  expect(resizedLine1).toEqual([180,120,150]);

  // 3. Dragging INNER LINE 2 (between Col 1 and Col 2):
  // Moving 20px left in RTL: Col 1 widens by 20px, Col 2 narrows by 20px.
  // Total width stays 450px; outer left and right stay stationary.
  const resizedLine2=tableResizeColumnLine(initialWidths,2,20,64);
  expect(resizedLine2).toEqual([150,170,130]);

  // 4. Dragging OUTER LEFT column line (line 3) 30px left:
  // Moving 30px left in RTL: Col 2 widens by 30px (150 -> 180).
  // Total width becomes 480px. Col 0, Col 1, and outer right line stay stationary.
  const resizedLine3=tableResizeColumnLine(initialWidths,3,30,64);
  expect(resizedLine3).toEqual([150,150,180]);

  // 5. Test HIT AREA (±5px) for every line (outer right, inner 1, inner 2, outer left)
  const domTable=document.createElement("table");
  domTable.className="qalam-document-table";
  domTable.style.direction="rtl";
  const tr=document.createElement("tr");
  const td0=document.createElement("td"); // col 0 (rightmost in RTL): x from 300 to 450
  const td1=document.createElement("td"); // col 1: x from 150 to 300
  const td2=document.createElement("td"); // col 2 (leftmost in RTL): x from 0 to 150
  tr.appendChild(td0);
  tr.appendChild(td1);
  tr.appendChild(td2);
  domTable.appendChild(tr);
  document.body.appendChild(domTable);

  domTable.getBoundingClientRect=()=>({left:0,right:450,top:0,bottom:100,width:450,height:100,x:0,y:0,toJSON:()=>{}} as any);
  tr.getBoundingClientRect=()=>({left:0,right:450,top:0,bottom:100,width:450,height:100,x:0,y:0,toJSON:()=>{}} as any);
  td0.getBoundingClientRect=()=>({left:300,right:450,top:0,bottom:100,width:150,height:100,x:300,y:0,toJSON:()=>{}} as any);
  td1.getBoundingClientRect=()=>({left:150,right:300,top:0,bottom:100,width:150,height:100,x:150,y:0,toJSON:()=>{}} as any);
  td2.getBoundingClientRect=()=>({left:0,right:150,top:0,bottom:100,width:150,height:100,x:0,y:0,toJSON:()=>{}} as any);

  // Outer right line (x = 450): hit zone extends ±5px (445..455) without stealing cell clicks inside (443)
  expect(getHandle({target:domTable,clientX:450,clientY:50} as any)?.lineIndex).toBe(0);
  expect(getHandle({target:domTable,clientX:445,clientY:50} as any)?.lineIndex).toBe(0);
  expect(getHandle({target:domTable,clientX:455,clientY:50} as any)?.lineIndex).toBe(0);
  expect(getHandle({target:domTable,clientX:443,clientY:50} as any)).toBeNull();

  // Inner line 1 (x = 300): hit zone extends ±8px (e.g. 295 and 305)
  expect(getHandle({target:domTable,clientX:300,clientY:50} as any)?.lineIndex).toBe(1);
  expect(getHandle({target:domTable,clientX:295,clientY:50} as any)?.lineIndex).toBe(1);
  expect(getHandle({target:domTable,clientX:305,clientY:50} as any)?.lineIndex).toBe(1);

  // Inner line 2 (x = 150): hit zone extends ±8px (e.g. 145 and 155)
  expect(getHandle({target:domTable,clientX:150,clientY:50} as any)?.lineIndex).toBe(2);
  expect(getHandle({target:domTable,clientX:145,clientY:50} as any)?.lineIndex).toBe(2);
  expect(getHandle({target:domTable,clientX:155,clientY:50} as any)?.lineIndex).toBe(2);

  // Outer left line (x = 0): hit zone extends ±8px (e.g. -5 and +5)
  expect(getHandle({target:domTable,clientX:0,clientY:50} as any)?.lineIndex).toBe(3);
  expect(getHandle({target:domTable,clientX:-5,clientY:50} as any)?.lineIndex).toBe(3);
  expect(getHandle({target:domTable,clientX:5,clientY:50} as any)?.lineIndex).toBe(3);

  // Center of cell (x = 225): far from any border line -> null
  expect(getHandle({target:domTable,clientX:225,clientY:50} as any)).toBeNull();

  domTable.remove();
  e.destroy();
 });
});
