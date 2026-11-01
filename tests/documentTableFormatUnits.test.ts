import {describe,it,expect} from "vitest";
import {formatTableLength,parseTableLength,tableFormatAlignedMargins} from "../app/tools/document-studio/utils/tableFormatUnits";

describe("InPage Table Format units and indent",()=>{
 it("presents and accepts mm, and 1pt border width",()=>{
  expect(formatTableLength(0,"mm")).toBe("0mm");
  expect(formatTableLength(1.41,"mm")).toBe("1.41mm");
  expect(formatTableLength(1,"pt")).toBe("1pt");
  expect(parseTableLength("30mm","mm",10,500)).toBe(30);
  expect(parseTableLength("1pt","pt",.25,8)).toBe(1);
  expect(()=>parseTableLength("9mm","mm",10,500)).toThrow();
 });
 it("keeps 15mm columns without clamping to the unrelated 64px drag minimum",()=>{
  const px=parseTableLength("15mm","mm",10,500)*(96/25.4);
  expect(px).toBeGreaterThan(55);
  expect(px).toBeLessThan(60);
 });
 it("indents from the aligned right/left edge",()=>{
  expect(tableFormatAlignedMargins("right",10)).toMatchObject({marginRight:"10mm",marginLeft:"auto"});
  expect(tableFormatAlignedMargins("left",10)).toMatchObject({marginLeft:"10mm",marginRight:"auto"});
  expect(tableFormatAlignedMargins("right",0)).toMatchObject({marginRight:"0mm"});
 });
});
