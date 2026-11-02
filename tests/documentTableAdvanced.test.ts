// @vitest-environment happy-dom
import {describe,it,expect} from "vitest";
import {Editor} from "@tiptap/core";
import {CellSelection} from "@tiptap/pm/tables";
import {serializeQpg,deserializeQpg} from "../app/tools/document-studio/utils/qpgFile";
import {defaultDocumentSettings} from "../app/tools/document-studio/utils/documentSettings";
import {createDocumentStudioExtensions} from "../app/tools/document-studio/utils/documentSchema";
import {tableContextMode,tableResizePair,normalizeTableWidths,tableLayoutCommand} from "../app/tools/document-studio/utils/tableOperations";
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
});
