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
});
