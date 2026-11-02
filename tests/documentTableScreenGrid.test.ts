import {describe,it,expect} from "vitest";
import {buildPdfHtml} from "../app/tools/document-studio/utils/buildPdfHtml";
import {textContextItems} from "../app/tools/document-studio/utils/textContextMenu";
describe("InPage table screen-only grid and cell menu",()=>{
 it("prints default 0.5pt black borders independently from the on-screen grid",()=>{
  const doc={type:"doc",content:[{type:"table",attrs:{dir:"rtl",tableFlow:"rtl"},content:[
   {type:"tableRow",content:[{type:"tableCell",attrs:{tableBorderStyle:"none"},content:[{type:"paragraph",attrs:{dir:"rtl"},content:[{type:"text",text:"ایک"}]}]}]}]}]};
  const html=buildPdfHtml(doc as never,"rtl",{faces:[]}).html;
  expect(html).toMatch(/stroke="#000000" stroke-width="0.6666666666666666px"/);
  expect(html).toMatch(/<td[^>]*border:0 none transparent[^>]*>.*<svg/s);
 });
 it("orders the cell context actions and separators like InPage",()=>{
  const items=textContextItems(false,true);
  expect(items.map(i=>i.separator?"|":i.label)).toEqual([
   "Zoom","|","Import…","Select All","|","Cut","Copy","Clear","Paste","|",
   "Character…","Paragraph…","Table To Text…","|","Table Format…","Table Layout…",
  ]);
 });
});
