import { describe, expect, it } from "vitest";
import { preflightPdfSource } from "../app/tools/document-studio/utils/pdfSourcePreflight";
import { classifyPdfExportFailure, locatePdfFontProblem, inspectProtectedSource } from "../app/tools/document-studio/utils/pdfExportDiagnostics";
const doc = { type: "doc", content: [{ type:"paragraph", content: [{type:"text",text:"اَلْحَمْدُ",marks:[{type:"textStyle",attrs:{fontFamily:"Digital Khatt Indo-Pak"}}]}] }] };
describe("PDF diagnostics safe classification", () => {
 it("rejects deeply nested synthetic source without stack exhaustion", () => {
  let node: {type:string; content?: any[]} = {type:"paragraph"};
  for(let i=0;i<3000;i++) node={type:"blockquote",content:[node]};
  expect(() => preflightPdfSource({type:"doc",content:[node]} as any)).toThrow(/node limit/);
 });
 it("finds exact source path without replacing text", () => {
  const before=JSON.stringify(doc);
  expect(locatePdfFontProblem(doc,"Digital Khatt Indo-Pak","U+0644")).toMatchObject({path:[0,0],paragraphPath:[0],start:2,end:3});
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
 it("locates second identical protected run by ordinal, not substring", () => {
  const repeated = { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "اَلْحَمْدُ", marks:[{type:"textStyle",attrs:{fontFamily:"Digital Khatt Indo-Pak"}}] }] },
    { type: "paragraph", content: [{ type: "text", text: "اَلْحَمْدُ", marks:[{type:"textStyle",attrs:{fontFamily:"Digital Khatt Indo-Pak"}}] }] }
  ] };
  const hit = classifyPdfExportFailure("Unsupported protected Arabic/Quranic U+0644 at run 1:0; export blocked", repeated);
  expect(hit.problems[0].source?.path).toEqual([1,0]);
  expect(hit.problems[0].source?.start).toBe(2);
 });

 it("collects two separate unsupported protected marks in order", () => {
  const d={type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"ا\u06D7",marks:[{type:"textStyle",attrs:{fontFamily:"Digital Khatt Indo-Pak"}}]}]},{type:"paragraph",content:[{type:"text",text:"ب\u200D",marks:[{type:"textStyle",attrs:{fontFamily:"Digital Khatt Indo-Pak"}}]}]}]};
  const out=inspectProtectedSource(d);
  expect(out).toHaveLength(2);
  expect(out.map(x=>x.code)).toEqual(["UNSUPPORTED_GLYPH","INVALID_CONTROL"]);
  expect(out.map(x=>x.source?.path)).toEqual([[0,0],[1,0]]);
 });
});
