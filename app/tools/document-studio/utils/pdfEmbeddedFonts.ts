import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

/** Structural check of printed bytes; this does not certify visual shaping. */
export function verifyPdfUrduEmbedding(pdf: PDFDocument, runtimeFamilies: string[]): string[] {
  const fonts: Array<{ name: string; embedded: boolean; unicode: boolean }> = [];
  for (const page of pdf.getPages()) {
    const resources = page.node.Resources();
    const entries = resources?.lookup(PDFName.of("Font"));
    if (!(entries instanceof PDFDict)) continue;
    for (const [, ref] of entries.entries()) {
      const font = pdf.context.lookup(ref);
      if (!(font instanceof PDFDict)) continue;
      const name = font.get(PDFName.of("BaseFont"))?.toString().replace(/^\//, "") ?? "";
      const descendants = font.lookup(PDFName.of("DescendantFonts"));
      const descendant = descendants instanceof PDFArray ? descendants.lookup(0) : font;
      const descriptor = descendant instanceof PDFDict ? descendant.lookup(PDFName.of("FontDescriptor")) : undefined;
      const embedded = descriptor instanceof PDFDict && ["FontFile", "FontFile2", "FontFile3"].some(key => {
        const stream = descriptor.lookup(PDFName.of(key));
        return stream instanceof PDFRawStream && stream.getContentsSize() > 0;
      });
      fonts.push({ name, embedded, unicode: font.lookup(PDFName.of("ToUnicode")) instanceof PDFRawStream });
    }
  }
  const normalize = (name: string) => name.replace(/^[A-Z]{6}\+/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  for (const family of runtimeFamilies.filter(name => /Jameel|Noto Nastaliq|Noto Naskh|Amiri|Vazirmatn/i.test(name))) {
    const matches = fonts.filter(font => normalize(font.name).startsWith(normalize(family)));
    if (!matches.length || matches.some(font => !font.embedded || !font.unicode)) {
      throw new Error(`PDF Urdu font ${family} lacks an embedded font program or Unicode map in printed bytes; export blocked`);
    }
  }
  return [...new Set(fonts.filter(font => font.embedded).map(font => font.name))];
}
