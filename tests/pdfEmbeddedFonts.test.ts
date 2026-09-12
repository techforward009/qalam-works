import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { verifyPdfUrduEmbedding } from "../app/tools/document-studio/utils/pdfEmbeddedFonts";

describe("printed PDF font verification", () => {
  it("rejects a Latin-only final PDF even if the browser claimed Noto was ready", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText("English only", { font });
    const printed = await PDFDocument.load(await pdf.save());
    expect(() => verifyPdfUrduEmbedding(printed, ["Noto Nastaliq Urdu"])).toThrow("export blocked");
    expect(() => verifyPdfUrduEmbedding(printed, [])).not.toThrow();
  });

  it.each(["FontFile2", "ToUnicode"])("rejects a named Nastaliq font missing %s", async missing => {
    const pdf = await PDFDocument.create();
    const descriptor = pdf.context.obj({ Type: "FontDescriptor", ...(missing === "FontFile2" ? {} : { FontFile2: pdf.context.register(pdf.context.stream("font-program")) }) });
    const font = pdf.context.obj({ Type: "Font", Subtype: "Type0", BaseFont: "AAAAAA+NotoNastaliqUrdu-Regular", DescendantFonts: [pdf.context.obj({ FontDescriptor: descriptor })], ...(missing === "ToUnicode" ? {} : { ToUnicode: pdf.context.register(pdf.context.stream("unicode-map")) }) });
    pdf.addPage().node.set(pdf.context.obj("Resources"), pdf.context.obj({ Font: { F1: pdf.context.register(font) } }));
    const printed = await PDFDocument.load(await pdf.save());
    expect(() => verifyPdfUrduEmbedding(printed, ["Noto Nastaliq Urdu"])).toThrow("export blocked");
  });
});
