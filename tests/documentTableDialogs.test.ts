// @vitest-environment happy-dom
import React from "react";
import {afterEach,describe,it,expect,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {Editor} from "@tiptap/core";
import {createTableContent,parseTableColumnWidth,convertSelectionToTable} from "../app/tools/document-studio/utils/tableConversions";
import {createDocumentStudioExtensions} from "../app/tools/document-studio/utils/documentSchema";
import {QalamTableFormatAttributes} from "../app/tools/document-studio/utils/tableFormatAttributes";
import {QalamTableStableDirection} from "../app/tools/document-studio/utils/tableStableDirection";
import {StudioTableLayoutDialog} from "../app/tools/document-studio/components/StudioTableLayoutDialog";
import {StudioTableFormatDialog} from "../app/tools/document-studio/components/StudioTableFormatDialog";
import {Schema} from "@tiptap/pm/model";
const schema=new Schema({nodes:{
 doc:{content:"block+"},paragraph:{content:"inline*",group:"block",attrs:{dir:{default:null}}},text:{group:"inline"},
 table:{group:"block",content:"tableRow+"},tableRow:{content:"tableCell+"},tableCell:{content:"paragraph+",attrs:{colwidth:{default:null}}},
},marks:{bold:{},italic:{}}});
describe("classic table dialogs and conversions",()=>{
 it("inserts no header, default 1x2 with automatic equal widths",()=>{
 const table=createTableContent(1,2,null);
 expect(table.content).toHaveLength(1);
 expect(table.content![0].content).toHaveLength(2);
 expect(table.content![0].content![0].type).toBe("tableCell");
 expect(table.content![0].content![0].attrs?.colwidth).toBeUndefined();
 });
 it("converts an explicit measurement to table colwidth in px",()=>{
 expect(parseTableColumnWidth("2.54","cm")).toBeCloseTo(96,2);
 expect(parseTableColumnWidth("Auto","cm")).toBeNull();
 expect(createTableContent(3,2,100).content![2].content![1].attrs).toEqual({colwidth:[100]});
 expect(()=>parseTableColumnWidth("-2","cm")).toThrow();
 });
 it("splits each paragraph by tabs, pads short rows and preserves RTL and inline marks",()=>{
 const bold=schema.mark("bold");
 const p=schema.nodes.paragraph;
 const fragment=schema.nodes.doc.create(null,[
  p.create({dir:"rtl"},[schema.text("اردو", [bold]),schema.text("\tEnglish")]),
  p.create({dir:"rtl"},[schema.text("اگلی")]),
 ]);
 const result=convertSelectionToTable(fragment.content,"tabs");
 expect(result.content).toHaveLength(2);
 expect(result.content![0].content).toHaveLength(2);
 expect(result.content![1].content).toHaveLength(2);
 expect(result.content![0].content![0].content![0].attrs).toEqual({dir:"rtl"});
 expect(result.content![0].content![0].content![0].content![0].marks).toEqual([{type:"bold"}]);
 expect(result.content![1].content![1].content![0].content).toBeUndefined();
 });
 it("creates one column per paragraph in Paragraph mode without dropping formatting",()=>{
 const fragment=schema.nodes.doc.create(null,[schema.nodes.paragraph.create({dir:"rtl"},schema.text("الف",[schema.mark("italic")])),schema.nodes.paragraph.create(null,schema.text("ب"))]);
 const table=convertSelectionToTable(fragment.content,"paragraph");
 expect(table.content?.map(row=>row.content?.length)).toEqual([1,1]);
 expect(table.content?.[0].content?.[0].content?.[0].content?.[0].marks).toEqual([{type:"italic"}]);
 });
});

describe("InPage 2009 Windows 7 Table Layout & Table Format dialogs",()=>{
 let ed:Editor|null=null;
 afterEach(()=>{cleanup();ed?.destroy();ed=null;});
 function setupUrduEditor(){
  ed=new Editor({
   extensions:[...createDocumentStudioExtensions(),QalamTableStableDirection,QalamTableFormatAttributes],
   content:{type:"doc",content:[{type:"table",attrs:{dir:"rtl",tableFlow:"rtl"},content:[
    {type:"tableRow",content:[
     {type:"tableCell",content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"اردو متن"}]}]},
     {type:"tableCell",content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"پاکستان"}]}]},
    ]},
   ]}]},
  });
  ed.commands.setTextSelection(4);
  return ed;
 }
 it("renders Table Layout in InPage Win7 control order (Row/Column, Before/After, Cancel/Help/Insert/Delete, Merge Selection) and inserts Urdu row",()=>{
  const editor=setupUrduEditor(),onClose=vi.fn();
  render(React.createElement(StudioTableLayoutDialog,{editor,onClose}));
  const dlg=screen.getByRole("dialog",{name:"Table Layout"});
  expect(dlg.getAttribute("data-inpage-win7-dialog")).toBe("true");
  expect(within(dlg).getAllByRole("radio").map(r=>r.closest("label")?.textContent?.trim())).toEqual(["Row","Column","Before","After"]);
  const btns=within(dlg).getAllByRole("button").map(b=>b.textContent?.trim()||b.getAttribute("aria-label")||"");
  const [cIdx,hIdx,iIdx,dIdx,mIdx]=["Cancel","Help","Insert","Delete","Merge Selection"].map(n=>btns.indexOf(n));
  expect(cIdx).toBeGreaterThanOrEqual(0);
  expect(cIdx).toBeLessThan(hIdx);
  expect(hIdx).toBeLessThan(iIdx);
  expect(iIdx).toBeLessThan(dIdx);
  expect(dIdx).toBeLessThan(mIdx);
  fireEvent.click(within(dlg).getByRole("button",{name:"Insert"}));
  expect(onClose).toHaveBeenCalledOnce();
  expect((editor.getJSON() as any).content[0].content).toHaveLength(2);
  expect(JSON.stringify(editor.getJSON())).toContain("اردو متن");
 });
 it("renders compact ~1.5x smaller Table Format with left-aligned Win7 title bar and applies formatting",()=>{
  const editor=setupUrduEditor(),onClose=vi.fn();
  render(React.createElement(StudioTableFormatDialog,{editor,onClose}));
  const dlg=screen.getByRole("dialog",{name:"Table Format"});
  expect(dlg.getAttribute("data-inpage-win7-dialog")).toBe("true");
  expect(parseFloat(dlg.style.width)).toBeLessThanOrEqual(365);
  expect(parseFloat(dlg.style.height)).toBeLessThanOrEqual(198);
  expect(dlg.querySelector<HTMLElement>("[data-win7-title]")?.style.textAlign).toBe("left");
  fireEvent.change(within(dlg).getByLabelText("Table Alignment"),{target:{value:"center"}});
  fireEvent.click(within(dlg).getByRole("button",{name:"OK"}));
  expect(onClose).toHaveBeenCalledOnce();
  expect((editor.getJSON() as any).content[0].attrs.tableAlignment).toBe("center");
  expect(JSON.stringify(editor.getJSON())).toContain("پاکستان");
 });
});
