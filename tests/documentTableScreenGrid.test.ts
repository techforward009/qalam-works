import {describe,it,expect} from "vitest";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import {textContextItems} from "../app/tools/document-studio/utils/textContextMenu";
describe("InPage table screen-only grid and cell menu",()=>{
 it("keeps the default grid out of the exported PDF",()=>{
  const doc={type:"doc",content:[{type:"table",attrs:{dir:"rtl",tableFlow:"rtl"},content:[
   {type:"tableRow",content:[{type:"tableCell",attrs:{tableBorderStyle:"none"},content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"ایک"}]}]}]}]}]};
  const html=buildPdfHtml(doc as never,"rtl",{faces:[]}).html;
  expect(html).toMatch(/border:0 none transparent/);
  expect(html).not.toMatch(/border:1px solid #000000/);
 });
 it("orders the cell context actions and separators like InPage",()=>{
  const items=textContextItems(false,true);
  expect(items.map(i=>i.separator?"|":i.label)).toEqual([
   "Zoom","|","Import…","Select All","|","Cut","Copy","Clear","Paste","|",
   "Character…","Paragraph…","Table To Text…","|","Table Format…","Table Layout…",
  ]);
 });
});
