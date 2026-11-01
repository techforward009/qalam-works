// @vitest-environment happy-dom
import {describe,it,expect} from "vitest";
import {Editor} from "@tiptap/core";
import {CellSelection} from "@tiptap/pm/tables";
import {createDocumentStudioExtensions} from "../app/tools/document-studio/utils/documentSchema";
import {QalamTableFormatAttributes} from "../app/tools/document-studio/utils/tableFormatAttributes";
import {QalamTableStableDirection} from "../app/tools/document-studio/utils/tableStableDirection";
import {createTableContent} from "../app/tools/document-studio/utils/tableConversions";
import {getTableFormat,applyTableFormat,type TableFormatValues} from "../app/tools/document-studio/utils/tableFormat";
function setup(){
 const editor=new Editor({extensions:[...createDocumentStudioExtensions(),QalamTableStableDirection,QalamTableFormatAttributes],content:{type:"doc",content:[createTableContent(3,3,null,"rtl")]}});
 editor.commands.setTextSelection(4);return editor;
}
describe("InPage Table Format",()=>{
 it("opens with RTL cell/table/column defaults",()=>{
  const editor=setup(),v=getTableFormat(editor);
  expect(v).toMatchObject({fill:null,borderColor:"#000000",borderStyle:"none",borderWidthPt:1,columnGapMm:1.41,indentMm:0,alignment:"right",flow:"rtl"});
  expect(v.columnWidthPx).toBeGreaterThan(50);editor.destroy();
 });
 it("applies one undoable change to current cell and whole table and Cancel needs no transaction",()=>{
  const editor=setup(),initial=editor.getJSON();
  const fields:TableFormatValues={...getTableFormat(editor),fill:"#ffe082",borderColor:"#990000",borderStyle:"solid",borderWidthPt:1,columnWidthPx:180,columnGapMm:2,indentMm:4,alignment:"center",flow:"rtl"};
  expect(applyTableFormat(editor,fields)).toBe(true);
  const after=editor.getJSON() as any,table=after.content[0];
  expect(table.attrs.tableAlignment).toBe("center");
  expect(table.attrs.tableIndentMm).toBe(4);
  expect(table.content[0].content[0].attrs.tableFill).toBe("#ffe082");
  expect(table.content[0].content[0].attrs.tableBorderStyle).toBe("solid");
  expect(table.content[0].content[1].attrs.tableFill).toBeNull();
  expect(editor.commands.undo()).toBe(true);
  expect(editor.getJSON()).toEqual(initial);
  editor.destroy();
 });
 it("formats selected cells but only current columns",()=>{
  const editor=setup();const cells:number[]=[];
  editor.state.doc.descendants((node,pos)=>{if(node.type.name==="tableCell")cells.push(pos);});
  editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc,cells[0],cells[1])));
  const fields:TableFormatValues={...getTableFormat(editor),fill:"#ffeeaa",borderStyle:"dashed",columnGapMm:3,columnWidthPx:140};
  expect(applyTableFormat(editor,fields)).toBe(true);
  const table=(editor.getJSON() as any).content[0];
  expect(table.content[0].content[0].attrs.tableFill).toBe("#ffeeaa");
  expect(table.content[0].content[1].attrs.tableFill).toBe("#ffeeaa");
  expect(table.content[0].content[2].attrs.tableFill).toBeNull();
  expect(table.content[1].content[0].attrs.colwidth).toEqual([140]);
  expect(table.content[1].content[1].attrs.colwidth).toEqual([140]);
  editor.destroy();
 });
});
