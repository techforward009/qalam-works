// @vitest-environment happy-dom
import {describe,it,expect} from "vitest";
import {Editor} from "@tiptap/core";
import {createDocumentStudioExtensions} from "../app/tools/document-studio/utils/documentSchema";
import {QalamTableStableDirection} from "../app/tools/document-studio/utils/tableStableDirection";
import {QalamTableFormatAttributes} from "../app/tools/document-studio/utils/tableFormatAttributes";
import {splitTableAbove} from "../app/tools/document-studio/utils/splitTableAbove";
import {DOCUMENT_MENU_BAR} from "../app/tools/document-studio/utils/documentMenus";
import {dispatchDocumentMenuAction,type DocumentMenuHandlers} from "../app/tools/document-studio/utils/documentMenuActions";
import {textContextItems} from "../app/tools/document-studio/utils/textContextMenu";

const words=["ایک","دو","تین","چار"];
function makeEditor(surround=false){
 const table={type:"table",attrs:{dir:"rtl",tableFlow:"rtl",tableAlignment:"right",tableIndentMm:9},
  content:[0,1].map(row=>({type:"tableRow",content:[0,1].map(col=>({type:"tableCell",
   attrs:{colwidth:[135],tableFill:"#ffe082",tableBorderColor:"#990000",tableBorderWidthPt:1,tableBorderStyle:"solid"},
   content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:words[row*2+col]}]}]}))}))};
 const content:any[]=[...(surround?[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"پہلے"}]}]:[]),table,
  ...(surround?[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"بعد"}]}]:[])];
 const editor=new Editor({extensions:[...createDocumentStudioExtensions(),QalamTableStableDirection,QalamTableFormatAttributes],content:{type:"doc",content}});
 let cellIndex=0,secondRow=-1;
 editor.state.doc.descendants((node,pos)=>{
  if(node.type.name==="tableCell"&&++cellIndex===3)secondRow=pos+2;
 });
 if(secondRow<0)throw Error("Missing cell");
 editor.commands.setTextSelection(secondRow);
 const tableIndex=surround?1:0;
 return {editor,tableIndex};
}
describe("Insert > Split Table (InPage 2009)",()=>{
 it("adds one normal RTL paragraph above a first-block Urdu table, preserves exact table format and undo caret",()=>{
  const {editor}=makeEditor(),before=editor.getJSON(),caret=editor.state.selection.from;
  expect(editor.state.doc.firstChild?.type.name).toBe("table");
  expect(splitTableAbove(editor)).toBe(true);
  const doc=editor.state.doc;
  expect(doc.childCount).toBe(2);
  expect(doc.child(0).type.name).toBe("paragraph");
  expect(doc.child(0).textContent).toBe("");
  expect(doc.child(0).attrs.dir).toBe("rtl");
  expect(doc.child(0).attrs.blockStyle).not.toBe("title");
  expect(doc.child(1).toJSON()).toEqual(before.content?.[0]);
  expect(editor.state.selection.from).toBe(1);
  expect(editor.commands.undo()).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  expect(editor.state.selection.from).toBe(caret);
  editor.destroy();
 });
 it("typing Urdu heading goes into new line, without replacing the table",()=>{
  const {editor}=makeEditor(),originalTable=editor.state.doc.firstChild!.toJSON();
  expect(splitTableAbove(editor)).toBe(true);
  editor.commands.insertContent("سرخی");
  expect(editor.state.doc.child(0).textContent).toBe("سرخی");
  expect(editor.state.doc.child(1).toJSON()).toEqual(originalTable);
  editor.destroy();
 });
 it("two invocations add two paragraphs between surrounding Urdu text and intact table",()=>{
  const {editor}=makeEditor(true);
  const before=editor.getJSON(),table=editor.state.doc.child(1).toJSON();
  expect(splitTableAbove(editor)).toBe(true);
  editor.commands.setTextSelection(1+editor.state.doc.child(0).nodeSize+2+4);
  // Explicitly target a cell in the same table for the repeated action.
  const tableStart=editor.state.doc.child(0).nodeSize+editor.state.doc.child(1).nodeSize;
  editor.commands.setTextSelection(tableStart+4);
  expect(splitTableAbove(editor)).toBe(true);
  expect(editor.state.doc.childCount).toBe(5);
  expect(editor.state.doc.child(0).textContent).toBe("پہلے");
  expect(editor.state.doc.child(1).textContent).toBe("");
  expect(editor.state.doc.child(2).textContent).toBe("");
  expect(editor.state.doc.child(3).toJSON()).toEqual(table);
  expect(editor.state.doc.child(4).textContent).toBe("بعد");
  expect(editor.commands.undo()).toBe(true);
  expect(editor.state.doc.childCount).toBe(4);
  expect(editor.commands.undo()).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  editor.destroy();
 });
 it("menu is Insert-only and its action opens no dialog",()=>{
  const insert=DOCUMENT_MENU_BAR.find(menu=>menu.id==="insert")!;
  expect(insert.items.find(n=>n.type==="action"&&n.id==="insert.splitTable")).toMatchObject({labelEn:"Split Table"});
  expect(textContextItems(false,true).some(n=>n.id==="splitTable")).toBe(false);
  let called=0;
  dispatchDocumentMenuAction("insert.splitTable",null,{splitTable:()=>called++} as unknown as DocumentMenuHandlers);
  expect(called).toBe(1);
 });
});
