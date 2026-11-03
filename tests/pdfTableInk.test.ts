import {describe,it,expect} from "vitest";
import {PDF_TABLE_SELECTOR,isPdfTableBlock} from "../app/tools/document-studio/utils/pdfInkPagination";
describe("PDF tables",()=>{
 it("selects complete table blocks and never nested cell paragraphs",()=>{
  expect(PDF_TABLE_SELECTOR).toContain("table");
  expect(isPdfTableBlock("TABLE")).toBe(true);
  expect(isPdfTableBlock("P")).toBe(false);
 });
});
