import { describe, expect, it } from "vitest";
import { classifyPdfExportFailure, locatePdfFontProblem } from "../app/tools/document-studio/utils/pdfExportDiagnostics";
const doc = { type: "doc", content: [{ type:"paragraph", content: [{type:"text",text:"اَلْحَمْدُ",marks:[{type:"textStyle",attrs:{fontFamily:"Digital Khatt Indo-Pak"}}]}] }] };
describe("PDF diagnostics safe classification", () => {
 it("finds exact source path without replacing text", () => {
  const before=JSON.stringify(doc);
  expect(locatePdfFontProblem(doc,"Digital Khatt Indo-Pak","U+0644")).toEqual({path:[0,0],paragraphPath:[0],start:2,end:3});
  expect(JSON.stringify(doc)).toBe(before);
 });
 it("reports missing Quranic mark and location", () => {
  const x=classifyPdfExportFailure("Unsupported protected Arabic/Quranic U+0644 at run 0:1; export blocked",doc);
  expect(x.code).toBe("UNSUPPORTED_GLYPH");
  expect(x.problems[0].source?.path).toEqual([0,0]);
 });
 it("separates unknown errors from font errors",()=>expect(classifyPdfExportFailure("ECONNRESET").code).toBe("EXPORT_FAILED"));
 it("does not misclassify timeout",()=>expect(classifyPdfExportFailure("Operation timed out").code).toBe("TIMEOUT"));
 it("reports painted fallback without permitting bypass",()=>expect(classifyPdfExportFailure("Unexpected glyph fallback at run 0:1; faces=DejaVu Sans; export blocked",doc).problems[0].actualFont).toBe("DejaVu Sans"));
});
