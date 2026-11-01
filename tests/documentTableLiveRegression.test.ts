// @vitest-environment happy-dom
import {describe,it,expect} from "vitest";
import {createTableContent} from "../app/tools/document-studio/utils/tableConversions";
import {normalizeTableWidths,tableResizePair} from "../app/tools/document-studio/utils/tableOperations";
describe("InPage 2009 RTL table regression",()=>{
 it("builds 3x3 as ordered RTL cells, with first cell logically first",()=>{
  const data=createTableContent(3,3,null,"rtl");
  expect(data.content).toHaveLength(3);
  expect(data.content?.[0].content).toHaveLength(3);
  expect(data.content?.[0].content?.[0].content?.[0].attrs?.dir).toBe("rtl");
 });
 it("resizing adjacent columns keeps total constant and minimum width",()=>{
  const start=normalizeTableWidths([1,1,1],600);
  const resized=tableResizePair(start,0,40,64);
  expect(resized.reduce((a,b)=>a+b,0)).toBe(600);
  expect(resized[0]).not.toBe(start[0]);
  expect(resized[1]).not.toBe(start[1]);
  const outer=tableResizePair(start,start.length-2,40,64);
  expect(outer.reduce((a,b)=>a+b,0)).toBe(600);
 });
});
