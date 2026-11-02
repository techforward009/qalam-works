// @vitest-environment happy-dom
import {describe,it,expect} from "vitest";
import {Editor} from "@tiptap/core";
import {createDocumentStudioExtensions} from "../app/tools/document-studio/utils/documentSchema";
import {QalamTableStableDirection} from "../app/tools/document-studio/utils/tableStableDirection";
import {QalamTableFormatAttributes} from "../app/tools/document-studio/utils/tableFormatAttributes";
import {convertSelectionToTable} from "../app/tools/document-studio/utils/tableConversions";
import {convertTableToParagraphs,applyTableToText,getTableToTextTarget} from "../app/tools/document-studio/utils/tableToText";

const words=["ایک","دو","تین","چار","پانچ","چھ"];
function makeEditor(empty=false){
 const rows=Array.from({length:2},(_,r)=>({type:"tableRow",content:Array.from({length:3},(_,c)=>({
  type:"tableCell",attrs:{colwidth:[137],tableFill:"#ffe082",tableBorderStyle:"solid",tableBorderColor:"#990000",tableBorderWidthPt:1},
  content:[{type:"paragraph",attrs:{dir:"rtl",directionMode:"manual"},...(!empty||r!==0||c!==1?{content:[{type:"text",text:words[r*3+c],marks:[{type:"bold"},{type:"textStyle",attrs:{fontFamily:"Alvi Nastaleeq",fontSize:"18pt"}}]}]}:{})}]
 }))}));
 const content={type:"doc",content:[
  {type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"ابتدا"}]},
  {type:"table",attrs:{dir:"rtl",tableAlignment:"right",tableIndentMm:10,tableFlow:"rtl"},content:rows},
  {type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"اختتام"}]},
 ]};
 const editor=new Editor({extensions:[...createDocumentStudioExtensions(),QalamTableStableDirection,QalamTableFormatAttributes],content});
 const table=getTableToTextTarget(editor,editor.state.doc.child(0).nodeSize+3);
 if(!table)throw Error("table missing");editor.commands.setTextSelection(table.pos+4);
 return {editor,table};
}
const texts=(nodes:any[])=>nodes.map(node=>node.content?.map((part:any)=>part.text??"").join("")??"");
describe("Table To Text InPage 2009",()=>{
 it("Tabs: logical RTL order, 2 paragraphs, marked spans, pre/post text untouched",()=>{
  const {editor,table}=makeEditor();
  const result=convertTableToParagraphs(table.node,"tabs",editor.schema);
  expect(texts(result.map(x=>x.toJSON()))).toEqual(["ایک\tدو\tتین","چار\tپانچ\tچھ"]);
  expect(result[0].firstChild?.marks.map(mark=>mark.type.name)).toContain("bold");
  expect(result[0].firstChild?.marks.find(mark=>mark.type.name==="textStyle")?.attrs.fontSize).toBe("18pt");
  expect(applyTableToText(editor,table.pos,"tabs")).toBe(true);
  expect(editor.state.doc.firstChild?.textContent).toBe("ابتدا");
  expect(editor.state.doc.lastChild?.textContent).toBe("اختتام");
  expect(editor.getJSON().content?.filter(n=>n.type==="paragraph")).toHaveLength(4);
  expect(editor.state.selection.from).toBe(table.pos+1);
  editor.destroy();
 });
 it("Paragraph: 6 individual cells and empty cells become empty paragraphs",()=>{
  const {editor,table}=makeEditor(true);
  const result=convertTableToParagraphs(table.node,"paragraph",editor.schema);
  expect(texts(result.map(x=>x.toJSON()))).toEqual(["ایک","","تین","چار","پانچ","چھ"]);
  expect(applyTableToText(editor,table.pos,"paragraph")).toBe(true);
  expect(editor.getJSON().content?.filter(n=>n.type==="paragraph")).toHaveLength(8);
  editor.destroy();
 });
 it("Tabs empty cell preserves empty slot; undo restores EXACT original including widths/format in one step",()=>{
  const {editor,table}=makeEditor(true),old=editor.getJSON();
  expect(applyTableToText(editor,table.pos,"tabs")).toBe(true);
  expect(texts(editor.getJSON().content!.slice(1,3))).toEqual(["ایک\t\tتین","چار\tپانچ\tچھ"]);
  expect(editor.commands.undo()).toBe(true);
  expect(editor.getJSON()).toEqual(old);
  editor.destroy();
 });
 it("Tabs result round-trips through existing Text To Table conversion with exact cell text",()=>{
  const {editor,table}=makeEditor();
  const output=convertTableToParagraphs(table.node,"tabs",editor.schema);
  const fragment=editor.schema.nodes.doc.create(null,output).content;
  const rebuilt=convertSelectionToTable(fragment,"tabs");
  expect(rebuilt.content?.length).toBe(2);
  expect(rebuilt.content?.map(row=>row.content?.map(cell=>cell.content?.[0].content?.map(n=>n.text).join("")??""))).toEqual([words.slice(0,3),words.slice(3)]);
  editor.destroy();
 });
});
