import {describe,it,expect} from "vitest";
import {createTableContent,parseTableColumnWidth,convertSelectionToTable} from "../app/tools/document-studio/utils/tableConversions";
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
