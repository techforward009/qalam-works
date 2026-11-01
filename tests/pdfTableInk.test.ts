import {describe,it,expect} from "vitest";
import {PDF_TABLE_SELECTOR, PDF_TABLE_BORDER_CSS, isPdfTableBlock} from "../app/tools/document-studio/utils/pdfInkPagination";
describe("PDF tables",()=>{
 it("selects complete table blocks, never nested cell paragraphs, and preserves their borders",()=>{
 expect(PDF_TABLE_SELECTOR).toContain("table");
 expect(isPdfTableBlock("TABLE")).toBe(true);
 expect(isPdfTableBlock("P")).toBe(false);
 expect(PDF_TABLE_BORDER_CSS).toMatch(/\d+px solid/);
 expect(PDF_TABLE_BORDER_CSS).toContain("solid");
 });
});
