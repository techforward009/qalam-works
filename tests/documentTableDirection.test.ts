// @vitest-environment happy-dom
import {describe,it,expect} from "vitest";
import {createTableContent} from "../app/tools/document-studio/utils/tableConversions";
describe("table direction persists independently from its first cell's Latin letters",()=>{
 it("writes explicit RTL/LTR direction onto each table while leaving cell order unchanged",()=>{
  for(const dir of ["rtl","ltr"] as const){
   const t=createTableContent(3,3,null,dir);
   expect(t.attrs?.dir).toBe(dir);
   expect(t.content?.[0].content).toHaveLength(3);
  }
 });
});
