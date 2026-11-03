import { describe, it, expect } from "vitest";
import { POST } from "../app/api/export-pdf/route";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { PdfExportTestRequest } from "./helpers/pdfExportRequest";
import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";

describe("PDF export after inner drag and 0.5pt line thickness", () => {
 it("exports without horizontal boundary error after dragging inner line between columns 1 and 2", async () => {
   const words = ["ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو"];
   const cell = (text: string, colwidth: number) => ({
     type: "tableCell",
     attrs: { colwidth: [colwidth] },
     content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text }] }]
   });
   // A4 page content width is 697.7px (184.6mm).
   // Initial columns: 232.56, 232.56, 232.56.
   // Dragging inner line between cols 1 and 2 left by 40px:
   // cols become [233, 193, 273] = 699px (or [232, 192, 274]).
   const col0 = 233, col1 = 193, col2 = 273;
   const doc = {
     type: "doc",
     content: [{
       type: "table",
       attrs: { dir: "rtl", tableFlow: "rtl", tableFormatWidthPx: 699 },
       content: [
         { type: "tableRow", content: [cell("ایک", col0), cell("دو", col1), cell("تین", col2)] },
         { type: "tableRow", content: [cell("چار", col0), cell("پانچ", col1), cell("چھ", col2)] },
         { type: "tableRow", content: [cell("سات", col0), cell("آٹھ", col1), cell("نو", col2)] }
       ]
     }]
   };
   const settings = defaultDocumentSettings();
   const response = await POST(new PdfExportTestRequest("http://localhost/api/export-pdf", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ doc, dir: "rtl", settings })
   }));
   expect(response.status).toBe(200);
   const bytes = new Uint8Array(await response.arrayBuffer());
   const pdf = await PDFDocument.load(bytes);
   expect(pdf.getPageCount()).toBe(1);
   const stream = pdf.context.lookup(pdf.getPages()[0].node.Contents()) as { contents?: Uint8Array; getContents?: () => Uint8Array };
   const ops = inflateSync(stream.contents ?? stream.getContents!()).toString("latin1");
   // Verify that PDF edge rects have dimensions corresponding to 0.5pt (0.666667 user units scaled by 0.75 in PDF)
   const rectMatches = [...ops.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re/g)];
   const edgeDims = rectMatches.map(m => Math.min(Number(m[3]), Number(m[4]))).filter(d => d > 0.5 && d < 1);
   expect(edgeDims.length).toBeGreaterThanOrEqual(18);
   for (const dim of edgeDims) {
     expect(dim).toBeCloseTo(0.666667, 2); // 0.666667 px * 0.75 pt/px = 0.5pt
   }
 });
});
