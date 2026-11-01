import {describe,it,expect} from "vitest";
import {createTableContent} from "../app/tools/document-studio/utils/tableConversions";
import {resizeTableColumns,tableWidths} from "../app/tools/document-studio/utils/tableColumnResize";
import {textContextItems} from "../app/tools/document-studio/utils/textContextMenu";
describe("InPage table behavior",()=>{
 it("RTL first cell retains RTL direction and document order",()=>{
  const t=createTableContent(2,2,null,"rtl");
  expect(t.content?.[0].content?.[0].content?.[0].attrs?.dir).toBe("rtl");
  expect(t.content?.[1].content?.[0].type).toBe("tableCell");
 });
 it("columns share width and a dragged divider transfers width to its neighbour",()=>{
  expect(tableWidths([null,null,null],600)).toEqual([200,200,200]);
  expect(resizeTableColumns([200,200,200],0,45)).toEqual([245,155,200]);
  expect(resizeTableColumns([200,200],0,-1000,64)).toEqual([64,336]);
  expect(resizeTableColumns([200,200],-1,40,64,"rtl")).toEqual([160,240]);
 });
 it("context menu shows table tools only when selection is contained",()=>{
  expect(textContextItems(false,true,true).map(x=>'label' in x?x.label:'—')).toContain("Table Layout…");
  expect(textContextItems(true,true,false).map(x=>'label' in x?x.label:'—')).toContain("Text To Table…");
  expect(textContextItems(false,true,true).map(x=>'label' in x?x.label:'—')).toContain("Table To Text…");
 });
});
