import {describe,it,expect} from "vitest";
import {createTableContent} from "../app/tools/document-studio/utils/tableConversions";
import {tableResizePair,normalizeTableWidths} from "../app/tools/document-studio/utils/tableOperations";
import {textContextItems} from "../app/tools/document-studio/utils/textContextMenu";
describe("InPage table behavior",()=>{
 it("RTL first cell retains RTL direction and document order",()=>{
  const t=createTableContent(2,2,null,"rtl");
  expect(t.content?.[0].content?.[0].content?.[0].attrs?.dir).toBe("rtl");
  expect(t.content?.[1].content?.[0].type).toBe("tableCell");
 });
 it("columns share width and a dragged divider transfers width to its neighbour",()=>{
  expect(normalizeTableWidths([1,1,1],600)).toEqual([200,200,200]);
  expect(tableResizePair([200,200,200],0,45)).toEqual([245,155,200]);
  expect(tableResizePair([200,200],0,-1000,64)).toEqual([64,336]);
  expect(tableResizePair([200,200],0,40,64)).toEqual([240,160]);
 });
 it("context menu shows table tools only when selection is contained",()=>{
  expect(textContextItems(false,true).map(x=>'label' in x?x.label:'—')).toContain("Table Layout…");
  expect(textContextItems(true,false).map(x=>'label' in x?x.label:'—')).toContain("Text To Table…");
  expect(textContextItems(false,true).map(x=>'label' in x?x.label:'—')).toContain("Table To Text…");
 });
});
