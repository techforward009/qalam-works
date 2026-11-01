// @vitest-environment happy-dom
import {describe,it,expect} from "vitest";
import {Editor} from "@tiptap/core";
import {createDocumentStudioExtensions} from "../app/tools/document-studio/utils/documentSchema";
import {QalamTableStableDirection} from "../app/tools/document-studio/utils/tableStableDirection";
import {QalamTableFormatAttributes} from "../app/tools/document-studio/utils/tableFormatAttributes";
import {createTableContent} from "../app/tools/document-studio/utils/tableConversions";
import {applyTableFormat,getTableFormat} from "../app/tools/document-studio/utils/tableFormat";
import {mmToTablePx,tablePxToMm,formatTableLength} from "../app/tools/document-studio/utils/tableFormatUnits";
describe("Table Format precise mm roundtrip",()=>{
 it("30mm, 91.59mm and 15.25mm round-trip to the exact hundredth of a mm",()=>{
  for(const mm of [30,91.59,15.25]){
   const ed=new Editor({extensions:[...createDocumentStudioExtensions(),QalamTableStableDirection,QalamTableFormatAttributes],content:{type:"doc",content:[createTableContent(2,2,null,"rtl")]}});
   ed.commands.setTextSelection(4);
   expect(applyTableFormat(ed,{...getTableFormat(ed),columnWidthPx:mmToTablePx(mm)})).toBe(true);
   expect(formatTableLength(tablePxToMm(getTableFormat(ed).columnWidthPx),"mm")).toBe(`${mm}mm`);
   ed.destroy();
  }
 });
});
