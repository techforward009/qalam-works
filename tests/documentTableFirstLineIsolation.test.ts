// @vitest-environment happy-dom
import {describe,it,expect} from "vitest";
import {Editor} from "@tiptap/core";
import {createDocumentStudioExtensions} from "../app/tools/document-studio/utils/documentSchema";
import {createFirstLinePlugin} from "../app/tools/document-studio/extensions/FirstLineLayout";
import {createTableContent} from "../app/tools/document-studio/utils/tableConversions";
describe("first-line paragraph positioning never moves text inside table cells",()=>{
 it("tracks story text blocks, but excludes every nested table-cell paragraph",()=>{
  const table=createTableContent(3,3,null,"rtl");
  const e=new Editor({extensions:createDocumentStudioExtensions(),content:{type:"doc",content:[
   {type:"paragraph",content:[{type:"text",text:"باہر"}]},table,
   {type:"paragraph",content:[{type:"text",text:"بعد"}]}
  ]}});
  const plugin=createFirstLinePlugin();
  const blocks=plugin.spec.state!.init({} as never,e.state).blocks;
  const types=blocks.map(pos=>{
   const $pos=e.state.doc.resolve(pos);
   return [...Array($pos.depth)].map((_,d)=>$pos.node(d+1).type.name);
  });
  expect(types).toHaveLength(2);
  expect(types.every(nodes=>!nodes.includes("tableCell")&&!nodes.includes("tableHeader"))).toBe(true);
  e.destroy();
 });
});
